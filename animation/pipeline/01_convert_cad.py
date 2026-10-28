"""Convert the supplied IGES assembly (cad/fan_A.1.igs) into per-part render meshes.

The IGES file holds six top-level subfigure instances exported from 3DEXPERIENCE
(casing side 1, compound gear assembly, casing side 2, propeller, shaft, handle).
Every instance is a set of trimmed NURBS surfaces; sewing them gives closed,
watertight shells. The compound gear assembly sews into seven bodies, which are
identified here by their axis position and measured geometry.

Outputs (paths relative to the repository root):
  animation/web/assets/parts/<id>.bin   render mesh: positions, normals, indices, feature edges
  animation/web/assets/parts.json       part manifest (names, bounds, axes, colours)
  animation/web/assets/stl/<id>.stl     per-part binary STL in millimetres
  animation/web/assets/fan_assembly.glb whole assembly for other tools (Blender etc.)

Units are millimetres throughout. The CAD X axis is the shell stacking axis.
"""
import json
import struct
import sys
from pathlib import Path

import numpy as np
import trimesh
from OCP.BRep import BRep_Tool
from OCP.BRepAdaptor import BRepAdaptor_Curve
from OCP.BRepBuilderAPI import BRepBuilderAPI_MakeSolid, BRepBuilderAPI_Sewing
from OCP.BRepGProp import BRepGProp
from OCP.BRepTools import BRepTools
from OCP.BRepLib import BRepLib_ToolTriangulatedShape
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.GCPnts import GCPnts_QuasiUniformDeflection
from OCP.GProp import GProp_GProps
from OCP.IGESControl import IGESControl_Reader
from OCP.ShapeFix import ShapeFix_Shell, ShapeFix_Solid
from OCP.TopAbs import TopAbs_EDGE, TopAbs_FACE, TopAbs_REVERSED, TopAbs_SHELL
from OCP.TopExp import TopExp_Explorer
from OCP.TopLoc import TopLoc_Location
from OCP.TopoDS import TopoDS

ROOT = Path(__file__).resolve().parents[2]
IGES = ROOT / "cad" / "fan_A.1.igs"
OUT = ROOT / "animation" / "web" / "assets"

# IGES root order (subfigure instances 408) as listed in the file's directory section.
COARSE = {"compound_gear"}
ROOT_NAMES = ["casing side 1", "compound gear assembly", "casing side 2", "propeller", "shaft", "handle"]

# Identification of every sewn body. Keys: (root index, shell index after sewing).
# Axis = (Y, Z) of the rotation axis in CAD coordinates; all axes are parallel to X.
PARTS = {
    (0, 0): dict(id="shell_side1", name="Shell half (side 1, far side)", axis=None, group="housing"),
    (2, 0): dict(id="shell_side2", name="Shell half (side 2, crank side)", axis=None, group="housing"),
    (1, 0): dict(id="gear_input", name="Large spur gear 54T (crank axis)", axis=(-27, 0), group="crank"),
    (1, 3): dict(id="crank_shaft", name="Crank shaft", axis=(-27, 0), group="crank"),
    (1, 1): dict(id="compound_gear", name="Compound gear 12T + 54T", axis=(6, 0), group="idler"),
    (1, 4): dict(id="pin_idler_a", name="Axle pin (idler, side 2)", axis=(6, 0), group="pins"),
    (1, 2): dict(id="pin_idler_b", name="Axle pin (idler, side 1)", axis=(6, 0), group="pins"),
    (1, 5): dict(id="pin_prop", name="Axle pin (propeller axis)", axis=(39, 0), group="pins"),
    (1, 6): dict(id="pinion_output", name="Pinion 12T with hub", axis=(39, 0), group="output"),
    (4, 0): dict(id="prop_shaft", name="Propeller shaft", axis=(39, 0), group="output"),
    (3, 0): dict(id="propeller", name="Propeller", axis=(39, 0), group="output"),
    (5, 0): dict(id="crank_handle", name="Crank handle", axis=(-27, 0), group="crank"),
}


def explore(shape, kind):
    e = TopExp_Explorer(shape, kind)
    while e.More():
        yield e.Current()
        e.Next()


