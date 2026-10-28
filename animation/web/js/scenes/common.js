// Helpers shared by the stage scenes.
import * as THREE from 'three';
import { DEG, clamp } from '../util.js';

// Camera on a sphere around target: azimuth in the XZ plane (deg, 180 = looking from -X, the crank side),
// elevation (deg), distance r. shift moves the image on screen (pixels) so models can sit off-centre.
export function orbit(ctx, target, az, el, r, fov = 30, shift = [0, 0]) {
  const a = az * DEG, e = el * DEG;
  const pos = [target[0] + r * Math.cos(a) * Math.cos(e), target[1] + r * Math.sin(e), target[2] + r * Math.sin(a) * Math.cos(e)];
  ctx.setCam(pos, target, fov);
  const cam = ctx.camera;
  if (shift[0] || shift[1]) cam.setViewOffset(1920, 1080, -shift[0], -shift[1], 1920, 1080);
  else cam.clearViewOffset();
  cam.updateProjectionMatrix();
}

const _v = new THREE.Vector3();

// Project a CAD-frame point carried by a fan part to the screen.
export function projPart(ctx, id, xyz) {
  return ctx.ov.proj(ctx.fan.pointWorld(id, xyz, _v));
}

// A rotation arrow drawn as a projected 3D circle arc about an axis parallel to CAD X.
// centre: CAD point on the axis; r: radius (mm); a0..a1: angles (rad) in the YZ plane; dir +1/-1.
export function axisArc(ctx, frameId, centre, r, a0, a1, opts = {}) {
  const pts = [];
  const n = 36;
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    pts.push(projPart(ctx, frameId, [centre[0], centre[1] + r * Math.cos(a), centre[2] + r * Math.sin(a)]));
  }
  const ov = ctx.ov;
  const { color = '#ffad33', w = 3.5, op = 1, head = 16 } = opts;
  if (op <= 0.01) return;
  ov.poly(pts, { color, w, op });
  const b = pts[n], a = pts[n - 2];
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const p1 = { x: b.x - head * Math.cos(ang - 0.5), y: b.y - head * Math.sin(ang - 0.5) };
  const p2 = { x: b.x - head * Math.cos(ang + 0.5), y: b.y - head * Math.sin(ang + 0.5) };
  ov.poly([p1, b, p2], { color, w, op, fill: color, close: true });
}

// Lay out labels in a horizontal row without overlaps. items: {anchor(s), x, text, sub, op}.
export function labelRow(ov, items, y, side, { minX = 90, maxX = 1830, gap = 18 } = {}) {
  const width = (it) => Math.max(it.text.length * 12.2, (it.sub || '').length * 9.2) + 34;
  const its = items.filter((i) => i.op > 0.01).map((i) => ({ ...i, w: width(i) }));
  its.sort((a, b) => a.x - b.x);
  for (let i = 0; i < its.length; i++) {
    its[i].x = clamp(its[i].x, minX + its[i].w / 2, maxX - its[i].w / 2);
    if (i > 0) {
      const need = its[i - 1].x + its[i - 1].w / 2 + gap + its[i].w / 2;
      if (its[i].x < need) its[i].x = need;
    }
  }
  // Push back from the right edge if the row overflowed.
  for (let i = its.length - 1; i >= 0; i--) {
    const lim = i === its.length - 1 ? maxX - its[i].w / 2 : its[i + 1].x - its[i + 1].w / 2 - gap - its[i].w / 2;
    if (its[i].x > lim) its[i].x = lim;
  }
  for (const it of its) {
    const anchors = Array.isArray(it.anchor) ? it.anchor : [it.anchor];
    anchors.forEach((a, k) => ov.label({ anchor: a, at: { x: it.x, y }, text: k === 0 ? it.text : '', sub: k === 0 ? it.sub : '', op: it.op, side, cls: (it.cls || '') + (k ? ' plain' : ''), color: it.color }));
  }
}
