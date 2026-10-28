// STAGE 6 · ASSEMBLY & TEST (142-172 s)
// Assembly order from report section 6, checked against the CAD: everything drops into the
// front shell along the shaft axis; the back shell closes over the train; the handle, propeller
// shaft, propeller and cap fit from outside, last. Then the mechanism runs and the test PLAN is shown.
import { keys, ramp, smooth, window_, easeInOut, clamp, TAU } from '../util.js';
import { orbit, projPart } from './common.js';
import { RATIO } from '../fan.js';
import { makeMat } from '../bench.js';

let mat;
// [part, start, end] of each drop along the shaft axis.
const DROPS = [
  ['pin_idler_b', 143.4, 144.5], ['pin_prop', 143.6, 144.7],
  ['gear_input', 144.7, 146.2], ['crank_shaft', 144.9, 146.4],
  ['compound_gear', 146.4, 147.9], ['pinion_output', 147.9, 149.2], ['pin_idler_a', 149.0, 149.9],
  ['shell_side2', 151.0, 152.7], ['crank_handle', 152.8, 153.8], ['prop_shaft', 153.6, 154.5],
  ['propeller', 154.4, 155.4], ['cap', 155.3, 156.2],
];
const STEPS = [
  [143.3, 'Axle pins, then the 54 T gear and crank shaft into the front shell'],
  [146.4, 'Compound gear onto its pin, meshing with the 54 T gear'],
  [147.9, 'Pinion with hub, meshing with the compound gear; turn by hand: no binding'],
  [151.0, 'Back shell closes: rim and bosses align the halves'],
  [152.8, 'Crank handle onto the crank shaft'],
  [153.6, 'Propeller shaft and propeller; the cap goes on last'],
];

function crank(t) {
  // Hand check after meshing, then steady cranking for the demonstration (0.35 rev/s).
  const check = 0.9 * Math.sin(Math.PI * clamp((t - 149.8) / 1.1));
  const rps = 0.35, t0 = 157.4, ta = 1.5;
  let run = 0;
  if (t > t0) { const dt = t - t0; run = TAU * rps * (dt < ta ? dt * dt / (2 * ta) : ta / 2 + (dt - ta)); }
  return { th: check + run, omega: t > t0 ? TAU * rps * clamp((t - t0) / ta) : 0 };
}

