// STAGE 4 · FDM PRINTING (84-120 s). A representative printer deposits the real sliced toolpaths.
//  84.0-92.4  printer and hot end: filament melted and pushed through the nozzle (schematic)
//  92.4-99.2  first layer of the compound gear, with the planned path beside it; layers 2-3
//  99.2-107   time-lapse: the 54T gear, then the 12T pinion, layer by layer
// 107-113.6   shell walls rising (time-lapse)
// 113.6-120   print complete, bed cools, parts come off
import * as THREE from 'three';
import { keys, ramp, smooth, window_, easeInOut, clamp, TAU } from '../util.js';
import { orbit } from './common.js';
import { roadMesh, PLATE_X } from '../roads.js';
import { makeBed } from '../bench.js';
import { Printer } from '../printer.js';
import { placeOnPlates, ORDER_IDS } from './slicing.js';

let printer, bedG, bedS, gear, shell, layerSvg, lastHot = { r: null, a: 0, b: 0 };
const BASE = new THREE.Color(0xe9e5de), HOT = new THREE.Color(0xff7a2a), _c = new THREE.Color(), _v = new THREE.Vector3();

function heat(road, n) {
  // Freshly laid filament glows briefly and cools along the path behind the nozzle.
  const W = 220;
  if (lastHot.r) for (let i = lastHot.a; i < lastHot.b; i++) lastHot.r.mesh.setColorAt(i, BASE);
  const a = Math.max(0, Math.floor(n) - W), b = Math.min(road.total, Math.ceil(n));
  for (let i = a; i < b; i++) road.mesh.setColorAt(i, _c.copy(BASE).lerp(HOT, Math.pow((i - a) / W, 3) * 0.85));
  if (road.mesh.instanceColor) road.mesh.instanceColor.needsUpdate = true;
  lastHot = { r: road, a, b };
}

function layerOf(road, n) {
  let k = 0;
  while (k + 1 < road.layerStart.length - 1 && road.layerStart[k + 1] <= n) k++;
  return k;
}

function svgLayer(p, layer, size, ox, oz) {
  // 2D toolpath of one layer, fitted into a size x size box (top view: x right, -py down).
  const L = p.layers[layer], s = size / 62;
  const d = { 0: [], 1: [], 2: [], 3: [] };
  for (const path of L.paths) {
    const pts = [];
    for (let i = 0; i < path.pts.length; i += 2) pts.push(`${(size / 2 + (path.pts[i] - ox) * s).toFixed(1)},${(size / 2 - (path.pts[i + 1] - oz) * s).toFixed(1)}`);
    (d[path.type] || d[3]).push('M' + pts.join('L') + (path.closed ? 'Z' : ''));
  }
  return { d, s };
}

