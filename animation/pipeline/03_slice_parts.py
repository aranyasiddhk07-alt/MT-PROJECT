"""A small slicer for the real part geometry, used for the slicing and printing scenes.

Each STL from 01_convert_cad.py is placed in the build orientation suggested by the
project report (section 5.1), cut into horizontal layers, and turned into toolpaths:
outer wall, inner walls, solid skin (found by comparing with the layers above and
below), sparse rectilinear infill, and a brim for the propeller. Layer heights,
wall counts and infill densities are the report's *assumed* starting values
(section 5.2). This is a visualisation of the slicing principle, not the slicer
output the team used.

Output: animation/web/assets/toolpaths/<id>.bin  and  animation/web/assets/plates.json
Binary layout (little endian): u32 nLayers; per layer: f32 z, u32 nPaths;
per path: u8 type, u8 closed, u16 pad, u32 nPts, f32 xy[nPts*2].
Types: 0 outer wall, 1 inner wall, 2 sparse infill, 3 solid skin, 4 brim, 5 support.
Coordinates are millimetres on the build plate (origin = plate centre, z up).
"""
import json
import math
import struct
from pathlib import Path

import numpy as np
import shapely
import trimesh
from shapely.geometry import LineString, MultiLineString, MultiPolygon, Polygon
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "animation" / "web" / "assets"
LINE_W = 0.45     # extrusion width, mm (typical for a 0.4 mm nozzle)
SKIN_T = 0.8      # solid top/bottom thickness, mm
OVERHANG = 45.0   # degrees from vertical that a layer may step out without support
SUPPORT_GAP = 0.6 # horizontal gap between support and part, mm

# Report section 5.2 (assumed starting values): shells / gears and shafts / propeller.
PROFILES = {
    "shell": dict(layer=0.20, walls=3, infill=0.20),
    "gear": dict(layer=0.16, walls=4, infill=0.50),
    "prop": dict(layer=0.12, walls=3, infill=0.30),
}

# Build orientation: function mapping CAD (x, y, z) -> print (px, py, pz), before placement.
# Report section 5.1: shells flat, open side up; gears flat; pinion/shaft upright;
# crank flat; propeller flat, hub down (with a brim); pins upright.
def orient(id_):
    return {
        "shell_side1": lambda v: np.c_[v[:, 2], v[:, 1], 24.0 - v[:, 0]],    # outer face (X=24) on the bed
        "shell_side2": lambda v: np.c_[-v[:, 2], v[:, 1], v[:, 0] + 10.0],   # outer face (X=-10) on the bed
        "gear_input": lambda v: np.c_[-v[:, 2], v[:, 1], v[:, 0]],
        "compound_gear": lambda v: np.c_[v[:, 2], v[:, 1], 13.0 - v[:, 0]],  # 54T face down, pinion on top
        "pinion_output": lambda v: np.c_[v[:, 2], v[:, 1], 16.0 - v[:, 0]],  # pinion down, hub up
        "crank_shaft": lambda v: np.c_[-v[:, 2], v[:, 1], v[:, 0] + 2.0],     # collar down
        "prop_shaft": lambda v: np.c_[-v[:, 2], v[:, 1], v[:, 0] + 22.0],
        "pin_idler_a": lambda v: np.c_[-v[:, 2], v[:, 1], v[:, 0] + 2.0],
        "pin_idler_b": lambda v: np.c_[-v[:, 2], v[:, 1], v[:, 0] - 13.0],
        "pin_prop": lambda v: np.c_[-v[:, 2], v[:, 1], v[:, 0] - 16.0],
        "crank_handle": lambda v: np.c_[v[:, 0], -v[:, 2], v[:, 1] + 32.0],    # lying flat on its side
        "propeller": lambda v: np.c_[-v[:, 2], v[:, 1], v[:, 0] + 22.0],      # hub face down
    }[id_]


# Plate layout (centre of each part's footprint, mm from plate centre) and profile.
PLATES = {
    "housing": {
        "shell_side1": ((-40, 0), "shell"),
        "shell_side2": ((40, 0), "shell"),
        "crank_handle": ((92, -80), "gear"),
    },
    "mechanism": {
        "gear_input": ((-62, 55), "gear"),
        "compound_gear": ((0, 55), "gear"),
        "pinion_output": ((48, 72), "gear"),
        "crank_shaft": ((72, 72), "gear"),
        "prop_shaft": ((92, 72), "gear"),
        "pin_idler_a": ((52, 42), "gear"),
        "pin_idler_b": ((70, 42), "gear"),
        "pin_prop": ((88, 42), "gear"),
        "propeller": ((-40, -50), "prop"),
    },
}


def to_polys(path2d):
    if path2d is None:
        return MultiPolygon()
    polys = [p for p in path2d.polygons_full if p is not None and p.area > 1e-3]
    return unary_union([shapely.make_valid(p) for p in polys]) if polys else MultiPolygon()


def loops(geom):
    out = []
    for p in getattr(geom, "geoms", [geom]):
        if isinstance(p, Polygon) and not p.is_empty:
            out.append(np.asarray(p.exterior.coords))
            out += [np.asarray(r.coords) for r in p.interiors]
    return out


def hatch(region, spacing, angle):
    """Zig-zag ordered parallel lines at `angle` clipped to `region`."""
    if region.is_empty:
        return []
    c, s = math.cos(angle), math.sin(angle)
    minx, miny, maxx, maxy = region.bounds
    r = math.hypot(maxx - minx, maxy - miny) / 2 + 1
    cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
    segs, flip = [], False
    for k in np.arange(-r, r, spacing):
        a = (cx + c * -r - s * k, cy + s * -r + c * k)
        b = (cx + c * r - s * k, cy + s * r + c * k)
        inter = region.intersection(LineString([a, b]))
        parts = [g for g in getattr(inter, "geoms", [inter]) if isinstance(g, LineString) and g.length > 0.3]
        parts.sort(key=lambda g: g.coords[0][0] * c + g.coords[0][1] * s)
        if flip:
            parts = [LineString(list(g.coords)[::-1]) for g in parts[::-1]]
        segs += [np.asarray(g.coords) for g in parts]
        flip = not flip
    return segs


