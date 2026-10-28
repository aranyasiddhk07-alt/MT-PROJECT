// The fan assembly built from the real CAD bodies (fan_A.1.igs), with its measured kinematics.
//
// CAD frame (millimetres): X = shell stacking axis, Y = long axis of the body, Z = width.
// All three rotation axes are parallel to X at Z = 0:
//   crank axis       Y = -27 : crank handle, crank shaft, 54T input gear          angle  theta
//   intermediate     Y =  +6 : compound gear 12T + 54T                           angle -theta * 54/12
//   propeller axis   Y = +39 : 12T pinion + hub, propeller shaft, propeller, cap  angle +theta * (54/12)^2
// Tooth counts were measured from the IGES geometry (see output/source_audit.md).
import * as THREE from 'three';
import { loadPart } from './assets.js';

export const RATIO_1 = 54 / 12;
export const RATIO = RATIO_1 * RATIO_1; // 20.25, theoretical

const C = { housing: 0xd9dde2, gear: 0xd3ccc1, metalish: 0xcfd3d8, prop: 0xd6dbe0 };

// id: label (README naming), axis Y, rotation group, explode offset along X, label anchor (CAD coords), colour.
export const PARTS = {
  shell_side1:   { label: 'Front shell half', axis: null, grp: null, dx: 70, anchor: [8, 46, 33], color: C.housing },
  shell_side2:   { label: 'Back shell half', axis: null, grp: null, dx: -55, anchor: [-8, 46, 31], color: C.housing },
  gear_input:    { label: 'Large spur gear · 54 T', axis: -27, grp: 'crank', dx: 0, anchor: [2.5, -27, -27], color: C.gear },
  crank_shaft:   { label: 'Crank shaft', axis: -27, grp: 'crank', dx: -20, anchor: [-2, -27, 4], color: C.metalish },
  compound_gear: { label: 'Compound gear · 12 T + 54 T', axis: 6, grp: 'idler', dx: 12, anchor: [10.5, 6, 27.5], color: C.gear },
  pinion_output: { label: 'Pinion · 12 T, with hub', axis: 39, grp: 'output', dx: 24, anchor: [12, 39, 7], color: C.gear },
  prop_shaft:    { label: 'Propeller shaft', axis: 39, grp: 'output', dx: -92, anchor: [-10, 39, 2.5], color: C.metalish },
  pin_idler_a:   { label: 'Axle pin', axis: null, grp: null, dx: -26, anchor: [-1, 6, 3], color: C.metalish },
  pin_idler_b:   { label: 'Axle pin', axis: null, grp: null, dx: 44, anchor: [15.5, 6, 3], color: C.metalish },
  pin_prop:      { label: 'Axle pin', axis: null, grp: null, dx: 44, anchor: [17, 39, 3], color: C.metalish },
  crank_handle:  { label: 'Crank handle', axis: -27, grp: 'crank', dx: -92, anchor: [-18, -27, 17.5], color: C.housing },
  propeller:     { label: 'Propeller', axis: 39, grp: 'output', dx: -128, anchor: [-16, 70, -6], color: C.prop },
  cap:           { label: 'Propeller cap*', axis: 39, grp: 'output', dx: -160, anchor: [-27, 39, 6], color: C.housing },
};
export const PART_IDS = Object.keys(PARTS);

const EDGE_DARK = 0x10151b;
const EDGE_GHOST = 0x8fc4ee;

