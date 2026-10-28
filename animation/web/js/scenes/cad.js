// STAGE 1 · CAD MODEL DESIGN (8-42 s)
//  8.0-13.4  orbit of the assembled CAD model, overall size from the geometry
// 13.4-20.8  explode along the shaft axis (X); README component names
// 20.8-30.6  gear train: crank -> 54T -> 12T|54T compound -> 12T pinion -> propeller
// 30.6-35.8  speed-up: tooth counts measured from the CAD -> theoretical ratio 20.25
// 35.8-42.0  what CAD lets you check: fit, shaft alignment, centre distance, clearance
import { keys, ramp, smooth, window_, TAU, easeInOut, clamp, smoother } from '../util.js';
import { orbit, projPart, axisArc, labelRow } from './common.js';
import { RATIO, RATIO_1, PARTS } from '../fan.js';

// Explode order: outermost parts leave first.
const ORDER = ['cap', 'propeller', 'prop_shaft', 'crank_handle', 'shell_side2', 'pin_idler_a', 'crank_shaft',
  'gear_input', 'compound_gear', 'pinion_output', 'pin_idler_b', 'pin_prop', 'shell_side1'];

function crankAngle(t) {
  // Crank starts at 21.9 s and eases up to 0.12 rev/s (slowed for clarity).
  const rps = 0.12, t0 = 21.9, ta = 1.2;
  if (t < t0) return 0;
  const dt = t - t0;
  return TAU * rps * (dt < ta ? dt * dt / (2 * ta) : ta / 2 + (dt - ta));
}

