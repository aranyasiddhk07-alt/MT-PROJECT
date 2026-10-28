# Source Audit — Hand-Cranked FDM Fan: "CAD Model to Finished Product"

Prepared before production of the 180-second animation. Every statement in the video
traces back to one of the sources below, or is labelled on screen as assumed or illustrative.

## 1. What was examined

| Source | How it was examined | Result |
|---|---|---|
| Repository `aranyasiddhk07-alt/MT-PROJECT`, branch `claude/vigilant-gates-0wdqke` | File tree, 2 commits (`Initial commit`, `Add files via upload`) | Holds a 2-line `README.md` and `MT-PROJECT.zip`. All project content is inside the zip. |
| `MT-PROJECT.zip` | Extracted in full, including its internal `.git` (1 commit, 2026-10-28: "Add 3D printed handheld fan project: CAD, report, slides and renders") | Authoritative project content. Files now extracted to `cad/`, `docs/`, `images/` in the repository root (byte-identical, SHA-256 checked for the IGES). |
| `README.md` (inside zip) | Read in full | Product identity, component table, six-stage process. |
| `cad/fan_A.1.igs` (4.0 MB, 49 493 lines) | Parsed directory/global sections; imported with OpenCascade 7.8 (OCP); sewn, tessellated, cross-sectioned, rendered | See section 2. Opens cleanly. |
| `images/exploded-view-front.jpg`, `exploded-view-back.jpg` | Inspected visually, with zoomed crops | Exploded CATIA renders; used to verify part identity and assembly directions. |
| `images/cad-to-product-process.jpg` | Inspected visually | Photo of a slide listing the six required stages. |
| `docs/Manufacturing_Technology_Project_Report_3D_Printed_Handheld_Fan.pdf` | Full text of all 10 pages extracted; every page also rendered and checked visually | Text and tables only; no figures. Test-plan "Result" column is empty. |
| `docs/Handheld_3D_Printed_Fan.pptx` | All 19 slides: text, tables, speaker notes; rendered to images; all 14 embedded images extracted | Generic template for an **electric** fan with unfilled placeholders. See section 4. |

No GitHub repository other than the one attached to this session was consulted. No repository URL was invented.

## 2. CAD file findings (`fan_A.1.igs`)

**Header:** exported 2026-10-18 from *3DEXPERIENCE Platform V6R2026x HF6.19*, file name `fan A.1.igs`,
units **MM** (unit flag 2), author field "Arnav Bawankar".

**Structure:** six top-level subfigure instances (IGES entities 308/408), named in the file:
`casing side 1`, `compound gear assembly`, `casing side 2`, `propeller`, `shaft`, `handle`.
Geometry is surface-based: 895 trimmed surfaces (type 144) on NURBS (type 128) and analytic surfaces.
There are no IGES solid entities, but sewing the faces of each instance at 0.02 mm tolerance gives
**closed shells with zero free edges**. The compound gear assembly sews into seven separate bodies.

**The 12 bodies and how they were identified** (CAD X axis = shell stacking axis; all rotation axes are parallel to X at Z = 0):

| Body (IGES group) | Identified as (README name) | Axis (Y, mm) | Key measured geometry |
|---|---|---|---|
| casing side 1 | **Front shell half** — "holds the gear train" (deeper cup) | — | X 8…24, outer 125 × 70 mm, 3 internal bearing bosses |
| casing side 2 | **Back shell half** — "closes the body" (crank and propeller face) | — | X −10…8, 3 bosses; crank and propeller shaft pass through it |
| compound gear assembly, body 0 | **Large spur gear** (input) | −27 | **54 teeth**, OD 56.0, root Ø 51.5, face width 5 mm |
| compound gear assembly, body 3 | Crank shaft (carries the input gear) | −27 | Ø8 collar / Ø6, length 20 mm, Ø3 bore |
| compound gear assembly, body 1 | **Compound (intermediate) gear** — *not listed in README* | +6 | **12-tooth** pinion (OD 14, X 0…8) + **54-tooth** gear (X 8…13), one body |
| compound gear assembly, bodies 4, 2, 5 | **Axle pins** (README: "2–3") | +6, +6, +39 | Three Ø6 pins, 2 mm, 5 mm, 2 mm long |
| compound gear assembly, body 6 | **Pinion** of "pinion and propeller shaft" | +39 | **12 teeth**, OD 14, X 8…16, with Ø8 hub X −2…8 |
| shaft | Propeller shaft | +39 | Length 24 mm, cross ("+") section 5 mm across, the torque-transmitting profile |
| propeller | **Propeller** | +39 | Two blades, span Ø85 mm, hub Ø20 × 12 mm, "+" bore |
| handle | **Crank handle** | −27 | Arm reaches 22.5 mm from the axis; "+" spigot into the crank shaft |

