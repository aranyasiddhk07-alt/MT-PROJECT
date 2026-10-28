"""QA: transcribe every narration clip with Whisper base.en (sherpa-onnx) and report word error rate.

Usage: python3 qa_asr.py <whisper_dir>
  <whisper_dir> = sherpa-onnx-whisper-base.en from
  https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import sherpa_onnx
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
NUM = {"54": "fifty four", "12": "twelve", "20": "twenty", "3d": "three d", "3": "three", "2": "two", "6": "six"}


def norm(s):
    s = s.lower().replace("-", " ").replace("millimeters", "millimetres").replace("center", "centre")
    words = re.sub(r"[^a-z0-9 ]", " ", s).split()
    return " ".join(NUM.get(w, w) for w in words).split()


def wer(ref, hyp):
    d = np.arange(len(hyp) + 1, dtype=float)
    for i, r in enumerate(ref, 1):
        prev, d[0] = d.copy(), i
        for j, h in enumerate(hyp, 1):
            d[j] = min(prev[j] + 1, d[j - 1] + 1, prev[j - 1] + (r != h))
    return d[-1], len(ref)


def main(wdir):
    w = Path(wdir)
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=str(w / "base.en-encoder.int8.onnx"), decoder=str(w / "base.en-decoder.int8.onnx"),
        tokens=str(w / "base.en-tokens.txt"), num_threads=4)
    cfg = json.loads((ROOT / "animation" / "narration.json").read_text())
    errs = total = 0
    report = []
    for ln in cfg["lines"]:
        a, sr = sf.read(ROOT / "animation" / "audio" / "clips" / f"{ln['id']}.wav", dtype="float32")
        st = rec.create_stream()
        st.accept_waveform(sr, a)
        rec.decode_stream(st)
        hyp = st.result.text.strip()
        e, n = wer(norm(ln["text"]), norm(hyp))
        errs, total = errs + e, total + n
        report.append(f"{ln['id']}  WER {e / n:5.1%}  | {hyp}")
    report.append(f"\nOVERALL WER {errs / total:.2%} ({int(errs)} word errors / {total} words)")
    out = "\n".join(report)
    print(out)
    (ROOT / "animation" / "audio" / "asr_check.txt").write_text(out + "\n")


if __name__ == "__main__":
    main(sys.argv[1])
