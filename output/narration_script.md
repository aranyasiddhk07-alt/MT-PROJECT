# Narration Script — CAD Model to Finished Product

Voice: Kokoro-82M (`af_heart`, speed 0.95), generated locally. 26 lines, 381 words, 144.6 s of speech in the 180 s runtime.
Times are the measured start and end of each synthesised line in `narration_audio.wav` and the final video.

## Opening (0–8 s)

- **  0.70–  6.72 s** — A hand-cranked, gear-driven handheld fan: no motor, no battery, every part 3D printed.

## CAD Model Design (8–42 s)

- **  8.80– 12.34 s** — Stage one: the CAD model, the team's own assembly.
- ** 13.60– 20.49 s** — Exploded along its shafts: two shell halves, a crank, three gears, two shafts, three axle pins, a propeller.
- ** 21.60– 29.26 s** — The crank's fifty-four-tooth gear drives a twelve-tooth pinion on a compound gear, whose large gear drives the propeller's pinion.
- ** 30.80– 35.64 s** — Two speed-up stages: in theory, about twenty propeller turns per crank turn.
- ** 36.00– 41.63 s** — CAD is where fit, alignment, centre distance and clearance are checked, before printing.

## STL Export (42–60 s)

- ** 42.80– 48.82 s** — Stage two: STL export. Each part gets its own file, as each is printed separately.
- ** 49.20– 53.08 s** — The exact CAD surfaces become a mesh of flat triangles.
- ** 53.60– 59.57 s** — The mesh is checked: closed, normals outward, scale in millimetres; then oriented for printing.

## Slicing (60–84 s)

- ** 60.80– 69.23 s** — Stage three: slicing. Parts lie flat on the plate: shells open side up, gears flat, so each tooth forms within every layer.
- ** 70.40– 76.12 s** — The slicer cuts each part into thin layers and plans every toolpath: walls, then infill.
- ** 77.20– 83.94 s** — The report suggests finer layers and extra walls for gears; supports go only where an overhang needs them.

## FDM Printing (84–120 s)

- ** 84.80– 91.69 s** — Stage four: FDM printing. Filament is melted in a heated nozzle and laid along the planned path.
- ** 92.60– 98.87 s** — The first layer bonds to the bed; the nozzle then rises one layer, and each layer fuses to the last.
- **101.20–105.34 s** — Nothing is cut away: the gear is built up, teeth first, then its pinion.
- **108.80–112.13 s** — Shell walls grow the same way, leaving fine layer lines.
- **114.40–117.77 s** — When the print ends, the bed cools before parts are removed.

## Finishing (120–142 s)

- **120.80–125.02 s** — Stage five: finishing. A printed part is not yet a mechanism.
- **125.60–131.04 s** — Brims and strings are trimmed; gear flanks and shafts are sanded to remove layer ridges.
- **132.00–136.56 s** — Pin holes are reamed so shafts turn freely, and the gears are lubricated.
- **137.00–140.73 s** — Balanced on its shaft, the propeller should stop at random angles.

## Assembly & Test (142–172 s)

- **142.80–150.10 s** — Stage six: assembly and test. The crank gear, compound gear and propeller pinion go into the shell, meshing.
- **151.00–155.84 s** — The second shell closes the train; the crank handle, propeller and cap go on last.
- **157.60–163.53 s** — By design, the crank drives both gear stages, so the propeller spins far faster than the hand.
- **164.20–171.65 s** — The test plan: fit, free rotation, speed ratio, airflow, endurance and balance. Results are still to be measured.

## Closing (172–180 s)

- **172.60–178.34 s** — From CAD model to finished product: one digital design, six stages, no tooling.

## Wording decisions

- The gear train is described as the CAD shows it (two 54:12 stages), not as the README's single stage.
- "About twenty" and "in theory": the 20.25 : 1 ratio is derived from tooth counts, not measured.
- "The report suggests": print settings are the report's assumed starting values.
- "Results are still to be measured": the report's test plan has an empty Result column.
- No motor, battery, switch or wiring is mentioned; the PowerPoint's electric-fan content is excluded.
- Spoken forms: "S T L", "F D M", "3D Experience" are spelled for the TTS engine; captions use the written forms.