export default {
  async setup(ctx) {
    mat = makeMat();
    ctx.scene.add(mat);
    ctx.objects.asmMat = mat;
  },

  apply(t, ctx, st) {
    const { fan, ov } = ctx;
    ov.grid = 0;
    fan.setAll('printed');
    const up = ramp(t, 156.2, 157.6, easeInOut); // bench orientation -> upright
    mat.visible = up < 0.35;
    mat.position.y = -1.5;
    ctx.ground.position.y = keys(t, [[156.2, -3], [157.6, -66]]);
    ctx.ground.material.opacity = 0.3;

    // Bench orientation: CAD +X points down, so parts drop into the front shell from above.
    fan.group.rotation.z = -Math.PI / 2 * (1 - up);
    fan.group.position.set(0, 24 * (1 - up), 0);
    for (const [id, a, b] of DROPS) {
      const f = ramp(t, a, b, easeInOut);
      fan.parts[id].root.position.x = -130 * (1 - f);
      if (t < a - 0.6) fan.setMode(id, 'hidden');
      else if (t < a) fan.setMode(id, 'printed', { opacity: ramp(t, a - 0.6, a, smooth) });
    }
    const { th, omega } = crank(t);
    fan.setCrank(th);

    // X-ray of the back shell while the mechanism runs, so the gear train stays visible.
    const xr = window_(t, 158.6, 171.2, 0.8, 1.0);
    if (xr > 0.01 && t > 152.7) fan.setMode('shell_side2', xr > 0.5 ? 'ghost' : 'printed', xr > 0.5 ? { opacity: 0.1 } : { opacity: 1 - xr });
    fan.setMode('propeller', 'cad', { edges: 0 });
    if (t < 154.4 - 0.6) fan.setMode('propeller', 'hidden');
    fan.setPropBlur(omega * RATIO, 1 / 60);

    // Camera.
    let az, el, r, tgt, shift = [0, 0];
    if (t < 156.2) {
      az = keys(t, [[142, 245], [150, 250], [156.2, 240]]); el = keys(t, [[142, 52], [150, 48], [156.2, 40]]);
      r = keys(t, [[142, 470], [146, 420], [156.2, 470]], easeInOut); tgt = [0, 20, 0]; shift = [260, 0];
    } else if (t < 164.2) {
      az = keys(t, [[156.2, 240], [157.6, 150], [164.2, 140]], easeInOut); el = keys(t, [[156.2, 40], [157.6, 12], [164.2, 14]], easeInOut);
      r = keys(t, [[156.2, 470], [157.6, 440], [164.2, 420]], easeInOut); tgt = keys(t, [[156.2, [0, 20, 0]], [157.6, [-6, 6, 0]]], easeInOut);
      shift = [keys(t, [[156.2, 260], [157.6, 0], [160, 0], [163.4, -320]], easeInOut), 0];
    } else {
      az = keys(t, [[164.2, 140], [172, 125]]); el = 14; r = 440; tgt = [-6, 6, 0]; shift = [-330, 0];
    }
    orbit(ctx, tgt, az, el, r, 30, shift);
    ctx.setKey([-160, 280, 220], [0, 0, 0], 2.3);

    ov.card(st, t);
    ov.badge('<b>Illustrative assembly</b> · order from report §6, positions from the CAD', 'illus', window_(t, 142.6, 171.8, 0.5, 0.4));

    // Step list.
    const sOp = window_(t, 143.0, 157.0, 0.5, 0.5);
    if (sOp > 0.01) {
      const cur = STEPS.reduce((k, s, i) => (t >= s[0] ? i : k), 0);
      ov.panel({ x: 64, y: 210, w: 600, op: sOp, slide: -30, html: `<h3>Assembly sequence<small>No screws, clips or electronics: it is all printed parts</small></h3>` +
        STEPS.map((s, i) => `<div class="row" style="opacity:${i === cur ? 1 : i < cur ? 0.55 : 0.3}"><span class="k mono" style="min-width:34px;color:${i === cur ? '#3cc8ff' : '#6f8193'}">${i + 1}</span><span style="font-size:20px">${s[1]}</span></div>`).join('') });
    }
    // Mesh check tag.
    const mOp = window_(t, 149.8, 151.0, 0.2, 0.3);
    if (mOp > 0.01) ov.tag({ at: projPart(ctx, null, [-5, 6, 0]), text: 'turn by hand: gears mesh, no binding', op: mOp, cls: 'amber' });

    // Running mechanism.
    const rOp = window_(t, 158.2, 164.0, 0.5, 0.4);
    if (rOp > 0.01) {
      ov.panel({ x: 1180, y: 300, w: 640, op: rOp, slide: 30, html: `<h3>By design<small>Theoretical, from the CAD tooth counts; not a measurement</small></h3>
        <div class="row"><span class="k">1 crank turn</span><span class="v">≈ 20 propeller turns</span></div>
        <div class="row"><span class="k">Two stages</span><span class="v">54/12 × 54/12 = 20.25</span></div>
        <div class="row"><span class="k">Direction</span><span class="v">propeller turns the same way as the crank</span></div>` });
      // Airflow direction arrows in front of the propeller (direction only, illustrative).
      for (const dz of [-24, 0, 24]) {
        const a = projPart(ctx, null, [-30, 39 + dz * 0.6, dz]), b = projPart(ctx, null, [-110, 39 + dz * 0.6, dz]);
        ov.arrow(a, b, { color: '#3cc8ff', w: 2.5, op: rOp * 0.7 });
      }
      ov.tag({ at: projPart(ctx, null, [-120, 39, 0]), text: 'airflow', op: rOp, cls: 'cyan' });
    }

    // Test plan (report 7.1): methods and criteria only; no results exist yet.
    const tOp = window_(t, 164.2, 172, 0.5, 0.3);
    if (tOp > 0.01) {
      const rows = [
        ['Fit', 'Assemble without force', 'Parts mate; shells close fully'],
        ['Free rotation', 'Turn the crank by hand', 'No binding over a full turn'],
        ['Speed ratio', 'Count propeller turns per 10 crank turns', 'Matches tooth counts (≈ 202)'],
        ['Airflow', 'Anemometer 20 cm in front', 'Noticeable airflow'],
        ['Endurance', 'Crank continuously for 5 min', 'No tooth skipping or cracks'],
        ['Balance', 'Spin the propeller, watch', 'No visible wobble'],
      ];
      ov.panel({ x: 860, y: 200, w: 990, op: tOp, slide: 30, html: `<h3>Test plan<small>Planned checks from the report §7.1. No measured results are recorded yet</small></h3>
        <table class="plan"><tr><th>Test</th><th>Method</th><th>Pass criterion</th><th>Result</th></tr>` +
        rows.map((r, i) => `<tr style="opacity:${ramp(t, 164.6 + i * 0.5, 165.1 + i * 0.5, smooth).toFixed(3)}"><td class="t">${r[0]}</td><td class="m">${r[1]}</td><td class="m">${r[2]}</td><td class="r">to be measured</td></tr>`).join('') + '</table>' });
    }
  },
};