// Printed-plastic material: fine layer lines perpendicular to the build direction,
// faded out with screen-space derivatives so they never alias.
function printedMaterial(color, layerDir, layerH) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  m.userData.uniforms = { uLayerDir: { value: new THREE.Vector3(...layerDir) }, uLayerH: { value: layerH }, uLayerAmp: { value: 0.22 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uLayerDir;\nvarying float vLayerS;\nvarying vec3 vLayerDirV;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLayerS = dot(position, uLayerDir);\nvLayerDirV = normalize((modelViewMatrix * vec4(uLayerDir, 0.0)).xyz);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uLayerH;\nuniform float uLayerAmp;\nvarying float vLayerS;\nvarying vec3 vLayerDirV;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        float ls = vLayerS / uLayerH;
        float lw = fwidth(ls);
        float lfade = 1.0 - smoothstep(0.18, 0.5, lw);
        float wave = sin(ls * 6.2831853);
        normal = normalize(normal + vLayerDirV * wave * uLayerAmp * lfade);
        diffuseColor.rgb *= 1.0 - 0.05 * lfade * (0.5 + 0.5 * wave);`);
  };
  m.customProgramCacheKey = () => 'printed';
  return m;
}

export class Fan {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'fan';
    this.parts = {};
  }

  async load(manifest) {
    const byId = Object.fromEntries(manifest.map((p) => [p.id, p]));
    for (const id of PART_IDS) {
      const info = PARTS[id];
      let geom, edges;
      if (id === 'cap') ({ geom, edges } = makeCap());
      else ({ geom, edges } = await loadPart(id));
      const layerDir = id === 'crank_handle' ? [0, 1, 0] : [1, 0, 0];
      const layerH = byId[id] ? (id.startsWith('shell') ? 0.2 : id === 'propeller' ? 0.12 : 0.16) : 0.12;
      const mats = {
        cad: new THREE.MeshStandardMaterial({ color: info.color, roughness: 0.45, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
        printed: printedMaterial(0xe9e5de, layerDir, layerH),
        ghost: new THREE.MeshStandardMaterial({ color: 0x9fc9ea, roughness: 0.4, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }),
      };
      const mesh = new THREE.Mesh(geom, mats.cad);
      mesh.castShadow = true; mesh.receiveShadow = true;
      const edgeMat = new THREE.LineBasicMaterial({ color: EDGE_DARK, transparent: true, opacity: 0.85 });
      const lines = new THREE.LineSegments(edges, edgeMat);
      const root = new THREE.Group(), pivot = new THREE.Group(), body = new THREE.Group();
      const ay = info.axis ?? 0;
      pivot.position.set(0, ay, 0); body.position.set(0, -ay, 0);
      body.add(mesh, lines); pivot.add(body); root.add(pivot);
      root.name = id;
      this.group.add(root);
      this.parts[id] = { id, info, root, pivot, body, mesh, lines, mats, edgeMat, geom, manifest: byId[id] };
    }
    this.makePropBlur();
    this.reset();
    return this;
  }

  // Motion blur for the propeller: faint copies trailing behind the blades.
  makePropBlur() {
    const p = this.parts.propeller;
    this.blur = [];
    for (let k = 1; k <= 7; k++) {
      const m = new THREE.Mesh(p.geom, new THREE.MeshStandardMaterial({ color: 0xd6dbe0, roughness: 0.5, transparent: true, opacity: 0, depthWrite: false }));
      const piv = new THREE.Group(); piv.position.set(0, 39, 0);
      const b = new THREE.Group(); b.position.set(0, -39, 0); b.add(m); piv.add(b);
      p.root.add(piv);
      this.blur.push({ piv, m });
    }
  }

  reset() {
    this.group.visible = true;
    this.group.position.set(0, 0, 0); this.group.rotation.set(0, 0, 0); this.group.scale.set(1, 1, 1);
    for (const p of Object.values(this.parts)) {
      p.root.visible = true; p.root.position.set(0, 0, 0); p.root.rotation.set(0, 0, 0); p.root.matrixAutoUpdate = true;
      p.pivot.rotation.set(0, 0, 0);
      for (const m of Object.values(p.mats)) if (m.clippingPlanes && m.clippingPlanes.length) m.clippingPlanes = [];
      p.mats.printed.userData.uniforms.uLayerAmp.value = 0.22;
      p.mats.printed.roughness = 0.62;
      this.setMode(p.id, 'cad');
    }
    this.theta = 0;
    this.setPropBlur(0, 0);
  }

  // mode: 'cad' | 'printed' | 'ghost' | 'hidden'; opts: opacity, edges (0..1), emissive colour + strength
  setMode(id, mode, opts = {}) {
    const p = this.parts[id];
    if (mode === 'hidden') { p.root.visible = false; return; }
    p.root.visible = true;
    const mat = p.mats[mode];
    p.mesh.material = mat;
    const op = opts.opacity ?? (mode === 'ghost' ? 0.1 : 1);
    if (mode !== 'ghost') {
      mat.transparent = op < 0.999; mat.opacity = op; mat.depthWrite = op >= 0.999;
    } else mat.opacity = op;
    p.mesh.visible = op > 0.001;
    mat.emissive.setHex(opts.emissive ?? 0x000000);
    mat.emissiveIntensity = opts.glow ?? 0;
    const eo = opts.edges ?? (mode === 'cad' ? 0.85 : mode === 'ghost' ? 0.32 : 0);
    p.edgeMat.color.setHex(mode === 'ghost' ? EDGE_GHOST : EDGE_DARK);
    p.edgeMat.opacity = eo * (mode === 'ghost' ? 1 : Math.min(1, op * 1.2));
    p.lines.visible = eo > 0.001;
    p.mode = mode;
  }

  setAll(mode, opts) { for (const id of PART_IDS) this.setMode(id, mode, opts); }

  // Crank angle in radians (positive = clockwise seen from the crank side, i.e. from -X).
  setCrank(theta) {
    this.theta = theta;
    for (const p of Object.values(this.parts)) {
      const g = p.info.grp;
      p.pivot.rotation.x = g === 'crank' ? theta : g === 'idler' ? -theta * RATIO_1 : g === 'output' ? theta * RATIO : 0;
    }
  }

  // omega: propeller angular speed (rad/s); shutter: exposure time (s). Shows trailing copies when fast.
  setPropBlur(omega, shutter = 1 / 60) {
    const sweep = Math.abs(omega) * shutter;
    const on = sweep > 0.12 && this.parts.propeller.root.visible && this.parts.propeller.mesh.material === this.parts.propeller.mats.cad;
    const base = this.parts.propeller.pivot.rotation.x;
    this.blur.forEach((b, k) => {
      b.m.visible = on;
      if (!on) return;
      b.piv.rotation.x = base - Math.sign(omega) * sweep * (k + 1) / this.blur.length;
      b.m.material.opacity = 0.22 * (1 - k / this.blur.length) * Math.min(1, sweep / 0.6);
    });
    // The real blades fade a little as the blur grows, as on a long exposure.
    if (on) {
      const p = this.parts.propeller;
      const op = 1 - 0.55 * Math.min(1, sweep / 1.2);
      p.mats.cad.transparent = op < 0.999; p.mats.cad.opacity = op; p.mats.cad.depthWrite = op >= 0.999;
    }
  }

  // Explode along X: f is 0..1 globally; per-part delays come from the stagger function.
  explode(f, stagger = null) {
    for (const p of Object.values(this.parts)) {
      const fi = stagger ? stagger(p.id, f) : f;
      p.root.position.x = p.info.dx * fi;
    }
  }

  // World-space position of a part's label anchor (follows explode, rotation and the fan transform).
  anchorWorld(id, out = new THREE.Vector3()) {
    const p = this.parts[id];
    out.set(...p.info.anchor);
    p.body.updateWorldMatrix(true, false);
    return out.applyMatrix4(p.body.matrixWorld);
  }

  // World position of a CAD-frame point carried by part id (or the fan frame if id is null).
  pointWorld(id, xyz, out = new THREE.Vector3()) {
    out.set(...xyz);
    const obj = id ? this.parts[id].body : this.group;
    obj.updateWorldMatrix(true, false);
    return out.applyMatrix4(obj.matrixWorld);
  }
}

// The propeller cap is not in the IGES export; it is reconstructed from the team's exploded-view
// renders as a dome sized to the propeller hub face (diameter 20 mm), sitting on the hub at X = -22.
function makeCap() {
  const R = 10, H = 7.5, pts = [];
  pts.push(new THREE.Vector2(0.001, 0));
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI / 2;
    pts.push(new THREE.Vector2(R * Math.cos(a) + 0.001, H * Math.sin(a)));
  }
  const lathe = new THREE.LatheGeometry(pts.reverse(), 64);
  // Lathe axis is +Y; turn it so the dome axis is -X, centred on the propeller axis.
  lathe.rotateZ(Math.PI / 2);
  lathe.translate(-22, 39, 0);
  lathe.computeVertexNormals();
  const ring = [];
  for (let i = 0; i < 96; i++) {
    const a0 = (i / 96) * Math.PI * 2, a1 = ((i + 1) / 96) * Math.PI * 2;
    ring.push(-22, 39 + R * Math.cos(a0), R * Math.sin(a0), -22, 39 + R * Math.cos(a1), R * Math.sin(a1));
  }
  const edges = new THREE.BufferGeometry();
  edges.setAttribute('position', new THREE.Float32BufferAttribute(ring, 3));
  return { geom: lathe, edges };
}