def oriented_solid(shell):
    fix = ShapeFix_Shell(TopoDS.Shell(shell))
    fix.Perform()
    solid = BRepBuilderAPI_MakeSolid(fix.Shell()).Solid()
    sf = ShapeFix_Solid(solid)
    sf.Perform()
    solid = sf.Solid()
    g = GProp_GProps()
    BRepGProp.VolumeProperties_s(solid, g)
    if g.Mass() < 0:
        solid = solid.Reversed()
        BRepGProp.VolumeProperties_s(solid, g := GProp_GProps())
    return solid, g.Mass()


def tessellate(solid, lin_defl, ang_defl):
    BRepMesh_IncrementalMesh(solid, lin_defl, False, ang_defl, True)
    pos, nrm, idx, fid, base = [], [], [], [], 0
    for k, f in enumerate(explore(solid, TopAbs_FACE)):
        face = TopoDS.Face(f)
        loc = TopLoc_Location()
        tri = BRep_Tool.Triangulation_s(face, loc)
        if tri is None:
            continue
        BRepLib_ToolTriangulatedShape.ComputeNormals_s(face, tri)
        trsf = loc.Transformation()
        rev = face.Orientation() == TopAbs_REVERSED
        n = tri.NbNodes()
        for i in range(1, n + 1):
            p = tri.Node(i).Transformed(trsf)
            pos.append((p.X(), p.Y(), p.Z()))
            v = tri.Normal(i)
            v = (v.X(), v.Y(), v.Z())
            nrm.append(tuple(-c for c in v) if rev else v)
        for i in range(1, tri.NbTriangles() + 1):
            a, b, c = tri.Triangle(i).Get()
            idx.append((base + a - 1, base + c - 1, base + b - 1) if rev else (base + a - 1, base + b - 1, base + c - 1))
            fid.append(k)
        base += n
    pos, nrm = np.array(pos, np.float64), np.array(nrm, np.float64)
    tris, fid = np.array(idx, np.int64), np.array(fid)
    return orient_outward(pos, nrm, tris, fid)


def orient_outward(pos, nrm, tris, fid):
    """Make every B-rep face wind outward and its normals agree with its winding.

    IGES face orientation flags are not reliable for this file, so the merged
    (watertight) mesh is used to find a consistent outward winding, and each
    B-rep face is flipped as a whole where it disagrees."""
    m = trimesh.Trimesh(pos, tris, process=False)
    m.merge_vertices()
    before = m.faces.copy()
    trimesh.repair.fix_winding(m)
    trimesh.repair.fix_inversion(m)
    flipped = ~np.all(before == m.faces, axis=1)
    tris = tris.copy()
    for k in np.unique(fid):
        sel = fid == k
        if flipped[sel].mean() > 0.5:
            tris[sel] = tris[sel][:, ::-1]
    # Normals: agree with the (now outward) triangle normals of the same face.
    tn = np.cross(pos[tris[:, 1]] - pos[tris[:, 0]], pos[tris[:, 2]] - pos[tris[:, 0]])
    for k in np.unique(fid):
        sel = fid == k
        verts = np.unique(tris[sel])
        vn = nrm[tris[sel]].mean(axis=1)
        if np.sum(np.einsum('ij,ij->i', vn, tn[sel])) < 0:
            nrm[verts] *= -1
    return pos.astype(np.float32), nrm.astype(np.float32), tris.reshape(-1).astype(np.uint32)


