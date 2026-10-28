"""Write output/timeline.csv and output/narration_script.md from the scene plan and the measured narration schedule."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sched = {s["id"]: s for s in json.loads((ROOT / "animation" / "audio" / "narration_schedule.json").read_text())}
cfg = json.loads((ROOT / "animation" / "narration.json").read_text())

# (start, end, stage, visual action, narration line ids, key technical information)
SCENES = [
    (0.0, 8.0, "Opening", "Close-up of the propeller hub (cross bore visible), camera pulls back to a three-quarter view of the real assembled fan; crank turning, propeller following; title, subtitle, identity line", ["L01"], "Geometry: fan_A.1.igs. Hand-cranked, gear-driven, no motor, no battery"),
    (8.0, 13.4, "1 CAD Model Design", "Chapter card; orbit of the assembled CAD model with B-rep edges; overall dimensions", ["L02"], "Body 125 x 70 x 34 mm (measured from the IGES)"),
    (13.4, 20.8, "1 CAD Model Design", "Staggered explode along the shaft axis (X); README component labels with leaders; cap flagged as reconstructed", ["L03"], "12 IGES bodies + reconstructed cap; 3 axle pins; compound gear not listed in README"),
    (20.8, 30.6, "1 CAD Model Design", "Collapse with shells in x-ray; crank, 54T gear, compound 12T/54T and 12T pinion highlighted in turn; rotation arrows; mesh points", ["L04"], "Tooth counts measured: 54/12 and 54/12, module 1 mm"),
    (30.6, 35.8, "1 CAD Model Design", "Gear train turning (slowed); propeller blur; speed-up panel", ["L05"], "i = (54/12)^2 = 20.25 : 1, theoretical; compound turns opposite, propeller same direction as crank"),
    (35.8, 42.0, "1 CAD Model Design", "Shaft axes through both shells, 33.0 mm centre-distance dimensions; 'what CAD lets you check' panel", ["L06"], "Centre distance 33.0 mm = m(z1+z2)/2; blade-to-face clearance 6.7 mm; stepped rim joint"),
    (42.0, 48.8, "2 STL Export", "Chapter card + question; the 12 bodies lay out as separate files with real triangle counts", ["L07"], "One STL per printed part (12 files exported from the IGES)"),
    (48.8, 53.4, "2 STL Export", "Compound gear: sweep from exact CAD surface to faceted triangle mesh (coarse for visibility)", ["L08"], "Coarse 1,520 triangles shown; exported file 5,612 triangles at 0.01 mm deviation"),
    (53.4, 60.0, "2 STL Export", "Outward normals, OD dimension, checks panel; gear rotates 54T face down with build-direction arrow", ["L09"], "Checks verified on this export: watertight, outward normals, mm scale (OD 56.0)"),
    (60.0, 70.2, "3 Slicing", "Chapter card + question; all parts drop onto two 220 x 220 mm plates in the report's orientations; orientation labels", ["L10"], "Report 5.1 orientations; all parts fit 220 x 220 beds"),
    (70.2, 77.0, "3 Slicing", "Slice plane rises; CAD above the plane, coloured toolpaths below; legend; close-up of one compound-gear layer", ["L11"], "Walls, inner walls, sparse infill, solid skin, brim, support from the real cross-sections"),
    (77.0, 84.0, "3 Slicing", "Assumed starting-values panel; housing plate with the back-shell support callout", ["L12"], "Report 5.2 values labelled assumed; back shell's outer bosses stand 2 mm proud, so its face needs support"),
    (84.0, 92.4, "4 FDM Printing", "Chapter card; representative printer; hot-end cross-section schematic with moving filament and melt zone", ["L13"], "Printer and filament not specified in the project; 0.4 mm nozzle / PLA are report assumptions"),
    (92.4, 99.2, "4 FDM Printing", "First layer of the compound gear: outer wall, inner walls, skin; planned-path inset synced to the nozzle; nozzle +0.16 mm", ["L14"], "81 layers at 0.16 mm (assumed); fresh road shown hot behind the nozzle"),
    (99.2, 107.0, "4 FDM Printing", "Time-lapse: 54T gear then 12T pinion grow layer by layer; layer counter", ["L15"], "Additive: material only where the part is"),
    (107.0, 113.6, "4 FDM Printing", "Front shell walls rising (time-lapse)", ["L16"], "0.20 mm layers (assumed); layer lines"),
    (113.6, 120.0, "4 FDM Printing", "Print complete, bed cooling indicator, all 12 printed parts on two plates, parts lifted off", ["L17"], "Remove parts after the bed cools (report 5)"),
    (120.0, 125.6, "5 Finishing", "Chapter card + question; printed parts on the bench (layer-line material)", ["L18"], "Illustrative sequence; report 5.3"),
    (125.6, 132.0, "5 Finishing", "Hobby knife trims the propeller brim and strings; sanding the gear flanks, flank-profile inset (illustrative)", ["L19"], "400-800 grit (report)"),
    (132.0, 136.8, "5 Finishing", "Reaming a boss hole with a drill bit in a pin vise; lubricant drop on the teeth", ["L20"], "Ream to pin size; silicone grease or machine oil (report)"),
    (136.8, 142.0, "5 Finishing", "Propeller spun three times on its shaft between supports, stopping at different angles; dial panel", ["L21"], "Balanced rotor stops at random angles (report)"),
    (142.0, 151.0, "6 Assembly & Test", "Chapter card; in bench orientation: pins, 54T gear + crank shaft, compound gear, pinion, top pin drop into the front shell; turn by hand", ["L22"], "Report 6 order, extended for the compound gear found in the CAD"),
    (151.0, 157.6, "6 Assembly & Test", "Back shell closes; crank handle, propeller shaft, propeller and cap fitted from outside; fan stands upright", ["L23"], "No screws, clips or electronics"),
    (157.6, 164.2, "6 Assembly & Test", "Crank turning, back shell in x-ray showing both stages, propeller blur, airflow direction arrows; 'by design' panel", ["L24"], "Theoretical 20.25 : 1, same direction as crank"),
    (164.2, 172.0, "6 Assembly & Test", "Test-plan table: test, method, pass criterion, result 'to be measured'", ["L25"], "Report 7.1: no measured results exist"),
    (172.0, 180.0, "Closing", "Assembled CAD model orbit to a three-quarter view; six-stage chain; closing statement; gentle fade", ["L26"], "CAD -> STL -> Slicing -> FDM Printing -> Finishing -> Assembly & Test"),
]


def main():
    out = ROOT / "output"
    with open(out / "timeline.csv", "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["start_s", "end_s", "duration_s", "stage", "visual_action", "narration", "narration_timing_s", "technical_information"])
        for a, b, stage, vis, ids, tech in SCENES:
            nar = " ".join(sched[i]["text"] for i in ids)
            tim = "; ".join(f"{sched[i]['start']:.2f}-{sched[i]['end']:.2f}" for i in ids)
            w.writerow([f"{a:.1f}", f"{b:.1f}", f"{b - a:.1f}", stage, vis, nar, tim, tech])
    total_words = sum(len(s["text"].split()) for s in sched.values())
    speech = sum(s["duration"] for s in sched.values())
    lines = ["# Narration Script — CAD Model to Finished Product", "",
             f"Voice: Kokoro-82M (`{cfg['voice']}`, speed {cfg['speed']}), generated locally. "
             f"{len(sched)} lines, {total_words} words, {speech:.1f} s of speech in the 180 s runtime.",
             "Times are the measured start and end of each synthesised line in `narration_audio.wav` and the final video.", ""]
    for st in cfg["stages"]:
        rows = [s for s in sched.values() if s["stage"] == st["id"]]
        lines += [f"## {st['label']} ({st['start']:.0f}–{st['end']:.0f} s)", ""]
        for s in rows:
            lines.append(f"- **{s['start']:6.2f}–{s['end']:6.2f} s** — {s['text']}")
        lines.append("")
    lines += ["## Wording decisions", "",
              "- The gear train is described as the CAD shows it (two 54:12 stages), not as the README's single stage.",
              "- \"About twenty\" and \"in theory\": the 20.25 : 1 ratio is derived from tooth counts, not measured.",
              "- \"The report suggests\": print settings are the report's assumed starting values.",
              "- \"Results are still to be measured\": the report's test plan has an empty Result column.",
              "- No motor, battery, switch or wiring is mentioned; the PowerPoint's electric-fan content is excluded.",
              "- Spoken forms: \"S T L\", \"F D M\", \"3D Experience\" are spelled for the TTS engine; captions use the written forms.", ""]
    (out / "narration_script.md").write_text("\n".join(lines))
    print("wrote timeline.csv and narration_script.md")


if __name__ == "__main__":
    main()
