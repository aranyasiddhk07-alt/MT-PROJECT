// STAGE 3 · SLICING (60-84 s)
// 60.0-70.2  parts placed on two 220 x 220 mm plates in the report's build orientations
// 70.2-77.0  the slice plane rises: real cross-sections become layered toolpaths; close-up of one gear layer
// 77.0-84.0  assumed starting values (report 5.2); supports only where the overhang check finds them
import * as THREE from 'three';
import { keys, ramp, smooth, window_, easeInOut, clamp } from '../util.js';
import { orbit } from './common.js';
import { loadPlates, linePreview, TYPE_COLORS, TYPE_NAMES, PLATE_X } from '../roads.js';
import { makePlates } from '../bench.js';

let plates, preview, previewGear, beds;
const NOTE = {
  shell_side1: 'Shells: open side up', gear_input: 'Gears: flat', pinion_output: 'Pinion & shafts: upright',
  crank_handle: 'Crank: flat', propeller: 'Propeller: hub down + brim',
};
const ORDER = ['shell_side1', 'shell_side2', 'crank_handle', 'gear_input', 'compound_gear', 'propeller', 'pinion_output', 'crank_shaft', 'prop_shaft', 'pin_idler_a', 'pin_idler_b', 'pin_prop'];
const _m = new THREE.Matrix4(), _v = new THREE.Vector3();

export function placeOnPlates(ctx, drop = () => 0, mode = 'cad', opts = {}) {
  const { fan } = ctx;
  fan.setMode('cap', 'hidden');
  for (const id of ORDER) {
    const p = fan.parts[id], w = plates[id].world;
    p.root.matrixAutoUpdate = false;
    _m.makeTranslation(0, drop(id), 0).multiply(w);
    p.root.matrix.copy(_m);
    fan.setMode(id, mode, typeof opts === 'function' ? opts(id) : opts);
  }
}
export const platesData = () => plates;
export const ORDER_IDS = ORDER;

