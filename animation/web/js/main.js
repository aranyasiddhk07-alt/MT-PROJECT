// Frame-accurate renderer for the 180 s animation. window.renderFrame(t) draws the frame at time t.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Fan } from './fan.js';
import { Overlay } from './overlay.js';
import { loadJSON } from './assets.js';
import { ramp, smooth } from './util.js';
import opening from './scenes/opening.js';
import cad from './scenes/cad.js';
import stl from './scenes/stl.js';
import slicing from './scenes/slicing.js';
import printing from './scenes/printing.js';
import finishing from './scenes/finishing.js';
import assembly from './scenes/assembly.js';
import closing from './scenes/closing.js';

const SCENES = { opening, cad, stl, slicing, printing, finishing, assembly, closing };

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(1920, 1080, false);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(30, 1920 / 1080, 1, 6000);

// Lights: warm-neutral key with soft shadows, cool rim to separate the model from the dark background.
const hemi = new THREE.HemisphereLight(0xdfe9f5, 0x1a1f26, 0.55);
const key = new THREE.DirectionalLight(0xfff6ec, 2.4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.4;
Object.assign(key.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 10, far: 1600 });
const rim = new THREE.DirectionalLight(0x9fd8ff, 1.6);
const fill = new THREE.DirectionalLight(0xc9d6e6, 0.5);
scene.add(hemi, key, key.target, rim, fill);

// Shadow catcher.
const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.32 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const fan = new Fan();
scene.add(fan.group);
const ov = new Overlay(camera);

const ctx = {
  THREE, scene, camera, renderer, fan, ov, ground, lights: { hemi, key, rim, fill },
  stages: null, objects: {},
  setCam(pos, target, fov = 30) {
    camera.position.set(...pos);
    camera.fov = fov; camera.updateProjectionMatrix();
    camera.lookAt(new THREE.Vector3(...target));
    camera.updateMatrixWorld();
  },
  // Key light placed relative to a target point.
  setKey(dir, target = [0, 0, 0], intensity = 2.4) {
    key.position.set(target[0] + dir[0], target[1] + dir[1], target[2] + dir[2]);
    key.target.position.set(...target); key.target.updateMatrixWorld();
    key.intensity = intensity;
  },
  stageAt(t) { return ctx.stages.find((s) => t >= s.start && t < s.end) || ctx.stages[ctx.stages.length - 1]; },
};

function resetWorld() {
  fan.reset();
  for (const o of Object.values(ctx.objects)) o.visible = false;
  ground.visible = true; ground.position.set(0, -80, 0); ground.material.opacity = 0.32;
  hemi.intensity = 0.55; rim.intensity = 1.6; fill.intensity = 0.5;
  rim.position.set(220, 140, -260); fill.position.set(-200, -60, 160);
  ctx.setKey([-180, 260, 200], [0, 0, 0], 2.4);
  scene.environmentIntensity = 0.55;
  renderer.toneMappingExposure = 1.0;
}

window.renderFrame = (t) => {
  resetWorld();
  ov.begin();
  const st = ctx.stageAt(t);
  SCENES[st.id].apply(t, ctx, st);
  // Shared chrome: progress bar and stage header, plus a soft dip at each stage change.
  const first = ctx.stages.find((s) => s.n === 1), last = ctx.stages.find((s) => s.n === 6);
  const pOp = Math.min(ramp(t, first.start + 0.3, first.start + 1.2, smooth), 1 - ramp(t, last.end - 0.2, last.end + 0.6, smooth));
  ov.progress(t, ctx.stages, pOp);
  if (st.n) ov.chapter(st, Math.min(ramp(t - st.start, 2.5, 3.1, smooth), 1 - ramp(t, st.end - 0.25, st.end, smooth)));
  // No dip into Stage 1: the opening camera move continues straight into it.
  const dipIn = st.id === 'cad' ? 0 : 1 - ramp(t, st.start, st.start + 0.35, smooth);
  if (st.id !== 'opening' && st.id !== 'closing') ov.fade = Math.max(ov.fade, 0.55 * Math.max(dipIn, ramp(t, st.end - 0.25, st.end, smooth)));
  renderer.render(scene, camera);
  ov.end();
  return st.id;
};

(async () => {
  const cfg = await loadJSON('/narration.json');
  ctx.stages = cfg.stages;
  const manifest = await loadJSON('/web/assets/parts.json');
  await fan.load(manifest);
  for (const s of Object.values(SCENES)) if (s.setup) await s.setup(ctx);
  await document.fonts.ready;
  await Promise.all(['700 40px "Barlow Condensed"', '600 40px "Barlow Condensed"', '500 40px "Barlow Condensed"', '400 20px Inter', '600 20px Inter', '400 20px "JetBrains Mono"', '600 20px "JetBrains Mono"'].map((f) => document.fonts.load(f)));
  window.renderFrame(0);
  window.ready = true;
})().catch((e) => { window.loadError = String(e && e.stack || e); console.error(e); });
