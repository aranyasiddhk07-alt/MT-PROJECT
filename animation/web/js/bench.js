// Build plates and simple workshop props shared by the slicing, printing and finishing scenes.
import * as THREE from 'three';
import { PLATE_X } from './roads.js';

function gridTexture(size = 1024, cells = 22, base = '#15191f', line = 'rgba(150,180,210,0.16)', major = 'rgba(150,180,210,0.32)') {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i <= cells; i++) {
    const p = Math.round(i * size / cells) + 0.5;
    g.strokeStyle = i % 5 === 0 ? major : line; g.lineWidth = i % 5 === 0 ? 2 : 1;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, size); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(size, p); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// A 220 x 220 mm build plate (textured top, 4 mm thick) centred at world (x, 0, 0), top surface at y = 0.
export function makeBed(x = 0, { size = 220 } = {}) {
  const grp = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(size, 4, size), [
    new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.6 }), new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ map: gridTexture(), roughness: 0.75, metalness: 0.1 }), new THREE.MeshStandardMaterial({ color: 0x2a3038 }),
    new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.6 }), new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.6 }),
  ]);
  top.position.y = -2.01; top.receiveShadow = true;
  grp.add(top);
  grp.position.x = x;
  return grp;
}

export function makePlates() {
  const g = new THREE.Group();
  g.add(makeBed(PLATE_X.housing), makeBed(PLATE_X.mechanism));
  return g;
}

// Workshop mat for finishing / assembly.
export function makeMat() {
  const m = new THREE.Mesh(new THREE.BoxGeometry(700, 3, 460), [
    null, null, new THREE.MeshStandardMaterial({ map: gridTexture(2048, 46, '#1a2129', 'rgba(140,200,180,0.10)', 'rgba(140,200,180,0.22)'), roughness: 0.9 }), null, null, null,
  ].map((x) => x || new THREE.MeshStandardMaterial({ color: 0x141a20, roughness: 0.9 })));
  m.position.y = -1.51; m.receiveShadow = true;
  return m;
}
