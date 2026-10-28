// Toolpath geometry from the sliced parts: line previews (slicer view) and instanced "roads" (deposited filament).
import * as THREE from 'three';
import { loadToolpaths, loadJSON } from './assets.js';

export const TYPE_COLORS = [0xff9f1c, 0xffd166, 0xef476f, 0x4cc9f0, 0x80ed99, 0xb388ff];
export const TYPE_NAMES = ['Outer wall', 'Inner walls', 'Sparse infill', 'Solid skin', 'Brim', 'Support'];
export const PLATE_X = { housing: -125, mechanism: 125 };
const LINE_W = 0.45;

// print (px, py, pz) -> world (px + plateX, pz, -py)
export function plateMatrix(plate) {
  return new THREE.Matrix4().set(1, 0, 0, PLATE_X[plate], 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1);
}

export function cadToWorld(plate, T) {
  const M = new THREE.Matrix4().set(...T[0], ...T[1], ...T[2], 0, 0, 0, 1);
  return plateMatrix(plate).multiply(M);
}

export async function loadPlates() {
  const plates = await loadJSON('/web/assets/plates.json');
  const parts = {};
  for (const [plate, list] of Object.entries(plates)) {
    for (const p of list) parts[p.id] = { ...p, plate, layers: await loadToolpaths(p.id), world: null };
  }
  for (const p of Object.values(parts)) p.world = cadToWorld(p.plate, p.cad_to_print);
  return parts;
}

// One LineSegments object for many parts, coloured by toolpath type; reveal height via clipping.
export function linePreview(partList, { types = null } = {}) {
  const pos = [], col = [], c = new THREE.Color();
  for (const p of partList) {
    const ox = PLATE_X[p.plate];
    for (const L of p.layers) {
      for (const path of L.paths) {
        if (types && !types.includes(path.type)) continue;
        c.setHex(TYPE_COLORS[path.type]);
        const n = path.pts.length / 2, segs = path.closed ? n : n - 1;
        for (let i = 0; i < segs; i++) {
          const j = (i + 1) % n;
          pos.push(path.pts[2 * i] + ox, L.z, -path.pts[2 * i + 1], path.pts[2 * j] + ox, L.z, -path.pts[2 * j + 1]);
          col.push(c.r, c.g, c.b, c.r, c.g, c.b);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);
  const m = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, clippingPlanes: [clip] });
  const obj = new THREE.LineSegments(g, m);
  obj.userData.clip = clip;
  obj.frustumCulled = false;
  return obj;
}

// Instanced roads for one part, in print order. Returns {mesh, segs, count, layerStart, setProgress(n), nozzleAt(n)}.
export function roadMesh(p, { color = 0xe9e5de, typeColors = false } = {}) {
  const ox = PLATE_X[p.plate];
  const h = p.layer;
  const seg = []; // x0,z0,x1,z1,y,type
  const layerStart = [];
  for (const L of p.layers) {
    layerStart.push(seg.length);
    for (const path of L.paths) {
      const n = path.pts.length / 2, segs = path.closed ? n : n - 1;
      for (let i = 0; i < segs; i++) {
        const j = (i + 1) % n;
        seg.push([path.pts[2 * i] + ox, -path.pts[2 * i + 1], path.pts[2 * j] + ox, -path.pts[2 * j + 1], L.z - h / 2, path.type]);
      }
    }
  }
  layerStart.push(seg.length);
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: typeColors ? 0xffffff : color, roughness: 0.55, metalness: 0 });
  const mesh = new THREE.InstancedMesh(geo, mat, seg.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  seg.forEach((g, i) => {
    const dx = g[2] - g[0], dz = g[3] - g[1], len = Math.hypot(dx, dz);
    q.setFromAxisAngle(up, -Math.atan2(dz, dx));
    v.set((g[0] + g[2]) / 2, g[4], (g[1] + g[3]) / 2);
    s.set(len + LINE_W * 0.55, h * 0.92, LINE_W);
    mesh.setMatrixAt(i, m.compose(v, q, s));
    if (typeColors) mesh.setColorAt(i, c.setHex(TYPE_COLORS[g[5]]));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false; mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.count = 0;
  return {
    mesh, seg, layerStart, total: seg.length,
    // Nozzle position at fractional instance index n.
    nozzleAt(n, out = new THREE.Vector3()) {
      const i = Math.min(seg.length - 1, Math.max(0, Math.floor(n))), f = Math.min(1, Math.max(0, n - i));
      const g = seg[i];
      return out.set(g[0] + (g[2] - g[0]) * f, g[4] + h / 2, g[1] + (g[3] - g[1]) * f);
    },
  };
}
