// Immediate-mode HTML/SVG overlay: each frame, scenes describe what is on screen and end() writes it.
import * as THREE from 'three';
import { clamp, smooth, ramp } from './util.js';

const W = 1920, H = 1080;
const esc = (s) => String(s);

export class Overlay {
  constructor(camera) {
    this.camera = camera;
    this.ui = document.getElementById('ui');
    this.svgEl = document.getElementById('svg');
    this.bg = document.getElementById('bg');
    this.fadeEl = document.getElementById('fade');
    this.v = new THREE.Vector3();
  }

  begin() { this.h = []; this.s = []; this.grid = 0; this.fade = 0; }

  end() {
    this.ui.innerHTML = this.h.join('');
    this.svgEl.innerHTML = this.s.join('');
    this.bg.style.setProperty('--grid', this.grid.toFixed(3));
    this.fadeEl.style.opacity = this.fade.toFixed(3);
  }

  html(str) { this.h.push(str); }
  svg(str) { this.s.push(str); }

  // World -> screen pixels.
  proj(v) {
    this.v.copy(v).project(this.camera);
    return { x: (this.v.x + 1) / 2 * W, y: (1 - this.v.y) / 2 * H, z: this.v.z };
  }

  // A label with a leader line from a screen-space anchor {x, y} to the label box at {x, y}.
  // side: which side of the box the leader attaches to ('bottom' | 'top' | 'left' | 'right').
  label({ anchor, at, text, sub = '', op = 1, side = 'bottom', cls = '', color = '#3cc8ff' }) {
    if (op <= 0.01) return;
    const o = op.toFixed(3);
    let tx = 'translate(-50%,-100%)', ex = at.x, ey = at.y;
    if (side === 'top') tx = 'translate(-50%,0)';
    if (side === 'left') { tx = 'translate(0,-50%)'; }
    if (side === 'right') { tx = 'translate(-100%,-50%)'; }
    this.h.push(`<div class="lbl ${cls}" style="left:${at.x}px;top:${at.y}px;opacity:${o};transform:${tx}">${esc(text)}${sub ? `<span class="s">${sub}</span>` : ''}</div>`);
    if (anchor) {
      const mx = side === 'bottom' || side === 'top' ? ex : anchor.x;
      const my = side === 'bottom' || side === 'top' ? anchor.y : ey;
      this.s.push(`<g opacity="${o}"><path d="M${anchor.x.toFixed(1)},${anchor.y.toFixed(1)} L${mx.toFixed(1)},${my.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.6" stroke-opacity="0.85"/>` +
        `<circle cx="${anchor.x.toFixed(1)}" cy="${anchor.y.toFixed(1)}" r="5" fill="#0a1017" stroke="${color}" stroke-width="2.2"/></g>`);
    }
  }

  tag({ at, text, op = 1, cls = '', center = true }) {
    if (op <= 0.01) return;
    this.h.push(`<div class="tag ${cls}" style="left:${at.x}px;top:${at.y}px;opacity:${op.toFixed(3)};transform:${center ? 'translate(-50%,-50%)' : 'none'}">${text}</div>`);
  }

  panel({ x, y, w, html, op = 1, slide = 0 }) {
    if (op <= 0.01) return;
    this.h.push(`<div class="panel" style="left:${x}px;top:${y}px;${w ? `width:${w}px;` : ''}opacity:${op.toFixed(3)};transform:translateX(${(slide * (1 - op)).toFixed(1)}px)">${html}</div>`);
  }

  // Persistent stage header (top left).
  chapter(stage, op) {
    if (!stage.n || op <= 0.01) return;
    this.h.push(`<div class="chapter" style="opacity:${op.toFixed(3)}"><span class="num">STAGE ${stage.n} / 6</span><span class="name">${stage.label}</span></div>`);
  }

  // Large chapter card at a stage change, with an optional guiding question.
  card(stage, t, q = '') {
    const lt = t - stage.start;
    const op = Math.min(ramp(lt, 0, 0.5, smooth), 1 - ramp(lt, 2.3, 2.9, smooth));
    if (op <= 0.01) return;
    const dx = (1 - ramp(lt, 0, 0.7)) * -40;
    this.h.push(`<div class="card" style="opacity:${op.toFixed(3)};transform:translateX(${dx.toFixed(1)}px)">
      <div class="n">0${stage.n}</div><div class="t">${stage.label}</div><div class="rule"></div>${q ? `<div class="q">${q}</div>` : ''}</div>`);
  }