def feature_edges(solid, defl):
    """Polyline segments for B-rep edges, skipping seams of periodic surfaces.

    Each edge is visited once per adjacent face; duplicates are removed by a
    geometric key (rounded end and mid points)."""
    seen, segs = set(), []
    for f in explore(solid, TopAbs_FACE):
        face = TopoDS.Face(f)
        for e in explore(face, TopAbs_EDGE):
            edge = TopoDS.Edge(e)
            if BRep_Tool.Degenerated_s(edge) or BRep_Tool.IsClosed_s(edge, face):
                continue
            curve = BRepAdaptor_Curve(edge)
            d = GCPnts_QuasiUniformDeflection(curve, defl)
            if not d.IsDone() or d.NbPoints() < 2:
                continue
            pts = [curve.Value(d.Parameter(k)) for k in range(1, d.NbPoints() + 1)]
            ends = sorted([(round(pts[0].X(), 2), round(pts[0].Y(), 2), round(pts[0].Z(), 2)),
                           (round(pts[-1].X(), 2), round(pts[-1].Y(), 2), round(pts[-1].Z(), 2))])
            m = curve.Value((curve.FirstParameter() + curve.LastParameter()) / 2)
            key = (*ends, round(m.X(), 2), round(m.Y(), 2), round(m.Z(), 2))
            if key in seen:
                continue
            seen.add(key)
            for p, q in zip(pts[:-1], pts[1:]):
                segs.append((p.X(), p.Y(), p.Z(), q.X(), q.Y(), q.Z()))
    return np.array(segs, np.float32).reshape(-1, 3)


def write_bin(path, pos, nrm, idx, edges):
    with open(path, "wb") as fh:
        fh.write(struct.pack("<4I", len(pos), len(idx), len(edges), 0))
        fh.write(pos.astype("<f4").tobytes())
        fh.write(nrm.astype("<f4").tobytes())
        fh.write(idx.astype("<u4").tobytes())
        fh.write(edges.astype("<f4").tobytes())


def main():
    (OUT / "parts").mkdir(parents=True, exist_ok=True)
    (OUT / "stl").mkdir(parents=True, exist_ok=True)
    reader = IGESControl_Reader()
    reader.ReadFile(str(IGES))
    assert reader.NbRootsForTransfer() == len(ROOT_NAMES)
    manifest, scene = [], trimesh.Scene()
    for r in range(len(ROOT_NAMES)):
        reader.TransferOneRoot(r + 1)
        shape = reader.Shape(reader.NbShapes())
        sew = BRepBuilderAPI_Sewing(0.02)
        sew.Add(shape)
        sew.Perform()
        shells = list(explore(sew.SewedShape(), TopAbs_SHELL))
        for s, shell in enumerate(shells):
            info = PARTS[(r, s)]
            solid, vol = oriented_solid(shell)
            fine = info["group"] != "housing"
            pos, nrm, idx = tessellate(solid, 0.01 if fine else 0.03, 0.12 if fine else 0.2)
            edges = feature_edges(solid, 0.02)
            write_bin(OUT / "parts" / f"{info['id']}.bin", pos, nrm, idx, edges)
            if info["id"] in COARSE:
                # Deliberately coarse tessellation, used only to make STL facets visible on screen.
                BRepTools.Clean_s(solid)
                cp, cn, ci = tessellate(solid, 0.35, 0.7)
                write_bin(OUT / "parts" / f"{info['id']}_coarse.bin", cp, cn, ci, np.zeros((0, 3), np.float32))
                print(f"  coarse {info['id']}: {len(ci) // 3} triangles")
                BRepTools.Clean_s(solid)
                tessellate(solid, 0.01 if fine else 0.03, 0.12 if fine else 0.2)
            mesh = trimesh.Trimesh(pos, idx.reshape(-1, 3), process=True)
            mesh.export(OUT / "stl" / f"{info['id']}.stl")
            scene.add_geometry(mesh, node_name=info["id"])
            lo, hi = pos.min(0), pos.max(0)
            manifest.append(dict(info, cad_root=ROOT_NAMES[r], volume_mm3=round(vol, 1),
                                 bbox_min=[round(float(v), 3) for v in lo], bbox_max=[round(float(v), 3) for v in hi],
                                 triangles=int(len(idx) // 3), edge_segments=int(len(edges) // 2),
                                 watertight=bool(mesh.is_watertight)))
            print(f"{info['id']:15s} tris {len(idx)//3:7d} edges {len(edges)//2:6d} vol {vol:9.1f} mm3 "
                  f"watertight {mesh.is_watertight} bbox {np.round(lo,2)} {np.round(hi,2)}", flush=True)
    scene.export(OUT / "fan_assembly.glb")
    (OUT / "parts.json").write_text(json.dumps(manifest, indent=1))


if __name__ == "__main__":
    sys.exit(main())