Tooth counts were measured, not assumed: the outline of each gear was sectioned at 3–9 planes along its
face width and the tooth peaks counted. Every section agreed. Outside and root diameters match
module 1 mm exactly (OD = m(z + 2), root = m(z − 2.5)), and the axis spacing (33 mm) equals
m(54 + 12)/2. Every body exports as a watertight, winding-consistent STL whose volume matches the B-rep volume.

**Mechanism as built in the CAD:** crank handle → crank shaft → 54T gear → meshes with the 12T pinion of
the compound gear → the compound gear's 54T meshes with the 12T pinion on the propeller axis → hub →
"+" propeller shaft → propeller. This is a **two-stage compound spur train**. Theoretical speed ratio
from the measured tooth counts: (54/12) × (54/12) = **20.25 : 1**. Two meshes, so the propeller turns in
the same direction as the crank. This is a *geometric* value, not a measured test result.

**Assembly directions:** all parts assemble along X. The shell halves meet at X = 8 on a stepped rim.
The crank handle and propeller shaft insert from outside through bosses in the back shell, so they are
fitted after the shell is closed. This agrees with the report's sequence (handle, propeller and cap last).

**Absent from the IGES:** the **propeller cap**. It appears in both exploded-view renders (a dome with a
central socket) but is not in the export. In the animation it is modelled as a Ø20 mm dome sized to the
propeller hub face, and labelled on screen as reconstructed from the renders.

## 3. Verified manufacturing facts (and where they come from)

- Process sequence: CAD → STL export → slicing → FDM printing → finishing → assembly & test (README, process image, report §5).
- STL per part, fine tessellation so gear teeth stay smooth; check mesh for holes and flipped faces (report §5).
- Build orientations (report §5.1): shells flat, open side up; large gear flat; pinion and shaft upright or flat; crank handle flat; propeller flat, hub down, with a brim; cap and pins flat or upright.
- Post-processing (report §5.3): remove brims and stringing (hobby knife); sand gear flanks and shafts (400–800 grit); ream pin holes; lubricate teeth and shafts; balance the propeller (it should stop at random angles).
- Assembly order (report §6), and test plan (report §7.1): fit, free rotation, speed ratio, airflow, endurance, balance.
- FDM principle and limitations (report §2): additive, layer by layer, anisotropic, layer lines add friction.
- No electronics: "There is no electronics in this design" (report §6; README).

## 4. Contradictions found

