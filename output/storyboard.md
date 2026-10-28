# Storyboard — CAD Model to Finished Product (180 s, 1920 × 1080, 30 fps)

Exact scene timings, narration and technical notes for every shot are in `timeline.csv`. This file covers the visual system and the intent of each section.

## Visual system

| Element | Choice | Purpose |
|---|---|---|
| Background | Dark graphite radial gradient; faint blueprint grid during the CAD and STL stages | Keeps light-grey parts and labels high-contrast, as in the team's process slide |
| CAD look | Light grey satin parts with black B-rep feature edges (seam edges removed) | Reads as the team's CATIA renders |
| Printed look | Warm off-white with procedural layer lines along the real build direction, faded with screen-space derivatives so they never alias | Shows the CAD-to-plastic change |
| X-ray | Pale-blue transparent shells with light edges | Shows the gear train inside the closed body |
| Cyan `#3cc8ff` | Geometry, dimensions, measured values, verified checks | Fact from the CAD or the export |
| Amber `#ffad33` | Motion, rotation arrows, assumed values, illustrative-sequence badges | Movement, and anything that is not measured |
| Toolpath colours | Outer wall amber, inner walls yellow, sparse infill rose, solid skin blue, brim green, support violet | A slicer-style preview without copying any one slicer's UI |
| Type | Barlow Condensed (titles), Inter (labels, ≥ 17 px), JetBrains Mono (values) | Legible at 1080p |
| Chrome | Stage header (top left), provenance badge (top right), six-segment progress bar (bottom) | The viewer always knows the stage and the kind of evidence on screen |

Provenance badges used on screen: **Actual CAD geometry**, **Real export**, **Real part outlines**, **Assumed values**, **Representative visualisation**, **Illustrative sequence / assembly**.

## Sections

**Opening (0–8 s).** Macro shot of the real propeller hub. The cross-shaped bore that drives the propeller is visible. The camera pulls back to the stadium body with the crank turning and the propeller following at the CAD ratio. The title appears beside the model with the identity line "hand-cranked · gear-driven · no motor · no battery".

**Stage 1 — CAD (8–42 s).** The camera orbits the assembly and the overall size is dimensioned (125 × 70 × 34 mm). Parts then explode along the shaft axis, outer parts first, which is the true assembly direction. README names are attached with leader lines, the three axle pins share one label, and the cap is flagged as reconstructed. The parts collapse with the shells in x-ray. The crank group glows amber, then the compound gear cyan, then the output pinion. Tooth tags (54 T / 12 T / 54 T / 12 T), rotation arrows (CW, CCW, CW) and mesh points follow the narration. A panel derives i = 54/12 × 54/12 = 20.25 and marks it theoretical. Finally, dashed shaft axes run through both shells' bosses, with 33.0 mm centre-distance dimensions and a panel of what the CAD lets you check.

**Stage 2 — STL (42–60 s).** Question: *Why export each part separately?* The 12 bodies line up as 12 files with real triangle counts. On the compound gear, a sweep replaces the exact surface with a coarse triangle mesh drawn as cyan wireframe and flat facets (coarse tessellation is stated on screen). Outward normals, the Ø56.0 mm scale check and a ticked checklist follow; each check really was run on this export. The gear then rotates 54 T face down beside a build-direction arrow.

**Stage 3 — Slicing (60–84 s).** Question: *What does slicing add?* Parts drop onto two 220 × 220 mm plates in the report's orientations, with labels. A translucent slice plane rises: CAD in x-ray above it, coloured toolpaths from the real cross-sections below it. A legend explains the colours. The camera moves to one compound-gear layer. The assumed-values panel follows, then the housing plate with the back-shell support finding.

**Stage 4 — FDM printing (84–120 s).** A representative, unbranded gantry printer. A hot-end cross-section schematic shows drive gears, filament, heat break, heater, melt zone, nozzle and a molten road. The first layer of the compound gear is then laid along the real toolpath, with the freshly deposited road glowing and cooling. An inset shows the planned path with a marker synced to the nozzle. The nozzle rises 0.16 mm per layer. In the time-lapse the 54 T teeth appear before the 12 T pinion, with a layer counter (81 layers). Next come the front-shell walls rising, the bed cooling, all 12 printed parts on two plates, and the parts lifting off. Nothing is ever removed, because the process is additive.

**Stage 5 — Finishing (120–142 s).** Question: *Why does finishing matter for rotating parts?* An illustrative sequence of the report's §5.3 operations on the real printed-part geometry: knife trimming the brim and strings (cutting away from the hand); sanding the gear flanks while the layer ridges fade, with an illustrative flank-profile inset; reaming a boss hole with a pin vise; a lubricant drop; and the propeller spun three times on its shaft, stopping at different angles.

**Stage 6 — Assembly & test (142–172 s).** In bench orientation, parts drop into the front shell in the report's order, extended for the compound gear found in the CAD, with a step list. A hand-turn check follows, then the back shell closes and the handle, shaft, propeller and cap are fitted from outside. The fan stands up, the crank turns, the back shell goes x-ray, the propeller blurs and airflow-direction arrows appear beside a "by design (theoretical)" panel. The test-plan table follows, with every result "to be measured".

**Closing (172–180 s).** Slow orbit to a three-quarter view. The six-stage chain builds across the bottom, then "One digital model. Six stages. No tooling." and a gentle fade.

## Continuity

The same 12 meshes from `fan_A.1.igs` appear in every stage: as CAD, as STL, sliced, as toolpaths printed on the plates, as printed parts, during assembly and while running. Only the cap is reconstructed, and it is labelled as such.
