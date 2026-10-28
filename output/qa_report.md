# QA Report — `hand_cranked_fan_animation_180s.mp4`

Every check below was run on the final encoded file unless stated otherwise.

## Media specification (ffprobe)

| Parameter | Required | Measured |
|---|---|---|
| Duration | 180 s exactly | **180.000000 s** (container, video and audio streams) |
| Frames | 5400 | **5400** |
| Resolution / aspect | 1920 × 1080, 16:9 | 1920 × 1080 |
| Frame rate | 30 fps | 30/1 (constant) |
| Video codec | H.264 | H.264 High profile, yuv420p, CRF 23, ~2.3 Mbit/s, faststart |
| Audio | synchronised narration + supporting audio | AAC-LC 48 kHz stereo, 180.000 s |
| File size | — | 52.6 MB |

## Automated checks

| Check | Method | Result |
|---|---|---|
| Black frames | `blackdetect d=0.1 pix_th=0.06` | None. The only darkening is the deliberate ~0.3 s dip at stage changes and the end fade |
| Frozen video | `freezedetect d=1.0` | No still segment ≥ 1 s |
| Unintended silence | `silencedetect -50 dB, 1.5 s` | None (beginning, middle and end all carry audio) |
| Loudness | EBU R128 | −16.1 LUFS integrated, LRA 3.7 LU, true peak −1.4 dBFS |
| Voice vs. background | RMS during speech | Narration 17.5 dB above effects/music |
| Narration intelligibility | Whisper base.en transcription of all 26 lines (`animation/audio/asr_check.txt`) | 3.4 % WER. Every residual "error" is formatting ("1" vs "one", "tool path" vs "toolpath", "air flow") |
| Narration timing | `02_narration.py` overlap check | No line overlaps the next; every line ends inside its stage |
| Vocoder artefact | Spectral check | Faint 4.8/9.6 kHz TTS tones found and notched out |
| Frame integrity | Full decode of all 5400 source JPEGs | No errors |

## Visual review

- Previewed every stage during development, and pulled 24 frames from the final MP4 at all stage boundaries and key sequences.
- Issues found and fixed before the final render: title over the model; overlapping dimension tags; mirrored print orientations (now an assertion in the slicer); print carriage blocking the nozzle close-up; finishing props placed wrongly; bench mat visibly sinking; an unwanted dim frame at the opening → Stage 1 cut (frames 240–255 re-rendered).
- Remaining cosmetic note: at 120.2 s the "05 Finishing" card briefly overlaps a part.

## Technical accuracy checklist

- [x] Hand-cranked and gear-driven; no motor, battery, switch or wiring anywhere.
- [x] All 12 bodies come from `fan_A.1.igs`. The cap is reconstructed and labelled.
- [x] The gear train turns with the measured ratios (θ, −4.5θ, +20.25θ), staying in mesh from the CAD pose.
- [x] The six stages appear in order, each with its own chapter card, header and progress segment.
- [x] Assumed values are labelled "assumed" on screen; printer and filament are labelled "representative / not specified".
- [x] Finishing and assembly are labelled illustrative; the test plan shows "to be measured" with no readings.
- [x] FDM is shown as additive: roads are only ever added, along the real sliced toolpaths.

## Not verified

- Listening by a human: audio was checked by measurement and transcription only.
- Real-time playback was not watched end to end. Review used frame sampling plus automated detectors.