  // Provenance badge (top right): what kind of evidence the picture shows.
  badge(text, kind = '', op = 1) {
    if (op <= 0.01) return;
    this.h.push(`<div class="badge ${kind}" style="opacity:${op.toFixed(3)}">${text}</div>`);
  }

  // Six-stage progress indicator.
  progress(t, stages, op) {
    if (op <= 0.01) return;
    const segs = stages.filter((s) => s.n).map((s) => {
      const f = clamp((t - s.start) / (s.end - s.start));
      const cls = t >= s.end ? 'done' : t >= s.start ? 'on' : '';
      return `<div class="seg ${cls}"><div class="bar"><i style="width:${(f * 100).toFixed(2)}%"></i></div><div class="lab"><span>${s.n}</span>${s.label}</div></div>`;
    });
    this.h.push(`<div class="progress" style="opacity:${op.toFixed(3)}">${segs.join('')}</div>`);
  }

  // SVG helpers.
  line(a, b, { color = '#3cc8ff', w = 2, op = 1, dash = '' } = {}) {
    if (op <= 0.01) return;
    this.s.push(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${color}" stroke-width="${w}" stroke-opacity="${op.toFixed(3)}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`);
  }

  poly(pts, { color = '#3cc8ff', w = 2, op = 1, fill = 'none', close = false, dash = '' } = {}) {
    if (op <= 0.01 || pts.length < 2) return;
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('') + (close ? 'Z' : '');
    this.s.push(`<path d="${d}" fill="${fill}" stroke="${color}" stroke-width="${w}" stroke-opacity="${op.toFixed(3)}" fill-opacity="${op.toFixed(3)}" stroke-linecap="round" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`);
  }

  // Arrow head at b pointing from a.
  arrow(a, b, { color = '#ffad33', w = 3, op = 1, head = 14 } = {}) {
    if (op <= 0.01) return;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const p1 = { x: b.x - head * Math.cos(ang - 0.45), y: b.y - head * Math.sin(ang - 0.45) };
    const p2 = { x: b.x - head * Math.cos(ang + 0.45), y: b.y - head * Math.sin(ang + 0.45) };
    this.line(a, b, { color, w, op });
    this.poly([p1, b, p2], { color, w, op, fill: color, close: true });
  }

  // Curved rotation arrow (screen-space ellipse arc) around centre c.
  arc(c, rx, ry, a0, a1, { color = '#ffad33', w = 3.5, op = 1, head = 15 } = {}) {
    if (op <= 0.01) return;
    const n = 40, pts = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      pts.push({ x: c.x + rx * Math.cos(a), y: c.y + ry * Math.sin(a) });
    }
    this.poly(pts, { color, w, op });
    const b = pts[n], a = pts[n - 3];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const p1 = { x: b.x - head * Math.cos(ang - 0.5), y: b.y - head * Math.sin(ang - 0.5) };
    const p2 = { x: b.x - head * Math.cos(ang + 0.5), y: b.y - head * Math.sin(ang + 0.5) };
    this.poly([p1, b, p2], { color, w, op, fill: color, close: true });
  }

  // Dimension line between screen points with a centred value tag.
  dim(a, b, text, { color = '#3cc8ff', op = 1, off = 0 } = {}) {
    if (op <= 0.01) return;
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L * off, ny = dx / L * off;
    const A = { x: a.x + nx, y: a.y + ny }, B = { x: b.x + nx, y: b.y + ny };
    this.line(a, A, { color, w: 1.2, op: op * 0.6 });
    this.line(b, B, { color, w: 1.2, op: op * 0.6 });
    this.arrow({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }, A, { color, w: 1.8, op, head: 11 });
    this.arrow({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }, B, { color, w: 1.8, op, head: 11 });
    this.tag({ at: { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }, text, op, cls: 'cyan' });
  }
}
