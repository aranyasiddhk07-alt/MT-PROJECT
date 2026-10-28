// OPENING 0-8 s: reveal of the real assembled fan, then the title.
import { keys, ramp, smooth, window_, TAU, easeInOut } from '../util.js';
import { orbit } from './common.js';
import { RATIO } from '../fan.js';

const CRANK_RPS = 0.2;

export default {
  apply(t, ctx) {
    const { fan, ov } = ctx;
    // Crank turning gently; the propeller follows at the CAD gear ratio.
    fan.setCrank(TAU * CRANK_RPS * t + 0.6);
    fan.setAll('cad', { edges: keys(t, [[0, 0.18], [6, 0.18], [8, 0.55]]) });
    fan.setPropBlur(TAU * CRANK_RPS * RATIO);
    ctx.ground.position.y = -66;

    // Camera: close on the propeller hub, pulling back and round to a three-quarter view.
    const az = keys(t, [[0, 168], [4.4, 134], [8, 128]], easeInOut);
    const el = keys(t, [[0, 6], [4.4, 14], [8, 15]], easeInOut);
    const r = keys(t, [[0, 120], [4.4, 420], [8, 450]], easeInOut);
    const tgt = keys(t, [[0, [-16, 42, 0]], [4.4, [-4, 6, 0]], [8, [-4, 4, 0]]], easeInOut);
    const shx = keys(t, [[0, 0], [1.4, 0], [4.4, 340], [8, 350]], easeInOut);
    orbit(ctx, tgt, az, el, r, 30, [shx, 0]);
    ctx.setKey([-160, 240, 220], [0, 0, 0], 2.5);

    // Title block.
    const op = window_(t, 3.6, 8.0, 0.9, 0.6);
    if (op > 0.01) {
      const dy = (1 - ramp(t, 3.6, 4.8)) * 24;
      ov.html(`<div class="title" style="opacity:${op.toFixed(3)};transform:translateY(${dy.toFixed(1)}px)">
        <div class="h">CAD Model to<br>Finished Product</div>
        <div class="sub">Design &nbsp;|&nbsp; FDM Manufacturing &nbsp;|&nbsp; Assembly</div>
        <div class="line" style="opacity:${ramp(t, 4.6, 5.6, smooth).toFixed(3)}">A hand-cranked, gear-driven handheld fan &nbsp;·&nbsp; no motor &nbsp;·&nbsp; no battery</div>
      </div>`);
    }
    ov.badge('<b>Actual CAD geometry</b> · fan_A.1.igs', '', window_(t, 3.2, 8.0, 0.8, 0.5));
    ov.html(`<div class="foot" style="opacity:${window_(t, 3.6, 8.0, 0.8, 0.5).toFixed(3)}">Manufacturing Technology project · 3D-printed handheld fan</div>`);
  },
};