def slice_part(mesh, prof, brim=False):
    zmax = mesh.bounds[1][2]
    h = prof["layer"]
    zs = np.arange(h / 2, zmax, h)  # sample mid-layer, print at the layer top
    sections = mesh.section_multiplane(plane_origin=[0, 0, 0], plane_normal=[0, 0, 1], heights=list(zs))
    regions = [to_polys(s) for s in sections]
    n = len(regions)
    k = max(1, int(round(SKIN_T / h)))
    support = support_regions(regions, h)
    layers = []
    for i, reg in enumerate(regions):
        paths = []
        if reg.is_empty:
            layers.append((float(zs[i] + h / 2), paths))
            continue
        if brim and i == 0:
            for j in range(6, 0, -1):
                paths += [(4, 1, lp) for lp in loops(reg.buffer(LINE_W * (j + 0.5), join_style=2))]
        for w in range(prof["walls"]):
            ring = reg.buffer(-(w + 0.5) * LINE_W, join_style=2).simplify(0.02)
            paths += [(0 if w == 0 else 1, 1, lp) for lp in loops(ring)]
        inner = reg.buffer(-(prof["walls"] - 0.15) * LINE_W, join_style=2)
        if not inner.is_empty:
            below = regions[i - k] if i - k >= 0 else MultiPolygon()
            above = regions[i + k] if i + k < n else MultiPolygon()
            covered = below.intersection(above)
            solid = inner.difference(covered.buffer(-LINE_W)).buffer(-0.05).buffer(0.05)
            sparse = inner.difference(solid)
            ang = math.pi / 4 if i % 2 == 0 else -math.pi / 4
            paths += [(3, 0, s) for s in hatch(solid, LINE_W, ang)]
            paths += [(2, 0, s) for s in hatch(sparse, LINE_W / prof["infill"], ang)]
        layers.append((float(zs[i] + h / 2), paths))
    for i, sup in enumerate(support):
        if not sup.is_empty:
            layers[i][1].extend((5, 0, s) for s in hatch(sup, 2.0, 0.0))
    return layers


def support_regions(regions, h):
    """Areas that overhang the layer below by more than the 45-degree rule, projected down
    to the bed (or to the part) and kept SUPPORT_GAP away from the part."""
    step = h * math.tan(math.radians(OVERHANG))
    n = len(regions)
    sup = [MultiPolygon()] * n
    carry = MultiPolygon()
    for i in range(n - 1, 0, -1):
        over = regions[i].difference(regions[i - 1].buffer(step))
        over = over.buffer(-0.3).buffer(0.3)  # ignore slivers narrower than ~0.6 mm
        carry = unary_union([carry, over]).difference(regions[i - 1].buffer(SUPPORT_GAP))
        carry = carry.buffer(-0.2).buffer(0.2)
        sup[i - 1] = carry
    return sup


def write_toolpaths(path, layers):
    with open(path, "wb") as fh:
        fh.write(struct.pack("<I", len(layers)))
        for z, paths in layers:
            fh.write(struct.pack("<fI", z, len(paths)))
            for t, closed, pts in paths:
                pts = np.asarray(pts, np.float32)[:, :2]
                fh.write(struct.pack("<BBHI", t, closed, 0, len(pts)))
                fh.write(pts.astype("<f4").tobytes())


def main():
    out = ASSETS / "toolpaths"
    out.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for plate, parts in PLATES.items():
        manifest[plate] = []
        for pid, ((ox, oy), prof_name) in parts.items():
            mesh = trimesh.load(ASSETS / "stl" / f"{pid}.stl")
            v = orient(pid)(mesh.vertices)
            v[:, 2] -= v[:, 2].min()
            ctr = (v[:, :2].min(0) + v[:, :2].max(0)) / 2
            v[:, 0] += ox - ctr[0]
            v[:, 1] += oy - ctr[1]
            m = trimesh.Trimesh(v, mesh.faces, process=False)
            prof = PROFILES[prof_name]
            layers = slice_part(m, prof, brim=(pid == "propeller"))
            write_toolpaths(out / f"{pid}.bin", layers)
            # The CAD-to-print transform for the renderer: print = R * cad + t (affine, solved from vertices).
            A = np.c_[mesh.vertices, np.ones(len(mesh.vertices))]
            T, *_ = np.linalg.lstsq(A, v, rcond=None)
            assert np.linalg.det(T[:3, :3]) > 0.99, f'{pid}: orientation must be a rotation, not a reflection'
            npath = sum(len(p) for _, p in layers)
            length = sum(float(np.sum(np.linalg.norm(np.diff(np.asarray(pts)[:, :2], axis=0), axis=1)))
                         for _, p in layers for _, _, pts in p)
            manifest[plate].append(dict(id=pid, profile=prof_name, **prof, layers=len(layers),
                                        height=round(float(v[:, 2].max()), 3), paths=npath,
                                        extrusion_mm=round(length, 1), cad_to_print=np.round(T.T, 6).tolist()))
            print(f"{plate:9s} {pid:15s} layers {len(layers):3d}  paths {npath:5d}  path length {length / 1000:6.2f} m", flush=True)
    (ASSETS / "plates.json").write_text(json.dumps(manifest, indent=1))


if __name__ == "__main__":
    main()
