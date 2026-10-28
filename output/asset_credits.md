# Asset Credits

**No external images, footage or audio were used.** Every visual and sound in the video was made from the project files or generated for this animation.

## Project assets (from the repository)

| Asset | Used for |
|---|---|
| `cad/fan_A.1.igs` | All 12 part geometries (converted with OpenCascade), measured dimensions and tooth counts, STL export, slicing toolpaths |
| `images/exploded-view-front.jpg`, `images/exploded-view-back.jpg` | Reference only: part identity, assembly directions, propeller-cap shape (the cap is not in the IGES) |
| `images/cad-to-product-process.jpg` | Reference only: the six required stages and their wording |
| `docs/Manufacturing_Technology_Project_Report_3D_Printed_Handheld_Fan.pdf` | Orientations, assumed print values, finishing operations, assembly order, test plan |
| `docs/Handheld_3D_Printed_Fan.pptx` | Context only. Its electric-fan content and generic fan schematics were **not** used |

## Generated in this project

| Asset | How |
|---|---|
| 3D scenes, printer, tools, build plates | Three.js r169, procedural geometry (`animation/web/js`) |
| Toolpaths | Own slicer on the real STLs (trimesh + shapely), `animation/pipeline/03_slice_parts.py` |
| Narration | Kokoro-82M TTS (ONNX, Apache-2.0 model weights, voice `af_heart`), run locally; model from github.com/thewh1teagle/kokoro-onnx releases |
| Sound effects and music bed | Synthesised with NumPy/SciPy, `animation/pipeline/05_audio_mix.py` |

## Software and fonts (open-source licences)

| Item | Licence |
|---|---|
| three.js 0.169.0 | MIT |
| Inter, Barlow Condensed, JetBrains Mono (via @fontsource) | SIL Open Font License 1.1 |
| OCP / OpenCascade (cadquery-ocp) | Apache-2.0 / LGPL-2.1 with exception |
| trimesh, shapely, NumPy, SciPy | MIT / BSD |
| kokoro-onnx | MIT; Kokoro-82M weights Apache-2.0 |
| sherpa-onnx + Whisper base.en (QA transcription only, not in the video) | Apache-2.0 / MIT |
| FFmpeg (encoding), Chromium via Playwright (rendering) | LGPL/GPL, BSD / Apache-2.0 |