export default {
  async setup(ctx) {
    plates = await loadPlates();
    ctx.plates = plates;
    beds = makePlates();
    preview = linePreview(Object.values(plates));
    previewGear = linePreview([plates.compound_gear]);
    ctx.scene.add(beds, preview, previewGear);
    Object.assign(ctx.objects, { beds, preview, previewGear });
    ctx.objects.beds = beds;
  },

  apply(t, ctx, st) {
    const { fan, ov } = ctx;
    ov.grid = 0.4;
    ctx.ground.position.y = -4.2;
    ctx.ground.material.opacity = 0.25;
    beds.visible = true;

    // Drop parts onto the plates.
    const drop = (id) => {
      const k = ORDER.indexOf(id);
      return 140 * (1 - ramp(t, 61.0 + k * 0.32, 62.6 + k * 0.32, easeInOut));
    };
    const cut = keys(t, [[70.4, 0], [75.6, 26], [77.4, 26], [80.0, 30]], easeInOut); // slice plane height (mm)
    const slicing = t > 70.3;
    const clipAbove = new THREE.Plane(new THREE.Vector3(0, 1, 0), -cut);
    placeOnPlates(ctx, drop, slicing ? 'ghost' : 'cad', () => (slicing ? { opacity: 0.12 } : { edges: 0.7 }));
    if (slicing) {
      // CAD solid above the plane, toolpaths below.
      for (const id of ORDER) {
        const m = fan.parts[id].mats.ghost; m.clippingPlanes = [clipAbove];
      }
    } else for (const id of ORDER) fan.parts[id].mats.ghost.clippingPlanes = [];
    preview.visible = slicing;
    preview.userData.clip.constant = cut;
    // A focus copy of the compound gear's toolpaths, used for the close-up.
    previewGear.visible = false;

    // Slice plane.
    if (slicing && t < 77.6) {
      if (!ctx.objects.slicePlane) {
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(500, 250), new THREE.MeshBasicMaterial({ color: 0x3cc8ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
        pl.rotation.x = -Math.PI / 2; ctx.scene.add(pl); ctx.objects.slicePlane = pl;
      }
      const pl = ctx.objects.slicePlane; pl.visible = true; pl.position.y = cut + 0.05;
      pl.material.opacity = 0.1 * window_(t, 70.3, 77.6, 0.4, 0.5);
    }

    // Camera.
    let az, el, r, tgt;
    if (t < 70.3) {
      az = keys(t, [[60, 235], [70.3, 250]]); el = keys(t, [[60, 52], [70.3, 42]]); r = keys(t, [[60, 760], [64, 700], [70.3, 680]], easeInOut); tgt = [0, 0, 0];
    } else if (t < 77.2) {
      az = keys(t, [[70.3, 250], [73.4, 245], [75.4, 232], [77.2, 230]], easeInOut);
      el = keys(t, [[70.3, 42], [73.4, 34], [75.4, 46], [77.2, 50]], easeInOut);
      r = keys(t, [[70.3, 680], [73.4, 520], [75.4, 200], [77.2, 200]], easeInOut);
      tgt = keys(t, [[70.3, [0, 0, 0]], [73.4, [60, 8, -20]], [75.4, [125, 4, -55]], [77.2, [125, 4, -55]]], easeInOut);
    } else {
      az = keys(t, [[77.2, 230], [79, 250], [84, 258]], easeInOut); el = keys(t, [[77.2, 50], [79, 36], [84, 34]], easeInOut);
      r = keys(t, [[77.2, 200], [79, 420], [84, 440]], easeInOut); tgt = keys(t, [[77.2, [125, 4, -55]], [79, [-150, 0, 0]], [84, [-150, 0, 0]]], easeInOut);
    }
    const shift = t > 77.2 ? [keys(t, [[77.2, 0], [79, 330]], easeInOut), 0] : [0, 0];
    orbit(ctx, tgt, az, el, r, 30, shift);
    ctx.setKey([-120, 320, 160], [0, 0, 0], 2.2);

    ov.card(st, t, 'What does slicing add?');
    ov.badge(t < 77 ? '<b>Real part outlines</b> · sliced for this video, report orientations' : '<b>Assumed values</b> · report §5.2', t < 77 ? '' : 'illus', window_(t, 61, 83.8, 0.5, 0.4));

    // Orientation notes.
    if (t > 62.6 && t < 70.4) {
      for (const [id, txt] of Object.entries(NOTE)) {
        const p = plates[id], m = p.world;
        const c = _v.set(0, 0, 0);
        const bb = fan.parts[id].geom.boundingBox; bb.getCenter(c); c.applyMatrix4(fan.parts[id].root.matrix);
        const s = ov.proj(c);
        const k = Object.keys(NOTE).indexOf(id);
        const up = ['shell_side1', 'gear_input', 'pinion_output'].includes(id);
        ov.label({ anchor: s, at: { x: s.x + (up ? 0 : 0), y: s.y + (up ? -120 : 120) }, text: txt, op: window_(t, 63.2 + k * 0.5, 70.3, 0.4, 0.4), side: up ? 'bottom' : 'top' });
      }
      const plOp = window_(t, 62.0, 70.3, 0.5, 0.4);
      for (const [pl, name] of [['housing', 'Plate A · housing'], ['mechanism', 'Plate B · mechanism']]) {
        const s = ov.proj(_v.set(PLATE_X[pl], 0, 125));
        ov.tag({ at: { x: s.x, y: s.y + 26 }, text: `${name} · 220 × 220 mm`, op: plOp, cls: 'cyan' });
      }
    }

    // Layer counter + legend during slicing.
    const lgOp = window_(t, 71.0, 77.0, 0.4, 0.4);
    if (lgOp > 0.01) {
      ov.panel({ x: 64, y: 250, w: 360, op: lgOp, slide: -30, html: `<h3>Toolpaths<small>per layer, from the real cross-sections</small></h3>
        <div class="legend">${TYPE_NAMES.map((n, i) => `<div><i style="background:#${TYPE_COLORS[i].toString(16).padStart(6, '0')}"></i>${n}</div>`).join('')}</div>
        <div class="note">Plane at Z = ${cut.toFixed(1)} mm</div>` });
    }
    // Close-up callout on the compound gear layer.
    const gOp = window_(t, 75.2, 77.2, 0.3, 0.3);
    if (gOp > 0.01) {
      const s = ov.proj(_v.set(PLATE_X.mechanism, cut, -55));
      ov.label({ anchor: null, at: { x: 1380, y: 300 }, text: 'Compound gear · one layer', sub: 'walls trace every tooth, then infill fills the inside', op: gOp, side: 'bottom' });
    }

    // Assumed settings panel and support finding.
    const sOp = window_(t, 77.6, 84, 0.5, 0.3);
    ov.panel({ x: 64, y: 230, w: 720, op: sOp, slide: -30, html: `
      <h3>Starting values<small>Assumed in the report (§5.2), not recorded settings</small></h3>
      <div class="row"><span class="k"></span><span class="v" style="color:#a9b8c8">Shells · Gears/shafts · Propeller</span></div>
      <div class="row"><span class="k">Layer height</span><span class="v">0.20 · 0.12–0.16 · 0.12 mm</span></div>
      <div class="row"><span class="k">Walls</span><span class="v">3 · 4 · 3</span></div>
      <div class="row"><span class="k">Infill</span><span class="v">20 · 50–100 · 30 %</span></div>
      <div class="row"><span class="k">Supports</span><span class="v">only where an overhang needs them</span></div>` });
    const supOp = window_(t, 79.6, 84, 0.5, 0.3);
    if (supOp > 0.01) {
      const s = ov.proj(_v.set(PLATE_X.housing + 40, 1, 0));
      ov.label({ anchor: s, at: { x: s.x + 40, y: 830 }, text: 'Back shell: 2 mm support under its face', sub: 'its two outer shaft bosses stand 2 mm proud, so the face overhangs', op: supOp, side: 'top', cls: 'amber', color: '#b388ff' });
    }
  },
};
