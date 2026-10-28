"""Generate the narration from animation/narration.json.

For every line: synthesise speech with Kokoro-82M (ONNX), trim silence, place it at
its scheduled start time, and check that it ends before the next line and inside
its stage. Writes:
  animation/audio/clips/<id>.wav          one clip per line (24 kHz mono)
  animation/audio/narration_schedule.json actual start/end of every line
  output/narration_audio.wav              narration-only track, exactly 180.000 s
  output/captions.srt                     captions split to at most two 42-char lines

Usage: python3 02_narration.py <kokoro_dir>
  <kokoro_dir> holds kokoro-v1.0.onnx and voices-v1.0.bin from
  https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
"""
import json
import sys
import textwrap
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import filtfilt, iirnotch
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parents[2]
CFG = json.loads((ROOT / "animation" / "narration.json").read_text())
AUDIO = ROOT / "animation" / "audio"
SR = 24000
GAP = 0.25  # minimum silence between lines, seconds


def trim(a, thresh=0.004, pad=0.15, fade_in=0.02, fade_out=0.08):
    """Trim leading/trailing silence, then fade the ends so no clip starts or stops with a click."""
    loud = np.where(np.abs(a) > thresh)[0]
    if not len(loud):
        return a
    lo = max(0, loud[0] - int(0.06 * SR))
    hi = min(len(a), loud[-1] + int(pad * SR))
    a = a[lo:hi].copy()
    a[: int(fade_in * SR)] *= np.linspace(0, 1, int(fade_in * SR))
    a[-int(fade_out * SR):] *= np.linspace(1, 0, int(fade_out * SR)) ** 2
    return a


def remove_vocoder_tones(a):
    """Notch the faint stationary tones Kokoro leaves at 0.2 and 0.4 x the sample rate (4.8 and 9.6 kHz)."""
    for f0 in (4800.0, 9600.0):
        b, c = iirnotch(f0, 30.0, SR)
        a = filtfilt(b, c, a)
    return a.astype(np.float32)


def stage_of(t):
    return next(s for s in CFG["stages"] if s["start"] <= t < s["end"])


def srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def caption_cues(text, start, end, max_chars=84):
    """Split a line at sentence or clause boundaries into cues of at most two 42-char rows."""
    parts, cur = [], ""
    for word in text.split():
        trial = (cur + " " + word).strip()
        if len(trial) > max_chars and cur:
            parts.append(cur)
            cur = word
        else:
            cur = trial
        if cur.endswith((".", ":", "?")) and len(cur) > 30:
            parts.append(cur)
            cur = ""
    if cur:
        parts.append(cur)
    total = sum(len(p) for p in parts)
    cues, t = [], start
    for p in parts:
        d = (end - start) * len(p) / total
        cues.append((t, t + d, "\n".join(textwrap.wrap(p, 42))))
        t += d
    return cues


def main(kokoro_dir):
    (AUDIO / "clips").mkdir(parents=True, exist_ok=True)
    tts = Kokoro(str(Path(kokoro_dir) / "kokoro-v1.0.onnx"), str(Path(kokoro_dir) / "voices-v1.0.bin"))
    track = np.zeros(int(CFG["duration"] * SR), np.float32)
    schedule, cues, problems = [], [], []
    lines = CFG["lines"]
    for i, ln in enumerate(lines):
        a, sr = tts.create(ln.get("say", ln["text"]), voice=CFG["voice"], speed=CFG["speed"], lang=CFG["lang"])
        assert sr == SR
        a = trim(remove_vocoder_tones(np.asarray(a, np.float32)))
        sf.write(AUDIO / "clips" / f"{ln['id']}.wav", a, SR, subtype="PCM_16")
        start, dur = ln["start"], len(a) / SR
        end = start + dur
        limit = lines[i + 1]["start"] - GAP if i + 1 < len(lines) else CFG["duration"] - 0.4
        st = stage_of(start)
        if end > limit:
            problems.append(f"{ln['id']} ends {end:.2f}s, after the next line's limit {limit:.2f}s")
        if end > st["end"] + 0.6:
            problems.append(f"{ln['id']} runs {end - st['end']:.2f}s past the end of stage '{st['id']}'")
        s0 = int(start * SR)
        track[s0:s0 + len(a)] += a[: len(track) - s0]
        words = len(ln["text"].split())
        schedule.append(dict(id=ln["id"], stage=st["id"], start=round(start, 3), end=round(end, 3),
                             duration=round(dur, 3), words=words, text=ln["text"]))
        cues += caption_cues(ln["text"], start, end)
        print(f"{ln['id']} {st['id']:9s} {start:6.2f}-{end:6.2f}  ({dur:4.2f}s, {words:2d} w, {words / dur:4.2f} w/s, "
              f"slack {limit - end:+.2f}s)  {ln['text'][:60]}", flush=True)
    peak = np.abs(track).max()
    track *= 0.89 / peak  # about -1 dBFS peak
    sf.write(ROOT / "output" / "narration_audio.wav", track, SR, subtype="PCM_16")
    (AUDIO / "narration_schedule.json").write_text(json.dumps(schedule, indent=1))
    srt = []
    for n, (a, b, txt) in enumerate(cues, 1):
        srt.append(f"{n}\n{srt_time(a)} --> {srt_time(b)}\n{txt}\n")
    (ROOT / "output" / "captions.srt").write_text("\n".join(srt))
    total_words = sum(s["words"] for s in schedule)
    speech = sum(s["duration"] for s in schedule)
    print(f"\nwords {total_words}, speech {speech:.1f}s of {CFG['duration']}s, mean {total_words / speech:.2f} w/s, "
          f"track {len(track) / SR:.3f}s")
    for p in problems:
        print("PROBLEM:", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
