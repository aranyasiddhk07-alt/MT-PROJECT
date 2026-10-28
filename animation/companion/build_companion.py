"""Bundle the interactive companion into one offline HTML file: three.js and the real part meshes inlined."""
import base64
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "animation" / "web" / "assets" / "parts"
IDS = ["shell_side1", "shell_side2", "gear_input", "crank_shaft", "compound_gear", "pinion_output", "prop_shaft",
       "pin_idler_a", "pin_idler_b", "pin_prop", "crank_handle", "propeller"]


def main():
    data = {}
    for pid in IDS:
        b = (ASSETS / f"{pid}.bin").read_bytes()
        nv, ni, ne, _ = struct.unpack_from("<4I", b)
        o = 16
        chunks = {}
        for name, size in (("pos", nv * 12), ("nrm", nv * 12), ("idx", ni * 4), ("edges", ne * 12)):
            chunks[name] = base64.b64encode(b[o:o + size]).decode()
            o += size
        data[pid] = chunks
    three = (ROOT / "animation" / "node_modules" / "three" / "build" / "three.module.js").read_text()
    html = (Path(__file__).parent / "template.html").read_text()
    html = html.replace("/*THREE*/", three.replace("</script", "<\\/script")).replace("/*PARTS*/", json.dumps(data))
    out = ROOT / "output" / "interactive_companion" / "fan_interactive_companion.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html)
    print(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