export default {
  apply(t, ctx, st) {
    const { fan, ov } = ctx;
    ov.grid = keys(t, [[8, 0], [9.5, 1], [40.5, 1], [42, 0]]);
    ctx.ground.position.y = -66;
    ctx.ground.material.opacity = keys(t, [[8, 0.32], [13.4, 0.32], [14.5, 0], [41, 0], [42, 0.3]]);

    // ---- explode / collapse
    const fEx = keys(t, [[13.5, 0], [17.4, 1], [20.9, 1], [22.6, 0]], easeInOut);
    const exploding = t < 20.9;
    fan.explode(fEx, (id, f) => {
      if (!exploding) return f;
      const k = ORDER.indexOf(id) / (ORDER.length - 1);
      return smoother(clamp((t - 13.5 - k * 1.3) / 2.6));
    });

    // ---- crank motion
    const th = crankAngle(t);
    fan.setCrank(th);
    const omegaProp = t > 21.9 ? TAU * 0.12 * RATIO * clamp((t - 21.9) / 1.2) : 0;

    // ---- materials: CAD look, shells ghosted during the gear-train study
    const ghost = keys(t, [[20.6, 0], [21.6, 1], [40.4, 1], [41.6, 0]]);
    fan.setAll('cad', { edges: 0.85 });
    for (const id of ['shell_side1', 'shell_side2']) {
      if (ghost > 0.5) fan.setMode(id, 'ghost', { opacity: 0.08 + 0.1 * (1 - ghost) });
      else if (ghost > 0) fan.setMode(id, 'cad', { opacity: 1 - ghost * 0.9, edges: 0.85 });
    }
    // Propeller see-through while the gear train is introduced, then solid again when it spins.
    const propGhost = window_(t, 21.0, 29.6, 0.6, 0.8);
    if (propGhost > 0.01) fan.setMode('propeller', 'cad', { opacity: 1 - 0.75 * propGhost, edges: 0.85 * (1 - 0.6 * propGhost) });
    if (propGhost > 0.01) fan.setMode('cap', 'cad', { opacity: 1 - 0.75 * propGhost, edges: 0.5 });

    // Highlights in the order the narration names them.
    const AMB = 0xff9a1f, CY = 0x2fb8ff;
    const hl = (ids, a, b, col = AMB, s = 0.55) => {
      const w = window_(t, a, b, 0.35, 0.5);
      if (w > 0.01) for (const id of ids) fan.setMode(id, fan.parts[id].mode === 'ghost' ? 'ghost' : 'cad', { emissive: col, glow: s * w, edges: 0.85, opacity: fan.parts[id].mesh.material.opacity });
    };
    hl(['crank_handle', 'crank_shaft', 'gear_input'], 21.7, 24.4);
    hl(['compound_gear'], 24.0, 27.6, CY, 0.45);
    hl(['pinion_output', 'prop_shaft'], 27.0, 29.8);
    if (t > 29.2) fan.setPropBlur(omegaProp);

    // ---- camera
    let az, el, r, tgt, fov = 30, shift = [0, 0];
    if (t < 13.4) {
      az = keys(t, [[8, 128], [13.4, 205]], easeInOut); el = keys(t, [[8, 15], [13.4, 20]]); r = keys(t, [[8, 450], [13.4, 480]]);
      tgt = [-4, 4, 0]; shift = [keys(t, [[8, 340], [10.5, 120], [13.4, 0]], easeInOut), 0];
    } else if (t < 21) {
      az = keys(t, [[13.4, 205], [16.5, 140], [21, 136]], easeInOut); el = keys(t, [[13.4, 20], [16.5, 16], [21, 15]], easeInOut);
      r = keys(t, [[13.4, 480], [16.5, 590], [21, 600]], easeInOut); tgt = keys(t, [[13.4, [-4, 4, 0]], [16.5, [-48, 6, 0]], [21, [-48, 6, 0]]], easeInOut);
    } else {
      az = keys(t, [[21, 136], [23, 158], [30.6, 166], [35.8, 170], [38, 156], [42, 150]], easeInOut);
      el = keys(t, [[21, 15], [23, 9], [35.8, 9], [38, 16], [42, 15]], easeInOut);
      r = keys(t, [[21, 600], [23, 400], [30.6, 390], [35.8, 390], [38, 410], [42, 450]], easeInOut);
      tgt = keys(t, [[21, [-48, 6, 0]], [23, [0, 6, 0]], [35.8, [0, 6, 0]], [38, [-4, 8, 0]]], easeInOut);
      shift = [keys(t, [[21, 0], [23, -260], [35.8, -260], [38, -240], [42, -200]], easeInOut), 0];
    }
    orbit(ctx, tgt, az, el, r, fov, shift);
    ctx.setKey([-200, 260, 230], [0, 0, 0], 2.3);

    ov.card(st, t);
    ov.badge('<b>Actual CAD geometry</b> · fan_A.1.igs · 3DEXPERIENCE V6R2026x · mm', '', window_(t, 8.6, 41.8, 0.6, 0.4));

    // ---- overall dimensions (measured from the IGES bodies)
    const dOp = window_(t, 9.8, 13.3, 0.5, 0.5);
    if (dOp > 0.01) {
      const P = (x) => projPart(ctx, null, x);
      ov.dim(P([24, -65, 35]), P([24, 60, 35]), '125 mm', { op: dOp, off: 34 });
      ov.dim(P([24, -65, -35]), P([24, -65, 35]), '70 mm', { op: dOp, off: 34 });
      ov.dim(P([-10, 60, 35]), P([24, 60, 35]), '34 mm', { op: dOp, off: 40 });
    }

    // ---- exploded-view labels
    const lOp = (k) => window_(t, 14.4 + k * 0.55, 21.0, 0.45, 0.4);
    if (t > 14.2 && t < 21.2) {
      const A = (id) => ov.proj(fan.anchorWorld(id));
      const top = [
        { id: 'propeller', k: 6 }, { id: 'shell_side2', k: 0 }, { id: 'compound_gear', k: 2 },
        { id: 'pinion_output', k: 4 }, { id: 'shell_side1', k: 0 },
      ].map(({ id, k }) => ({ anchor: A(id), x: A(id).x, text: PARTS[id].label, op: lOp(k) }));
      const bottom = [
        { id: 'cap', k: 6, sub: '*reconstructed: not in the IGES export' }, { id: 'prop_shaft', k: 4 }, { id: 'crank_handle', k: 1 },
        { id: 'crank_shaft', k: 4 }, { id: 'gear_input', k: 2 },
      ].map(({ id, k, sub }) => ({ anchor: A(id), x: A(id).x, text: PARTS[id].label, sub, op: lOp(k) }));
      const pins = ['pin_idler_a', 'pin_idler_b', 'pin_prop'].map(A);
      bottom.push({ anchor: pins, x: (pins[1].x + pins[2].x) / 2, text: 'Axle pins ×3', op: lOp(5) });
      labelRow(ov, top, 236, 'bottom');
      labelRow(ov, bottom, 818, 'top');
    }

    // ---- gear train callouts
    if (t > 21.6 && t < 36.2) {
      const P = (id, x) => projPart(ctx, id, x);
      const tg = (id, x, txt, a, b, cls = 'amber') => ov.tag({ at: P(id, x), text: txt, op: window_(t, a, b, 0.4, 0.5), cls });
      tg('gear_input', [2.5, -27 - 36, 0], '54 T', 22.4, 36.0);
      tg('compound_gear', [4, 6 - 13, -6], '12 T', 24.2, 36.0, 'cyan');
      tg('compound_gear', [10.5, 6 + 36, 0], '54 T', 25.2, 36.0, 'cyan');
      tg('pinion_output', [12, 39 + 13, 7], '12 T', 27.2, 36.0);
      // rotation arrows on each axis (directions follow the measured train: CW, CCW, CW from the crank side)
      const aOp = (a) => window_(t, a, 35.8, 0.5, 0.5);
      const spin = th;
      axisArc(ctx, null, [-21, -27, 0], 28, -spin - 0.9, -spin + 0.5, { op: aOp(22.0) });
      axisArc(ctx, null, [-2, 6, 0], 14, spin * RATIO_1 + 2.4, spin * RATIO_1 + 1.0, { op: aOp(24.4), color: '#3cc8ff' });
      axisArc(ctx, null, [-24, 39, 0], 47, -1.3, 0.2, { op: aOp(28.6) });
      // mesh points
      const mOp = (a) => window_(t, a, 30.4, 0.3, 0.5);
      const pulse = 1 + 0.25 * Math.sin(t * 6);
      for (const [x, a] of [[[2.5, 0, 0], 24.6], [[10.5, 33, 0], 27.6]]) {
        const p = P(null, x);
        if (mOp(a) > 0.01) ov.svg(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(14 * pulse).toFixed(1)}" fill="none" stroke="#fff" stroke-width="2.5" opacity="${mOp(a).toFixed(3)}"/>`);
      }
      ov.label({ anchor: P(null, [2.5, 0, 0]), at: { x: P(null, [2.5, 0, 0]).x + 190, y: P(null, [2.5, 0, 0]).y + 120 }, text: 'Mesh 1', sub: '54 T drives 12 T', side: 'left', op: mOp(24.6) });
      ov.label({ anchor: P(null, [10.5, 33, 0]), at: { x: P(null, [10.5, 33, 0]).x + 200, y: P(null, [10.5, 33, 0]).y - 40 }, text: 'Mesh 2', sub: '54 T drives 12 T', side: 'left', op: mOp(27.6) });
    }

    // ---- speed-up panel
    const rOp = window_(t, 30.6, 35.9, 0.5, 0.4);
    ov.panel({ x: 1110, y: 250, w: 740, op: rOp, slide: 30, html: `
      <h3>Two speed-up stages<small>Theoretical · tooth counts measured from the CAD geometry (module 1 mm)</small></h3>
      <div class="eq" style="margin:16px 0 18px">i = <span class="a">54/12</span> × <span class="c">54/12</span> = 4.5 × 4.5 = <b>20.25</b></div>
      <div class="row"><span class="k">Crank</span><span class="v">1 turn</span></div>
      <div class="row"><span class="k">Compound gear</span><span class="v">4.5 turns · opposite direction</span></div>
      <div class="row"><span class="k">Propeller</span><span class="v">≈ 20 turns · same direction</span></div>
      <div class="note">Not a measurement: the test plan includes counting propeller turns.</div>` });

    // ---- CAD checks
    if (t > 35.8) {
      const cOp = (a) => window_(t, a, 41.7, 0.45, 0.4);
      const P = (x) => projPart(ctx, null, x);
      // shaft axes through both shells
      for (const y of [-27, 6, 39]) ov.line(P([-34, y, 0]), P([34, y, 0]), { color: '#3cc8ff', w: 2, op: cOp(36.6) * 0.9, dash: '10 7' });
      ov.dim(P([30, -27, 0]), P([30, 6, 0]), '33.0 mm', { op: cOp(37.4), off: -60 });
      ov.dim(P([30, 6, 0]), P([30, 39, 0]), '33.0 mm', { op: cOp(37.4), off: -60 });
      ov.panel({ x: 1110, y: 250, w: 740, op: cOp(36.0), slide: 30, html: `
        <h3>What the CAD model lets you check<small>Values measured from fan_A.1.igs</small></h3>
        <div class="row"><span class="k">Fit</span><span class="v">halves meet on a stepped rim</span></div>
        <div class="row"><span class="k">Shaft alignment</span><span class="v">3 parallel axes, bosses in both halves</span></div>
        <div class="row"><span class="k">Centre distance</span><span class="v">33.0 mm = m(z₁+z₂)/2</span></div>
        <div class="row"><span class="k">Propeller clearance</span><span class="v">Ø85 rotor, 6.7 mm from the face</span></div>` });
    }
  },
};
