// STAGE 5 · FINISHING (120-142 s). Illustrative: the operations come from report section 5.3;
// no finished physical specimen is documented.
// 120.0-125.6 printed parts on the bench
// 125.6-128.6 brim and strings trimmed from the propeller (hobby knife, cutting away from the hand)
// 128.6-132.0 gear flanks sanded (400-800 grit): layer ridges reduced
// 132.0-134.8 pin hole reamed; 134.8-136.8 a drop of lubricant on the teeth
// 136.8-142.0 propeller balance: spun on its shaft, it should stop at random angles
import * as THREE from 'three';
import { keys, ramp, smooth, window_, easeInOut, clamp, TAU, rng } from '../util.js';
import { orbit } from './common.js';
import { makeMat } from '../bench.js';
import { PLATE_X } from '../roads.js';

let mat, brim, strings, knife, block, drill, drop, vblocks;
const _m = new THREE.Matrix4(), _v = new THREE.Vector3();
const STOPS = [2.1, 4.75, 0.9]; // three different stopping angles (rad), as a balanced rotor should show

function onBench(ctx, id, dx = 0, dz = 0, rotY = 0) {
  // Place a part as it came off the printer (print orientation), centred at (dx, 0, dz) on the bench.
  const p = ctx.plates[id], part = ctx.fan.parts[id];
  const [ox, oy] = { compound_gear: [0, 55], propeller: [-40, -50], shell_side1: [-40, 0], gear_input: [-62, 55], pinion_output: [48, 72], crank_handle: [92, -80], shell_side2: [40, 0], crank_shaft: [72, 72] }[id];
  part.root.matrixAutoUpdate = false;
  _m.makeTranslation(dx, 0, dz).multiply(new THREE.Matrix4().makeRotationY(rotY)).multiply(new THREE.Matrix4().makeTranslation(-(PLATE_X[p.plate] + ox), 0, oy)).multiply(p.world);
  part.root.matrix.copy(_m);
  ctx.fan.setMode(id, 'printed');
}

