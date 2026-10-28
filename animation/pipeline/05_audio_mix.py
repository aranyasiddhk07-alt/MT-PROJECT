"""Synthesise sound effects and a quiet music bed, then mix them under the narration.

Everything is generated here (no third-party audio). Event times follow the scene code in
animation/web/js/scenes. Output: animation/audio/final_mix.wav (48 kHz stereo, exactly 180.000 s).
Gear ticks use the real tooth-passing rate: crank rev/s x 54 teeth.
"""
import json
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

ROOT = Path(__file__).resolve().parents[2]
SR = 48000
DUR = 180.0
N = int(SR * DUR)
rng = np.random.default_rng(11)
t_all = np.arange(N) / SR


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def env(n, a=0.005, r=0.08):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


def seg(a, b):
    return slice(int(a * SR), min(N, int(b * SR)))


def add(buf, start, x, gain=1.0):
    s = int(start * SR)
    if s >= N:
        return
    x = x[: N - s]
    buf[s:s + len(x)] += gain * x


def click(freq=2400, dur=0.012, noise=0.6):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * tt) * np.exp(-tt * 380) + noise * rng.standard_normal(n) * np.exp(-tt * 700)
    return bp(x, 600, 7000) * env(n, 0.0005, 0.004)


def thud(freq=180, dur=0.16):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * tt * (1 - 0.3 * tt / dur)) * np.exp(-tt * 28) + 0.3 * lp(rng.standard_normal(n), 900) * np.exp(-tt * 40)
    return x * env(n, 0.001, 0.03)


def whoosh(dur=0.9, lo=300, hi=4000):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    steps = 24
    for k in range(steps):
        a, b = k * n // steps, (k + 1) * n // steps
        f = lo * (hi / lo) ** (k / steps)
        out[a:b] = bp(x[a:b + 200][: b - a], f * 0.7, min(f * 1.4, 20000))
    tt = np.linspace(0, 1, n)
    return out * np.sin(np.pi * tt) ** 2


def gear_ticks(buf, a, b, rps_fn, teeth=54, gain=0.05):
    """Tooth-mesh ticks; rate = crank rev/s x teeth (first stage)."""
    ph, t = 0.0, a
    dt = 1 / 2000
    k = 0
    while t < b:
        rate = rps_fn(t) * teeth
        ph += rate * dt
        if ph >= 1:
            ph -= 1
            add(buf, t, click(1800 + 500 * (k % 3), 0.01, 0.5), gain * (0.8 + 0.4 * rng.random()))
            k += 1
        t += dt


def airflow(buf, a, b, speed_fn, gain=0.02):
    """Soft broadband air noise, level following propeller speed (no motor whine)."""
    s = seg(a, b)
    n = s.stop - s.start
    x = bp(rng.standard_normal(n), 250, 2500)
    tt = t_all[s]
    lvl = np.array([speed_fn(v) for v in tt[::480]])
    lvl = np.interp(np.arange(n), np.arange(0, n, 480)[: len(lvl)], lvl)
    buf[s] += gain * x * lvl


def ramp_rps(t, t0, rps, ta):
    return 0 if t < t0 else rps * min(1, (t - t0) / ta)


