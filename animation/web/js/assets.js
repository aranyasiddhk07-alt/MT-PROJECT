// Loaders for the converted CAD meshes (parts/*.bin) and sliced toolpaths (toolpaths/*.bin).
import * as THREE from 'three';

const BASE = '/web/assets';

export async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`fetch ${path}: ${r.status}`);
  return r.json();
}

// Render mesh: header u32[4] = nVerts, nIndices, nEdgeVerts, 0; then positions, normals, indices, edge vertices.
export async function loadPart(id) {
  const buf = await (await fetch(`${BASE}/parts/${id}.bin`)).arrayBuffer();
  const [nv, ni, ne] = new Uint32Array(buf, 0, 4);
  let o = 16;
  const pos = new Float32Array(buf, o, nv * 3); o += nv * 12;
  const nrm = new Float32Array(buf, o, nv * 3); o += nv * 12;
  const idx = new Uint32Array(buf, o, ni); o += ni * 4;
  const edges = new Float32Array(buf, o, ne * 3);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geom.setIndex(new THREE.BufferAttribute(idx, 1));
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  const eg = new THREE.BufferGeometry();
  eg.setAttribute('position', new THREE.BufferAttribute(edges, 3));
  return { geom, edges: eg };
}

// Toolpaths: u32 nLayers; per layer f32 z, u32 nPaths; per path u8 type, u8 closed, u16, u32 nPts, f32 xy[].
export async function loadToolpaths(id) {
  const buf = await (await fetch(`${BASE}/toolpaths/${id}.bin`)).arrayBuffer();
  const dv = new DataView(buf);
  let o = 0;
  const nLayers = dv.getUint32(o, true); o += 4;
  const layers = [];
  for (let i = 0; i < nLayers; i++) {
    const z = dv.getFloat32(o, true); const np = dv.getUint32(o + 4, true); o += 8;
    const paths = [];
    for (let j = 0; j < np; j++) {
      const type = dv.getUint8(o), closed = dv.getUint8(o + 1), n = dv.getUint32(o + 4, true); o += 8;
      paths.push({ type, closed: !!closed, pts: new Float32Array(buf.slice(o, o + n * 8)) });
      o += n * 8;
    }
    layers.push({ z, paths });
  }
  return layers;
}