| # | Contradiction | Resolution used in the video |
|---|---|---|
| 1 | README and report describe **one** gear stage ("large spur gear meshes with a small pinion on the propeller shaft"). The CAD has **two** stages: an intermediate compound gear (12T + 54T) on its own axle pins, named "compound gear assembly" in the file. The exploded renders also show two large gears, each with a pinion. | Geometry wins (source hierarchy #1). The animation shows both stages and labels the intermediate gear. README names are kept for the other parts. |
| 2 | Report §3.4 uses an *illustrative* 60T/12T, i = 5 example. | Not shown. The video shows the measured 54T/12T counts, labelled "measured from CAD", and calls 20.25 : 1 *theoretical*. |
| 3 | The PowerPoint describes an **electric fan**: DC motor, 3.7 V Li-ion cell, slide switch, charger board, wiring, guard grill, motor housing, battery handle; electrical standards (IEC 60335-2-80, IEC 62133-2, IS 302); a 5-blade schematic with a guard. All values are unfilled `[__]` placeholders. | Excluded completely. No motor, battery, switch, wire, guard or electrical standard appears. Only PPTX content consistent with the CAD was used for context: the six process steps, layer-by-layer AM principle, and printing hazards. |
| 4 | PPTX slide 9 step 6 says "Motor, cell and switch fitted, then tested." | Replaced by the report's mechanical assembly sequence, checked against the CAD. |
| 5 | Report §4.1: "The CAD model is blue throughout." The IGES colour entities are near-white and light grey (RGB ≈ 100/95/91 %, 88 %, 90 %), and both renders are white/grey. | CAD shown in light grey. No claim is made about the filament colour. |
| 6 | README calls the halves "front, with pin bosses" and "back, with locating pins". The renders show 8 rim locating pins on the crank-side half and matching rim holes on the other. The IGES export has **no rim pins**: its halves align on a stepped rim lip and three shared bosses. | README names are used (front = deeper cup, back = crank side; the mapping comes from the renders). The video says the halves are aligned by "rim and bosses" and does not draw rim pins the IGES does not contain. |
| 7 | Renders show two long headed pins and a small spacer. The IGES has three short Ø6 axle pins and a 20 mm crank shaft. | IGES geometry is used. Treated as a revision difference between the renders and the export. |
| 8 | Report §1.3: "The video supplied shows the CAD model and its exploded view only" — the report was written from a CAD video, so its figures beyond the CAD are explicitly assumed. | Every report figure beyond the CAD is shown as "assumed" or left out. |

## 5. Assumptions that must NOT be presented as facts

- **Print settings** (layer height 0.12–0.20 mm, 3–4 walls, 20–100 % infill, 210 °C nozzle, 60 °C bed, 30–50 mm/s): the report marks them "assumed". Wherever numbers appear in the video they are tagged *assumed starting values (report)*.
- **Filament**: PLA is *recommended*; the filament actually used is not confirmed. The video says "representative".
- **Printer**: not identified anywhere. The printer in the video is a generic, unbranded representative model, labelled as such.
- **Print time (8–12 h) and cost (₹150–250)**: estimates. Not shown in the video.
- **Clearances** (0.2–0.3 mm etc.): assumed. Not shown as numbers.
- **Test results**: none exist. The Result column in report §7.1 is empty, and PPTX slide 16 is all placeholders. The video presents the test **plan** only, with no readings, pass marks or ticks.
- **Physical specimen**: there is no evidence of a printed, finished or assembled physical fan (no photos). Printing, finishing and assembly are therefore shown as **illustrative visualisations** of the documented process.
- **Gear ratio 20.25 : 1** is derived from the CAD geometry. It is theoretical and is labelled that way.

## 6. Strategy for turning the CAD into animation assets

1. **Import:** OpenCascade (OCP 7.8) reads the IGES, transfers each of the six roots, and sews faces into 12 closed shells.
2. **Orientation fix:** the IGES face orientation flags are not reliable, so each body is meshed, merged into a watertight mesh, and given a consistent outward winding. Each B-rep face keeps its own vertices and surface normals, so CAD edges stay crisp.
3. **Render meshes:** fine tessellation (0.01 mm deflection for mechanism parts), plus B-rep feature edges (seam edges removed) for a true CAD look → `animation/web/assets/parts/*.bin`.
4. **Real STL export** of all 12 parts (`animation/web/assets/stl/*.stl`) and a GLB of the assembly. These are the files the STL stage depicts.
5. **Real slicing:** a small slicer (trimesh + shapely) sections the actual STL geometry in the report's orientations and generates walls and infill. The slicing preview and the printing toolpaths in the video come from the real part outlines.
6. **Kinematics:** rotation about the measured axes using the measured tooth ratios (crank θ, compound −4.5θ, propeller +20.25θ). The CAD pose is already in mesh, so the teeth stay meshed throughout.
7. **Rendering:** Three.js in headless Chromium, driven frame by frame (deterministic, 30 fps), with HTML/SVG overlays for labels, then encoded with FFmpeg. Blender is not installed in this environment and could not be downloaded (network policy).
