// CLOSING 172-180 s: the assembled CAD model, the six-stage chain, one closing statement.
import { keys, ramp, smooth, window_, easeInOut, TAU } from '../util.js';
import { orbit } from './common.js';
import { RATIO } from '../fan.js';

const CHAIN = ['CAD', 'STL', 'Slicing', 'FDM Printing', 'Finishing', 'Assembly & Test'];

export default {
  apply(t, ctx) {
    const { fan, ov } = ctx;
    fan.setAll('cad', { edges: keys(t, [[172, 0.5], [175, 0.25]]) });
    const rps = 0.25;
    fan.setCrank(TAU * rps * (t - 172) + 1.1);
    fan.setPropBlur(TAU * rps * RATIO);
    ctx.ground.position.y = -66;
    const az = keys(t, [[172, 205], [177.5, 132], [180, 128]], easeInOut);
    const el = keys(t, [[172, 22], [177.5, 15], [180, 15]], easeInOut);
    orbit(ctx, [-4, 6, 0], az, el, keys(t, [[172, 520], [180, 470]], easeInOut), 30, [keys(t, [[172, 0], [175, 330]], easeInOut), -40]);
    ctx.setKey([-160, 260, 220], [0, 0, 0], 2.5);

    const sOp = window_(t, 174.4, 181, 0.8, 0.1);
    ov.html(`<div class="title" style="top:300px;opacity:${sOp.toFixed(3)}">
      <div class="h" style="font-size:78px">One digital model.<br>Six stages.<br>No tooling.</div>
      <div class="line">A hand-cranked, gear-driven fan, designed for FDM from the team's CAD.</div></div>`);
    const items = CHAIN.map((c, i) => {
      const op = ramp(t, 172.6 + i * 0.32, 173.1 + i * 0.32, smooth);
      return `<span style="opacity:${op.toFixed(3)}">${c}</span>` + (i < CHAIN.length - 1 ? `<span class="arrow" style="opacity:${op.toFixed(3)}">→</span>` : '');
    });
    ov.html(`<div class="chain">${items.join('')}</div>`);
    ov.fade = 0.85 * ramp(t, 179.3, 180.0, smooth);
  },
};
