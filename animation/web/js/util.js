// Small deterministic animation helpers. Every frame is a pure function of time t (seconds).

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, f) => a + (b - a) * f;
export const smooth = (f) => { f = clamp(f); return f * f * (3 - 2 * f); };
export const smoother = (f) => { f = clamp(f); return f * f * f * (f * (f * 6 - 15) + 10); };
export const easeOut = (f) => 1 - Math.pow(1 - clamp(f), 3);
export const easeIn = (f) => Math.pow(clamp(f), 3);
export const easeInOut = (f) => { f = clamp(f); return f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2; };

// Normalised progress of t through [a, b], eased.
export const ramp = (t, a, b, ease = smoother) => ease(b === a ? (t >= b ? 1 : 0) : (t - a) / (b - a));
// Fade in over [a, a+fi], hold, fade out over [b-fo, b].
export const window_ = (t, a, b, fi = 0.4, fo = 0.4) => Math.min(ramp(t, a, a + fi, smooth), 1 - ramp(t, b - fo, b, smooth));

// Piecewise keyframes: keys = [[t0, v0], [t1, v1], ...]; values may be numbers or arrays.
export function keys(t, ks, ease = smoother) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (t <= ks[i][0]) {
      const [t0, v0] = ks[i - 1], [t1, v1] = ks[i];
      const f = ease((t - t0) / (t1 - t0));
      return Array.isArray(v0) ? v0.map((x, j) => lerp(x, v1[j], f)) : lerp(v0, v1, f);
    }
  }
  return ks[ks.length - 1][1];
}

// Seeded PRNG (mulberry32) for repeatable "random" values.
export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
