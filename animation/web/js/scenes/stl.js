// STAGE 2 · STL EXPORT (42-60 s)
// 42.0-48.8  one STL per part: the 12 IGES bodies laid out as separate files (real triangle counts)
// 48.8-53.4  CAD surface -> triangle mesh on the compound gear (coarse tessellation shown for clarity)
// 53.4-60.0  mesh checks (run on this export) and orientation for printing
import * as THREE from 'three';
import { keys, ramp, smooth, window_, easeInOut, clamp, smoother } from '../util.js';
import { orbit } from './common.js';
import { loadPart } from '../assets.js';

const ROW1 = ['shell_side2', 'shell_side1', 'propeller', 'gear_input', 'compound_gear'];
const ROW2 = ['crank_handle', 'crank_shaft', 'pinion_output', 'prop_shaft', 'pin_idler_a', 'pin_idler_b', 'pin_prop'];
const FILE = {
  shell_side1: 'shell_front', shell_side2: 'shell_back', gear_input: 'gear_54T', compound_gear: 'compound_12T_54T',
  pinion_output: 'pinion_12T_hub', crank_shaft: 'crank_shaft', prop_shaft: 'prop_shaft', crank_handle: 'crank_handle',
  propeller: 'propeller', pin_idler_a: 'pin_a', pin_idler_b: 'pin_b', pin_prop: 'pin_c',
};
const GEAR_C = [6.5, 6, 0];
const _v = new THREE.Vector3();
let coarse, coarseWire, normals, clipCad, clipCoarse;

function layout() {
  const pos = {};
  const place = (ids, y, gap) => {
    let z = 0; const w = ids.map((id) => 0);
    const widths = ids.map((id) => { const m = id; return null; });
    return { ids, y, gap };
  };
  // Row 1: large parts, row 2: small parts (positions in CAD-frame offsets: Y up, Z across the screen).
  const r1z = [-250, -160, -55, 50, 130], r2z = [-250, -175, -105, -40, 20, 70, 120];
  ROW1.forEach((id, i) => { pos[id] = [0, 52, r1z[i]]; });
  ROW2.forEach((id, i) => { pos[id] = [0, -78, r2z[i]]; });
  return pos;
}
const POS = layout();