export default {
  async setup(ctx) {
    mat = makeMat();
    const pla = new THREE.MeshStandardMaterial({ color: 0xe9e5de, roughness: 0.6 });
    brim = new THREE.Mesh(new THREE.RingGeometry(10.2, 14.0, 64), pla.clone()); brim.rotation.x = -Math.PI / 2;
    brim.material.side = THREE.DoubleSide; brim.material.transparent = true;
    strings = new THREE.Group();
    const r = rng(7);
    for (let i = 0; i < 7; i++) {
      const a = r() * TAU, len = 18 + r() * 14;
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, len, 4), pla);
      s.position.set(Math.cos(a) * 22, 4 + r() * 5, Math.sin(a) * 22); s.rotation.set(Math.PI / 2, 0, a + 0.4); strings.add(s);
    }
    knife = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.5, 70, 16), new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: 0.4 }));
    handle.rotation.z = Math.PI / 2; handle.position.x = 47;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 8, 16), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.9, roughness: 0.3 }));
    collar.rotation.z = Math.PI / 2; collar.position.x = 10;
    const bladeShape = new THREE.Shape(); bladeShape.moveTo(0, 0); bladeShape.lineTo(8, 4); bladeShape.lineTo(8, -2); bladeShape.lineTo(0, 0);
    const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape, { depth: 0.4, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xd8dde3, metalness: 1, roughness: 0.15 }));
    blade.position.set(-1, 0, -0.2);
    knife.add(handle, collar, blade);
    block = new THREE.Group();
    block.add(new THREE.Mesh(new THREE.BoxGeometry(30, 8, 6), new THREE.MeshStandardMaterial({ color: 0x5a6470, roughness: 0.7 })));
    const grit = new THREE.Mesh(new THREE.BoxGeometry(30, 8, 0.8), new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 1 })); grit.position.z = 3.4; block.add(grit);
    drill = new THREE.Group();
    const bit = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 46, 12), new THREE.MeshStandardMaterial({ color: 0xb7bec7, metalness: 1, roughness: 0.25 }));
    bit.position.y = 23;
    const vise = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 60, 20), new THREE.MeshStandardMaterial({ color: 0x8a6a3a, metalness: 0.6, roughness: 0.4 }));
    vise.position.y = 76;
    drill.add(bit, vise);
    drop = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 14), new THREE.MeshStandardMaterial({ color: 0xd9b45a, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 }));
    vblocks = new THREE.Group();
    for (const x of [-36, 8]) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(5, 92, 18), new THREE.MeshStandardMaterial({ color: 0x3a424c, roughness: 0.5, metalness: 0.5 }));
      v.position.set(x, 46 - 2.5, 0); vblocks.add(v);
    }
    const arbor = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 60, 16), new THREE.MeshStandardMaterial({ color: 0xb7bec7, metalness: 0.9, roughness: 0.3 }));
    arbor.rotation.z = Math.PI / 2; arbor.position.set(-14, 92, 0); vblocks.add(arbor);
    ctx.scene.add(mat, brim, strings, knife, block, drill, drop, vblocks);
    Object.assign(ctx.objects, { mat, brim, strings, knife, block, drill, drop, vblocks });
  },

  apply(t, ctx, st) {
    const { fan, ov } = ctx;
    ov.grid = 0;
    mat.visible = true;
    ctx.ground.position.y = -3.1; ctx.ground.material.opacity = 0.3;
    for (const id of Object.keys(fan.parts)) fan.setMode(id, 'hidden');
    let az, el, r, tgt, shift = [0, 0];

    if (t < 125.6) {
      // Parts laid out on the bench, as printed.
      onBench(ctx, 'shell_side1', -150, 10); onBench(ctx, 'shell_side2', -60, 10);
      onBench(ctx, 'gear_input', 40, -40); onBench(ctx, 'compound_gear', 110, -40);
      onBench(ctx, 'propeller', 70, 70); onBench(ctx, 'pinion_output', 150, 40); onBench(ctx, 'crank_handle', 170, -100);
      az = keys(t, [[120, 240], [125.6, 262]]); el = keys(t, [[120, 52], [125.6, 44]]); r = keys(t, [[120, 640], [125.6, 560]]); tgt = [10, 0, 0];
    } else if (t < 128.6) {
      onBench(ctx, 'propeller', 0, 0);
      const cut = ramp(t, 126.0, 127.8, (f) => f);
      brim.visible = true; brim.position.set(0, 0.07 + 18 * ramp(t, 127.9, 128.5, smooth), 0);
      brim.material.opacity = 1 - ramp(t, 128.0, 128.5, smooth);
      strings.visible = t < 126.6;
      knife.visible = t < 128.1;
      const a = -Math.PI * 0.2 + cut * TAU * 0.9;
      knife.position.set(Math.cos(a) * 13.2, 1.0, Math.sin(a) * 13.2);
      knife.rotation.set(0, -a, 1.05);
      az = 245; el = 50; r = keys(t, [[125.6, 210], [128.6, 190]]); tgt = [0, 4, 0];
    } else if (t < 132.0 || (t >= 134.8 && t < 136.8)) {
      onBench(ctx, 'compound_gear', 0, 0);
      const g = fan.parts.compound_gear;
      const sand = ramp(t, 129.2, 131.6, (f) => f);
      g.mats.printed.userData.uniforms.uLayerAmp.value = 0.9 - 0.75 * sand;
      g.mats.printed.userData.uniforms.uLayerH.value = 0.16;
      if (t < 132) {
        block.visible = true;
        const s = Math.sin((t - 129.0) * TAU * 1.6) * 7;
        const a = 0.35;
        block.position.set(Math.cos(a) * 32.2 + Math.sin(a) * s, 2.5 + 12 * (1 - ramp(t, 128.8, 129.3, smooth)), -Math.sin(a) * 32.2 + Math.cos(a) * s);
        block.rotation.set(0, a - Math.PI / 2 + Math.PI, 0);
        az = 330; el = 18; r = 150; tgt = [24, 4, -12];
      } else {
        // Lubricant drop onto the teeth.
        drop.visible = t < 135.9;
        drop.position.set(Math.cos(0.35) * 27.5, 3 + 60 * (1 - ramp(t, 134.9, 135.8, (f) => f * f)), -Math.sin(0.35) * 27.5);
        g.mats.printed.roughness = 0.6 - 0.4 * ramp(t, 135.8, 136.4, smooth);
        az = 330; el = 24; r = 170; tgt = [24, 4, -12];
      }
    } else if (t < 134.8) {
      onBench(ctx, 'shell_side1', 0, 0);
      // Boss hole at the intermediate axis (CAD Y = 6): find it in world space.
      const hole = _v.set(10, 6, 0).applyMatrix4(fan.parts.shell_side1.root.matrix);
      drill.visible = true;
      drill.position.set(hole.x, 22 * (1 - ramp(t, 132.4, 133.6, easeInOut)) + 1, hole.z);
      drill.rotation.set(0, (t - 132) * TAU * 1.2, 0);
      az = 220; el = 36; r = 260; tgt = [hole.x, 14, hole.z];
    } else {
      // Balance check on the propeller's own shaft.
      vblocks.visible = true;
      const ids = ['propeller', 'prop_shaft'];
      for (const id of ids) {
        fan.setMode(id, 'printed');
        fan.parts[id].root.position.set(0, 92 - 39, 0);
      }
      const spins = [[137.0, 138.6], [138.8, 140.3], [140.5, 141.9]];
      let ang = 0, prev = 0.4;
      for (let k = 0; k < 3; k++) {
        const [a, b] = spins[k], f = clamp((t - a) / (b - a));
        const target = STOPS[k] + TAU * (2 + k);
        if (t >= a) ang = prev + (target - prev) * (1 - (1 - f) * (1 - f));
        prev = STOPS[k];
        if (t >= b) ang = STOPS[k];
      }
      if (t < 137.0) ang = 0.4;
      for (const id of ids) fan.parts[id].pivot.rotation.x = ang;
      // Stopping angles of the three spins, on a dial (illustrative).
      const dial = [0, 1, 2].filter((k) => t >= spins[k][1]).map((k) => {
        const a = STOPS[k] - Math.PI / 2;
        return `<line x1="80" y1="80" x2="${(80 + 62 * Math.cos(a)).toFixed(1)}" y2="${(80 + 62 * Math.sin(a)).toFixed(1)}" stroke="#ffad33" stroke-width="4"/><text x="${(80 + 74 * Math.cos(a)).toFixed(1)}" y="${(86 + 74 * Math.sin(a)).toFixed(1)}" fill="#ffad33" font-size="18" text-anchor="middle" font-family="JetBrains Mono">${k + 1}</text>`;
      }).join('');
      ov.panel({ x: 1300, y: 330, w: 420, op: window_(t, 137.4, 142, 0.4, 0.3), html: `<h3>Stopping angle<small>Illustrative: a balanced rotor has no favourite position</small></h3>
        <svg width="360" height="180"><circle cx="80" cy="80" r="62" fill="none" stroke="#6f8193" stroke-width="2"/>${dial}
        <text x="180" y="70" fill="#e9eff6" font-size="20" font-family="Inter">Spin, let it stop,</text><text x="180" y="96" fill="#e9eff6" font-size="20" font-family="Inter">repeat: positions</text><text x="180" y="122" fill="#e9eff6" font-size="20" font-family="Inter">should scatter</text></svg>` });
      az = 198; el = 8; r = 340; tgt = [-14, 86, 0]; shift = [-300, 0];
    }
    orbit(ctx, tgt, az, el, r, 30, shift);
    ctx.setKey([-120, 300, 180], [0, 0, 0], 2.2);

    ov.card(st, t, 'Why does finishing matter for rotating parts?');
    ov.badge('<b>Illustrative sequence</b> · operations from report §5.3', 'illus', window_(t, 120.6, 141.8, 0.5, 0.4));
    const L = (text, sub, a, b) => ov.label({ anchor: null, at: { x: 960, y: 210 }, text, sub, op: window_(t, a, b, 0.35, 0.35), side: 'bottom' });
    L('Printed parts', 'layer lines, brims and strings: not yet a smooth-running mechanism', 122.6, 125.5);
    L('Trim the brim and strings', 'hobby knife, always cutting away from the hand', 125.8, 128.5);
    L('Sand gear flanks and shafts', '400–800 grit (report) removes layer ridges', 128.8, 131.9);
    L('Ream the pin holes', 'drill bit sized to the pin, so shafts spin freely', 132.2, 134.7);
    L('Lubricate teeth and shafts', 'a drop of silicone grease or machine oil', 135.0, 136.7);
    L('Balance the propeller', 'balanced: it stops at random angles, not always the same blade down', 137.0, 141.9);

    // Surface profile inset during sanding (illustrative, not measured).
    const pOp = window_(t, 129.0, 131.9, 0.3, 0.3);
    if (pOp > 0.01) {
      const sand = ramp(t, 129.2, 131.6, (f) => f), pts = [];
      for (let i = 0; i <= 120; i++) {
        const x = i / 120, ridge = Math.abs(Math.sin(x * Math.PI * 12));
        pts.push(`${(20 + x * 380).toFixed(1)},${(90 - (ridge * 46 * (1 - 0.82 * sand) + 8)).toFixed(1)}`);
      }
      ov.panel({ x: 64, y: 640, w: 460, op: pOp, html: `<h3>Flank profile<small>Illustrative, not measured</small></h3>
        <svg width="410" height="110"><path d="M${pts.join('L')}" fill="none" stroke="#3cc8ff" stroke-width="3"/><line x1="20" y1="98" x2="400" y2="98" stroke="#6f8193"/></svg>
        <div class="note">Layer ridges on the tooth flank: before → after sanding</div>` });
    }
  },
};
