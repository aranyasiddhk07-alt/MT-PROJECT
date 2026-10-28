// A generic, unbranded desktop FDM printer (moving gantry over a fixed bed). Representative only:
// the project files do not name the printer that was used.
import * as THREE from 'three';

const alu = new THREE.MeshStandardMaterial({ color: 0x3a414b, roughness: 0.45, metalness: 0.6 });
const dark = new THREE.MeshStandardMaterial({ color: 0x1d2229, roughness: 0.6, metalness: 0.3 });
const sink = new THREE.MeshStandardMaterial({ color: 0x8b939d, roughness: 0.35, metalness: 0.85 });
const brass = new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.3, metalness: 0.9 });
const tube = new THREE.MeshStandardMaterial({ color: 0xf2f4f6, roughness: 0.25, transparent: true, opacity: 0.7 });

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}

export class Printer {
  constructor() {
    this.group = new THREE.Group();
    const S = 160, H = 360;
    for (const x of [-S, S]) for (const z of [-S, S]) this.group.add(box(20, H, 20, alu, x, H / 2 - 12, z));
    for (const z of [-S, S]) this.group.add(box(2 * S + 20, 20, 20, alu, 0, -12, z), box(2 * S + 20, 20, 20, alu, 0, H - 12, z));
    for (const x of [-S, S]) this.group.add(box(20, 20, 2 * S, alu, x, -12, 0), box(20, 20, 2 * S, alu, x, H - 12, 0));
    // Z stage: two side bars that rise with the layer; beam along X that moves in Z; carriage along X.
    this.zStage = new THREE.Group();
    for (const x of [-S + 16, S - 16]) this.zStage.add(box(14, 14, 2 * S, dark, x, 0, 0));
    this.beam = new THREE.Group();
    this.beam.add(box(2 * S - 30, 16, 22, alu, 0, 0, 0));
    this.carriage = new THREE.Group();
    this.carriage.add(box(34, 40, 18, dark, 0, 10, -14));
    // Hot end, nozzle tip at the carriage origin offset (0, 0, 0) of `head`.
    const head = new THREE.Group();
    const fins = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 1.6, 32), sink);
      f.position.y = 30 + i * 3; fins.add(f);
    }
    fins.add(new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 30, 20), sink).translateY(42));
    this.heater = box(20, 11, 16, new THREE.MeshStandardMaterial({ color: 0xa6adb6, roughness: 0.35, metalness: 0.7, emissive: 0xff5a1f, emissiveIntensity: 0.0 }), 2, 13, 0);
    const heatbreak = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 10, 16), sink); heatbreak.position.y = 23;
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 0.5, 7, 24), brass); nozzle.position.y = 4;
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 3, 6), brass); hex.position.y = 9;
    const bowden = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 400, 12), tube); bowden.position.y = 58 + 200;
    const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 400, 8), new THREE.MeshStandardMaterial({ color: 0xece8e0, roughness: 0.4 }));
    fil.position.y = 58 + 200;
    const duct = box(10, 10, 30, dark, -16, 12, 0);
    head.add(fins, this.heater, heatbreak, nozzle, hex, bowden, fil, duct);
    head.traverse((o) => { o.castShadow = true; });
    this.head = head;
    this.carriage.add(head);
    this.beam.add(this.carriage);
    this.zStage.add(this.beam);
    this.group.add(this.zStage);
    this.S = S;
  }

  // Put the nozzle tip at (x, y, z) in the printer's bed frame (bed top = y 0, centre = origin).
  setNozzle(x, y, z) {
    this.zStage.position.y = y + 36;
    this.beam.position.z = z + 30;
    this.carriage.position.x = x;
    this.head.position.set(0, -36, -30);
  }
}