export default {
  async setup(ctx) {
    const { geom } = await loadPart('compound_gear_coarse');
    geom.deleteAttribute('normal');
    const g = geom.toNonIndexed(); g.computeVertexNormals();
    clipCad = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    clipCoarse = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    coarse = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xc7d3de, roughness: 0.5, flatShading: true, clippingPlanes: [clipCoarse], polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    coarseWire = new THREE.LineSegments(new THREE.WireframeGeometry(g), new THREE.LineBasicMaterial({ color: 0x3cc8ff, transparent: true, opacity: 0.75, clippingPlanes: [clipCoarse] }));
    // Outward normals sampled from the fine export mesh.
    const fine = ctx.fan.parts.compound_gear.geom;
    const P = fine.attributes.position, N = fine.attributes.normal, seg = [];
    for (let i = 0; i < P.count; i += 23) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      seg.push(x, y, z, x + N.getX(i) * 4.5, y + N.getY(i) * 4.5, z + N.getZ(i) * 4.5);
    }
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    normals = new THREE.LineSegments(ng, new THREE.LineBasicMaterial({ color: 0x3cc8ff, transparent: true, opacity: 0.9 }));
    const body = ctx.fan.parts.compound_gear.body;
    body.add(coarse, coarseWire, normals);
    Object.assign(ctx.objects, { stlCoarse: coarse, stlWire: coarseWire, stlNormals: normals });
  },

  apply(t, ctx, st) {
    const { fan, ov } = ctx;
    ov.grid = 1;
    ctx.ground.visible = false;
    const lt = t - st.start;
    const parts = fan.parts;
    fan.setAll('cad', { edges: 0.85 });
    fan.setMode('cap', 'hidden');

    // Phase A: assembled -> one file per part (grid), then everything but the compound gear leaves.
    const fA = keys(t, [[42.2, 0], [44.6, 1]], easeInOut);
    const leave = ramp(t, 48.4, 49.4, smooth);
    for (const id of [...ROW1, ...ROW2]) {
      const p = parts[id], c = p.manifest ? p.manifest.bbox_min.map((v, k) => (v + p.manifest.bbox_max[k]) / 2) : [0, 0, 0];
      const target = POS[id];
      if (id === 'compound_gear') continue;
      p.root.position.set((target[0] - c[0]) * fA, (target[1] - c[1]) * fA, (target[2] - c[2]) * fA);
      if (leave > 0) fan.setMode(id, 'cad', { opacity: 1 - leave, edges: 0.85 * (1 - leave) });
      if (leave >= 0.999) fan.setMode(id, 'hidden');
    }
    // Compound gear: grid slot, then centre stage.
    const g = parts.compound_gear;
    const slot = [POS.compound_gear[0] - GEAR_C[0], POS.compound_gear[1] - GEAR_C[1], POS.compound_gear[2] - GEAR_C[2]];
    const fC = ramp(t, 48.6, 50.2, easeInOut);
    g.root.position.set(slot[0] * fA * (1 - fC) - GEAR_C[0] * fC, slot[1] * fA * (1 - fC) - GEAR_C[1] * fC, slot[2] * fA * (1 - fC) - GEAR_C[2] * fC);

    // Orientation for printing: 54T face down (CAD +X -> world -Y).
    const fO = ramp(t, 57.0, 59.0, easeInOut);
    fan.group.rotation.z = -Math.PI / 2 * fO;
    fan.group.position.y = -18 * fO;

    // Facet transition: a sweep plane across the gear (world Z).
    const sweep = keys(t, [[50.0, -40], [52.2, 40]], easeInOut);
    const showCoarse = t > 49.8 && t < 54.6;
    if (showCoarse) {
      clipCad.constant = -sweep; clipCoarse.constant = sweep;
      g.mats.cad.clippingPlanes = [clipCad];
      coarse.visible = coarseWire.visible = true;
      const back = ramp(t, 53.8, 54.6, smooth);
      if (back > 0) { clipCad.constant = -sweep - 80 * back; clipCoarse.constant = sweep + 80 * back; }
    } else g.mats.cad.clippingPlanes = [];
    g.mats.cad.needsUpdate = false;
    const nOp = window_(t, 55.0, 59.6, 0.4, 0.4);
    normals.visible = nOp > 0.01; normals.material.opacity = 0.9 * nOp;

    // Camera.
    if (t < 48.6) orbit(ctx, [0, -8, -60], keys(t, [[42, 150], [44.6, 180], [48.6, 182]], easeInOut), keys(t, [[42, 15], [44.6, 4], [48.6, 4]]), keys(t, [[42, 450], [44.6, 560], [48.6, 560]], easeInOut), 30);
    else {
      const az = keys(t, [[48.6, 182], [50.4, 205], [53.4, 220], [57, 210], [60, 205]], easeInOut);
      const el = keys(t, [[48.6, 4], [50.4, 18], [53.4, 22], [57, 24], [60, 28]], easeInOut);
      const r = keys(t, [[48.6, 560], [50.4, 190], [53.4, 160], [55, 230], [60, 260]], easeInOut);
      const tgt = keys(t, [[48.6, [0, -8, -60]], [50.4, [0, 0, 0]], [53.4, [0, 10, 6]], [55, [0, 0, 0]], [60, [0, -12, 0]]], easeInOut);
      orbit(ctx, tgt, az, el, r, 30, [keys(t, [[48.6, 0], [50.4, 0], [55, -260]], easeInOut), 0]);
    }
    ctx.setKey([-150, 260, 260], [0, 0, 0], 2.3);

    ov.card(st, t, 'Why export each part separately?');
    ov.badge('<b>Real export</b> · 12 STL files from fan_A.1.igs', '', window_(t, 44.0, 59.8, 0.5, 0.4));

    // File chips under each part.
    const chipOp = window_(t, 44.6, 48.8, 0.5, 0.4);
    if (chipOp > 0.01) {
      for (const id of [...ROW1, ...ROW2]) {
        const p = parts[id], m = p.manifest;
        const y = id === 'propeller' ? -20 : m.bbox_min[1];
        const c = [(m.bbox_min[0] + m.bbox_max[0]) / 2, y, (m.bbox_min[2] + m.bbox_max[2]) / 2];
        const s = ov.proj(fan.pointWorld(id, c, _v));
        const k = ROW1.includes(id) ? ROW1.indexOf(id) : ROW2.indexOf(id) + 5;
        const op = chipOp * ramp(t, 44.6 + k * 0.12, 45.2 + k * 0.12, smooth);
        ov.html(`<div class="tag" style="left:${s.x}px;top:${s.y + 22}px;opacity:${op.toFixed(3)};transform:translate(-50%,0);font-size:${ROW1.includes(id) ? 18 : 15}px;text-align:center">${FILE[id]}.stl<br><span style="color:#a9b8c8;font-weight:400">${m.triangles.toLocaleString('en-US')} △</span></div>`);
      }
    }

    // CAD vs STL labels.
    const fOp = window_(t, 50.6, 54.4, 0.4, 0.4);
    ov.label({ anchor: null, at: { x: 520, y: 210 }, text: 'CAD: exact B-rep surfaces', sub: 'NURBS faces, trimmed by edges', op: fOp, side: 'bottom' });
    ov.label({ anchor: null, at: { x: 1400, y: 210 }, text: 'STL: flat triangles only', sub: '3 vertices + 1 normal each · no units, no features', op: fOp, side: 'bottom', cls: '' });
    ov.html(`<div class="foot" style="opacity:${fOp.toFixed(3)}">Coarse tessellation shown so facets are visible. Exported file: ${g.manifest.triangles.toLocaleString('en-US')} triangles at 0.01 mm chordal deviation, so teeth stay smooth.</div>`);

    // Checks (verified on this export: watertight, consistent outward winding, mm scale).
    const cOp = window_(t, 54.6, 59.8, 0.5, 0.4);
    const tick = (a) => ramp(t, a, a + 0.3) > 0.5 ? 'on' : '';
    ov.panel({ x: 1180, y: 260, w: 640, op: cOp, slide: 30, html: `
      <h3>Mesh checks<small>Run on the STL files exported for this video</small></h3>
      <div class="check"><span class="ic ${tick(55.2)}">✓</span><span>Closed, no holes<span class="d">every edge shared by exactly two triangles</span></span></div>
      <div class="check"><span class="ic ${tick(56.0)}">✓</span><span>Normals point outward<span class="d">consistent winding, positive volume</span></span></div>
      <div class="check"><span class="ic ${tick(56.8)}">✓</span><span>Scale in millimetres<span class="d">STL has no units: outside Ø 56.0 mm confirms it</span></span></div>
      <div class="check"><span class="ic ${tick(58.6)}">✓</span><span>Oriented for printing<span class="d">54 T face down, teeth formed in each layer</span></span></div>` });
    const dOp = window_(t, 56.6, 57.3, 0.3, 0.3);
    if (dOp > 0.01) {
      const a = ov.proj(fan.pointWorld('compound_gear', [13, 6 - 28, 0], _v)), b = ov.proj(fan.pointWorld('compound_gear', [13, 6 + 28, 0], _v));
      ov.dim(a, b, 'Ø 56.0 mm', { op: dOp, off: 0 });
    }
    const zOp = window_(t, 58.4, 60, 0.4, 0.2);
    if (zOp > 0.01) {
      const a = ov.proj(_v.set(0, -18, 0)), b = ov.proj(_v.set(0, 40, 0));
      ov.arrow(a, b, { color: '#3cc8ff', w: 3, op: zOp });
      ov.tag({ at: { x: b.x + 70, y: b.y }, text: 'build ↑ Z', op: zOp, cls: 'cyan' });
    }
  },
};