def main():
    fx = np.zeros(N)
    # Opening and closing: gentle cranking.
    gear_ticks(fx, 0.0, 8.0, lambda t: 0.2, gain=0.035)
    airflow(fx, 0.0, 8.0, lambda t: 0.5, 0.012)
    gear_ticks(fx, 172.0, 180.0, lambda t: 0.25, gain=0.035)
    airflow(fx, 172.0, 180.0, lambda t: 0.55, 0.012)
    # Stage 1 gear train (0.12 rev/s, slowed for clarity).
    gear_ticks(fx, 21.9, 41.8, lambda t: ramp_rps(t, 21.9, 0.12, 1.2), gain=0.05)
    airflow(fx, 29.0, 41.8, lambda t: 0.35 * min(1, (t - 29) / 2), 0.012)
    # Explode / collapse movements.
    for t0 in (13.6, 20.9):
        add(fx, t0, whoosh(1.6, 200, 2500), 0.05)
    # Stage transitions.
    for t0 in (8.0, 42.0, 60.0, 84.0, 120.0, 142.0, 172.0):
        add(fx, t0 - 0.25, whoosh(0.9, 300, 5000), 0.07)
    # STL: file chips and check ticks.
    for k in range(12):
        add(fx, 44.6 + k * 0.12, click(3200, 0.02, 0.1), 0.05)
    for t0 in (55.2, 56.0, 56.8, 58.6):
        add(fx, t0 + 0.15, click(2600, 0.03, 0.05), 0.09)
    add(fx, 50.0, whoosh(2.2, 400, 6000), 0.03)
    # Slicing: parts settle on the plates; the slice plane sweeps.
    for k in range(12):
        add(fx, 62.6 + k * 0.32, thud(160 + 20 * (k % 4), 0.14), 0.07)
    add(fx, 70.4, whoosh(5.2, 200, 1200), 0.03)
    # Printing: stepper hum and part-cooling fan while the printer moves.
    s = seg(86.0, 116.0)
    n = s.stop - s.start
    tt = t_all[s]
    hum = 0.5 * np.sin(2 * np.pi * (420 + 80 * np.sin(tt * 3.1)) * tt) + 0.3 * np.sin(2 * np.pi * (630 + 110 * np.sin(tt * 2.3 + 1)) * tt)
    hum += 0.6 * bp(rng.standard_normal(n), 300, 3000)
    lvl = np.clip((tt - 86) / 1.5, 0, 1) * np.clip((116 - tt) / 1.5, 0, 1) * np.where((tt > 92.4) & (tt < 113.6), 1.0, 0.45)
    fx[s] += 0.018 * hum * lvl
    for k in range(20):
        add(fx, 118.4 + k * 0.07, click(1400, 0.02, 0.8), 0.05)  # parts popping off the bed
    # Finishing: knife, sanding strokes, reaming, drop, balance spins.
    for k in range(9):
        add(fx, 126.0 + k * 0.2, hp(rng.standard_normal(int(0.12 * SR)), 2500) * env(int(0.12 * SR), 0.01, 0.06), 0.05)
    s = seg(129.2, 131.6)
    n = s.stop - s.start
    tt = t_all[s]
    fx[s] += 0.06 * bp(rng.standard_normal(n), 800, 6000) * (0.5 + 0.5 * np.abs(np.sin(np.pi * 1.6 * (tt - 129.0))))
    s = seg(132.4, 134.6)
    n = s.stop - s.start
    tt = t_all[s]
    fx[s] += 0.05 * bp(rng.standard_normal(n), 150, 1200) * (0.6 + 0.4 * np.sin(2 * np.pi * 1.2 * tt))
    n = int(0.25 * SR)
    tt = np.arange(n) / SR
    add(fx, 135.8, np.sin(2 * np.pi * (900 + 1400 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 18), 0.06)
    for a, b in ((137.0, 138.6), (138.8, 140.3), (140.5, 141.9)):
        airflow(fx, a, b, lambda t, a=a, b=b: max(0, 1 - (t - a) / (b - a)) ** 2, 0.03)
    # Assembly: each part seating, a click per mesh check, then steady cranking.
    for t0 in (144.5, 144.7, 146.2, 146.4, 147.9, 149.2, 149.9, 152.7, 153.8, 154.5, 155.4, 156.2):
        add(fx, t0, thud(220, 0.1), 0.07)
        add(fx, t0, click(2000, 0.015, 0.5), 0.04)
    gear_ticks(fx, 149.8, 150.9, lambda t: 0.35, gain=0.04)
    gear_ticks(fx, 157.4, 172.0, lambda t: ramp_rps(t, 157.4, 0.35, 1.5), gain=0.04)
    airflow(fx, 157.4, 172.0, lambda t: min(1, (t - 157.4) / 1.5), 0.016)

    # Music bed: slow ambient pad (Dm - Bb - F - C), low-passed and quiet.
    music = np.zeros(N)
    chords = [[146.83, 220.0, 293.66, 349.23], [116.54, 233.08, 293.66, 349.23], [174.61, 220.0, 261.63, 349.23], [130.81, 196.0, 261.63, 329.63]]
    bar = 8.0
    for i in range(int(DUR / bar) + 1):
        c = chords[i % 4]
        s = seg(i * bar, i * bar + bar + 2.0)
        n = s.stop - s.start
        tt = np.arange(n) / SR
        e = np.minimum(1, tt / 2.5) * np.minimum(1, np.maximum(0, (bar + 2.0 - tt) / 2.5))
        x = sum(np.sin(2 * np.pi * f * tt + k) + 0.25 * np.sin(2 * np.pi * 2 * f * tt) for k, f in enumerate(c))
        music[s] += x * e * (0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * tt))
    music = lp(music, 1400) * 0.012
    music *= np.clip(t_all / 3, 0, 1) * np.clip((DUR - t_all) / 2.0, 0, 1)

    # Narration with ducking of music and effects.
    nar, nsr = sf.read(ROOT / "output" / "narration_audio.wav", dtype="float64")
    nar = resample_poly(nar, SR, nsr)[:N]
    nar = np.pad(nar, (0, N - len(nar)))
    sched = json.loads((ROOT / "animation" / "audio" / "narration_schedule.json").read_text())
    speech = np.zeros(N)
    for ln in sched:
        speech[seg(ln["start"] - 0.15, ln["end"] + 0.25)] = 1
    duck = lp(speech, 3, 1)
    duck = 1 - 0.45 * np.clip(duck, 0, 1)
    bed = (fx + music) * duck
    # Stereo: narration centred; effects with a little width.
    L = 0.92 * nar + bed + 0.002 * lp(rng.standard_normal(N), 4000) * 0
    R = 0.92 * nar + np.roll(bed, int(0.004 * SR))
    mix = np.stack([L, R], 1)
    mix *= 0.89 / np.abs(mix).max()
    out = ROOT / "animation" / "audio" / "final_mix.wav"
    sf.write(out, mix.astype(np.float32), SR, subtype="PCM_24")
    sf.write(ROOT / "animation" / "audio" / "fx_music_bed.wav", (bed * 0.89 / np.abs(mix).max()).astype(np.float32), SR, subtype="PCM_24")
    print(f"wrote {out} ({len(mix) / SR:.3f} s); narration peak {np.abs(nar).max():.2f}, bed peak {np.abs(bed).max():.3f}")


if __name__ == "__main__":
    main()