export default {
  async setup(ctx) {
    printer = new Printer();
    bedG = makeBed(0); bedS = makeBed(0);
    const plates = ctx.plates;
    gear = roadMesh(plates.compound_gear);
    shell = roadMesh(plates.shell_side1);
    for (const r of [gear, shell]) { for (let i = 0; i < r.total; i++) r.mesh.setColorAt(i, BASE); r.mesh.instanceColor.needsUpdate = true; }
    ctx.scene.add(printer.group, gear.mesh, shell.mesh);
    Object.assign(ctx.objects, { printer: printer.group, gearRoads: gear.mesh, shellRoads: shell.mesh });
    layerSvg = svgLayer(plates.compound_gear, 0, 360, 0, 55);
  },

  apply(t, ctx, st) {
    const { fan, ov } = ctx;
    ov.grid = 0.25;
    ctx.ground.position.y = -24; ctx.ground.material.opacity = 0.3;
    const beds = ctx.objects.beds; beds.visible = true;
    const plates = ctx.plates;
    const gx = PLATE_X.mechanism, sx = PLATE_X.housing;

    // ---- progress of the gear print (instance index)
    const L0 = gear.layerStart[1], L3 = gear.layerStart[3];
    let wallEnd = 0;
    while (wallEnd < L0 && gear.seg[wallEnd][5] <= 1) wallEnd++;
    const nG = t < 92.4 ? 0 : t < 96.0 ? wallEnd * ramp(t, 92.4, 96.0, (f) => f)
      : t < 97.8 ? wallEnd + (L0 - wallEnd) * ramp(t, 96.0, 97.8, (f) => f)
        : t < 99.2 ? L0 + (L3 - L0) * ramp(t, 97.8, 99.2, (f) => f)
          : L3 + (gear.total - L3) * ramp(t, 99.2, 107.0, (f) => f * f * (3 - 2 * f) * 0.6 + f * 0.4);
    const nS = shell.total * keys(t, [[107, 0.25], [113.4, 1]], (f) => f);
    const shellPhase = t >= 107 && t < 113.6;
    const done = t >= 113.6;

    // ---- objects
    gear.mesh.visible = t >= 92.4 && t < 113.6 && !shellPhase;
    gear.mesh.count = Math.floor(nG);
    shell.mesh.visible = shellPhase;
    shell.mesh.count = Math.floor(nS);
    if (gear.mesh.visible && nG < gear.total) heat(gear, nG);
    if (shell.mesh.visible) heat(shell, nS);
    if (gear.mesh.visible && nG >= gear.total && lastHot.r === gear) heat(gear, 0);

    // Fan parts: only shown as finished prints at the end.
    if (done) {
      const lift = (id) => 60 * ramp(t, 118.4 + (ORDER_IDS.indexOf(id) % 6) * 0.08, 119.8, easeInOut);
      placeOnPlates(ctx, lift, 'printed', {});
    } else fan.group.visible = false;

    // ---- printer
    printer.group.visible = !done || t < 116.0;
    const onShell = shellPhase;
    printer.group.position.x = onShell ? sx : gx;
    let noz;
    if (t < 92.4) noz = gear.nozzleAt(0, _v).add(new THREE.Vector3(0, keys(t, [[84, 60], [91.5, 60], [92.4, 0.2]], easeInOut), 0));
    else if (!onShell && t < 113.6) noz = nG >= gear.total ? gear.nozzleAt(gear.total - 1, _v).add(new THREE.Vector3(0, 30 * ramp(t, 107.0, 108, smooth), 0)) : gear.nozzleAt(nG, _v);
    else if (onShell) noz = shell.nozzleAt(nS, _v);
    else noz = _v.set(gx, 120, 0);
    printer.setNozzle(noz.x - printer.group.position.x, Math.max(0.2, noz.y), noz.z);
    printer.heater.material.emissiveIntensity = 0.12 + 0.04 * Math.sin(t * 9);

    // ---- camera
    let az, el, r, tgt, shift = [0, 0];
    if (t < 92.4) {
      az = keys(t, [[84, 215], [88.4, 235], [92.4, 250]], easeInOut); el = keys(t, [[84, 22], [88.4, 18], [92.4, 30]], easeInOut);
      r = keys(t, [[84, 980], [88.4, 760], [92.4, 260]], easeInOut); tgt = keys(t, [[84, [gx, 150, 0]], [88.4, [gx, 120, 0]], [92.4, [gx, 6, -55]]], easeInOut);
      shift = [keys(t, [[84, 0], [86.4, -280], [91.4, -280], [92.4, 0]], easeInOut), 0];
    } else if (t < 99.2) {
      az = keys(t, [[92.4, 250], [99.2, 262]]); el = keys(t, [[92.4, 30], [99.2, 34]]); r = keys(t, [[92.4, 260], [99.2, 240]]);
      tgt = [gx, 4, -55]; shift = [keys(t, [[92.4, 0], [93.4, 250]], easeInOut), 0];
    } else if (t < 107) {
      az = keys(t, [[99.2, 262], [103, 300], [107, 320]], easeInOut); el = keys(t, [[99.2, 34], [103, 16], [107, 12]], easeInOut);
      r = keys(t, [[99.2, 240], [103, 150], [107, 170]], easeInOut); tgt = keys(t, [[99.2, [gx, 4, -55]], [103, [gx, 6, -55]], [107, [gx, 8, -55]]], easeInOut);
      shift = [keys(t, [[99.2, 250], [100.4, 0]], easeInOut), 0];
    } else if (t < 113.6) {
      az = keys(t, [[107, 200], [113.6, 220]]); el = keys(t, [[107, 40], [113.6, 44]]); r = keys(t, [[107, 330], [113.6, 360]]);
      tgt = [sx - 40, 8, 0];
    } else {
      az = keys(t, [[113.6, 245], [120, 260]]); el = keys(t, [[113.6, 48], [120, 40]]); r = keys(t, [[113.6, 720], [120, 640]], easeInOut); tgt = [0, 20, 0];
    }
    orbit(ctx, tgt, az, el, r, 30, shift);
    ctx.setKey([-150, 340, 200], [0, 0, 0], 2.3);

    ov.card(st, t);
    ov.badge('<b>Representative visualisation</b> · printer and filament not specified in the project files', 'illus', window_(t, 84.6, 119.8, 0.5, 0.4));

    // ---- hot end schematic
    const hOp = window_(t, 86.4, 92.2, 0.5, 0.4);
    if (hOp > 0.01) {
      const flow = ((t * 60) % 24).toFixed(1);
      ov.panel({ x: 1150, y: 200, w: 680, op: hOp, slide: 30, html: `
        <h3>Hot end · cross-section<small>Schematic. 0.4 mm nozzle and PLA are the report's assumed/recommended values</small></h3>
        <svg width="620" height="560" viewBox="0 0 620 560">
          <defs><linearGradient id="melt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ece8e0"/><stop offset="0.55" stop-color="#ffb070"/><stop offset="1" stop-color="#ff6a1f"/></linearGradient></defs>
          <circle cx="248" cy="80" r="34" fill="#4a525c" stroke="#8b939d" stroke-width="3" stroke-dasharray="7 5" transform="rotate(${(t * 140) % 360} 248 80)"/>
          <circle cx="372" cy="80" r="34" fill="#4a525c" stroke="#8b939d" stroke-width="3" stroke-dasharray="7 5" transform="rotate(${-(t * 140) % 360} 372 80)"/>
          <rect x="300" y="0" width="20" height="300" fill="#ece8e0"/>
          <line x1="310" y1="0" x2="310" y2="300" stroke="#9aa5b1" stroke-width="2" stroke-dasharray="6 18" stroke-dashoffset="${-flow}"/>
          <rect x="285" y="150" width="50" height="90" fill="none" stroke="#8b939d" stroke-width="3"/>
          <rect x="230" y="240" width="160" height="120" rx="6" fill="#ff4d1a" fill-opacity="${(0.25 + 0.08 * Math.sin(t * 9)).toFixed(3)}" stroke="#ff8a4a" stroke-width="3"/>
          <rect x="300" y="240" width="20" height="130" fill="url(#melt)"/>
          <path d="M270 360 L350 360 L318 420 L302 420 Z" fill="#c8a050"/>
          <rect x="304" y="420" width="12" height="40" fill="#ff7a2a"/>
          <path d="M310 460 Q 320 500 420 500 L 600 500" stroke="#ff9a4a" stroke-width="14" fill="none" stroke-linecap="round"/>
          <rect x="0" y="512" width="620" height="16" fill="#2a3038"/>
          <g font-family="Inter" font-size="21" fill="#e9eff6">
            <text x="20" y="40">Filament</text><text x="420" y="88">Drive gears</text>
            <text x="20" y="200">Heat break</text><text x="404" y="306" fill="#ffad33">Heater block</text>
            <text x="20" y="306" fill="#ffb070">Melt zone</text><text x="20" y="400">Nozzle</text>
            <text x="440" y="480" fill="#ffad33">Molten road</text><text x="20" y="550" fill="#a9b8c8">Bed / previous layer</text>
          </g></svg>` });
    }

    // ---- first layer: planned path (left) vs. deposition (3D)
    const pOp = window_(t, 92.8, 99.2, 0.5, 0.4);
    if (pOp > 0.01) {
      const p0 = gear.nozzleAt(Math.min(nG, L0 - 1), _v);
      const pl = plates.compound_gear;
      const mx = 180 + (p0.x - gx - 0) * layerSvg.s, my = 180 - (-p0.z - 55) * layerSvg.s;
      const col = { 0: '#ff9f1c', 1: '#ffd166', 2: '#ef476f', 3: '#4cc9f0' };
      ov.panel({ x: 64, y: 200, w: 420, op: pOp, slide: -30, html: `
        <h3>Planned path<small>Slicer toolpath, layer 1 of ${pl.layers.length}</small></h3>
        <svg width="360" height="360">${Object.entries(layerSvg.d).map(([k, ds]) => ds.map((d) => `<path d="${d}" fill="none" stroke="${col[k]}" stroke-width="${k === '3' ? 0.7 : 1.3}" opacity="0.85"/>`).join('')).join('')}
        ${nG < L0 ? `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="7" fill="#fff" stroke="#ff7a2a" stroke-width="3"/>` : ''}</svg>
        <div class="note">Outer wall first, then inner walls, then solid skin</div>` });
    }
    // ---- layer counter
    const cOp = window_(t, 93.0, 106.8, 0.4, 0.4);
    if (cOp > 0.01) {
      const k = layerOf(gear, nG), pl = plates.compound_gear;
      const z = pl.layers[Math.min(k, pl.layers.length - 1)].z;
      ov.panel({ x: 1430, y: 760, w: 420, op: cOp, html: `<div class="row"><span class="k">Layer</span><span class="v">${String(k + 1).padStart(2, ' ')} / ${pl.layers.length}</span></div>
        <div class="row"><span class="k">Z height</span><span class="v">${z.toFixed(2)} mm</span></div>
        <div class="row"><span class="k">Layer height</span><span class="v">${pl.layer.toFixed(2)} mm <span style="color:#ffad33">(assumed)</span></span></div>` });
    }
    const zt = window_(t, 97.8, 99.4, 0.3, 0.3);
    if (zt > 0.01) {
      const s = ov.proj(_v.copy(gear.nozzleAt(nG, new THREE.Vector3())).add(new THREE.Vector3(0, 8, 0)));
      ov.tag({ at: { x: s.x + 90, y: s.y - 60 }, text: `nozzle +${plates.compound_gear.layer.toFixed(2)} mm`, op: zt, cls: 'amber' });
    }
    ov.label({ anchor: null, at: { x: 960, y: 230 }, text: 'Additive: material only where the part is', sub: 'teeth first (54 T gear), then the 12 T pinion on top', op: window_(t, 101.0, 106.8, 0.5, 0.4), side: 'bottom' });
    ov.label({ anchor: null, at: { x: 960, y: 230 }, text: 'Front shell half · walls rising', sub: '0.20 mm layers (assumed) leave fine layer lines', op: window_(t, 107.6, 113.4, 0.5, 0.4), side: 'bottom' });
    if (t > 107 && t < 113.6) {
      const k = layerOf(shell, nS);
      ov.tag({ at: { x: 1640, y: 820 }, text: `Layer ${k + 1} / ${plates.shell_side1.layers.length}`, op: window_(t, 107.4, 113.4, 0.4, 0.3) });
    }

    // ---- cooling
    const kOp = window_(t, 114.0, 119.8, 0.5, 0.3);
    if (kOp > 0.01) {
      const cool = ramp(t, 114.6, 117.8, (f) => f);
      const col = `rgb(${Math.round(255 - 160 * cool)},${Math.round(110 + 80 * cool)},${Math.round(60 + 190 * cool)})`;
      ov.panel({ x: 64, y: 230, w: 470, op: kOp, slide: -30, html: `<h3>Print complete<small>Parts come off once the bed has cooled</small></h3>
        <div style="display:flex;align-items:center;gap:16px;margin-top:8px"><span style="font-size:20px;color:#a9b8c8">Bed</span>
        <div style="flex:1;height:14px;border-radius:7px;background:#222a33;overflow:hidden"><div style="width:${(100 - 80 * cool).toFixed(1)}%;height:100%;background:${col}"></div></div>
        <span class="mono" style="color:${col}">${cool < 0.98 ? 'cooling' : 'cool'}</span></div>
        <div class="note">All 12 parts printed: 2 plates</div>` });
    }
  },
};
