// Bootstrap: pick a city (?city=kyiv), build the world, run the loop.
import * as THREE from 'three';
import { cities } from './cities/index.js';
import { Timeline } from './engine/timeline.js';
import { World } from './engine/world.js';
import { CameraRig } from './engine/controls.js';
import { UI } from './engine/ui.js';

const params = new URLSearchParams(location.search);
const cityId = params.get('city') || 'kyiv';
const loadCity = cities[cityId] || cities.kyiv;

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.5, 9000);

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const loaderEl = document.getElementById('loader');
const loaderFill = document.getElementById('loader-fill');
const loaderSub = document.getElementById('loader-sub');

async function start() {
  const cfg = await loadCity();
  document.title = `History in 3D — Walk Through ${cfg.name}`;
  document.getElementById('loader-title').textContent = cfg.name;

  const timeline = new Timeline(cfg.stops);
  const world = new World(cfg, timeline, (p, label) => {
    loaderFill.style.width = `${p * 100}%`;
    loaderSub.textContent = label;
  });
  const rig = new CameraRig(camera, canvas, timeline, cfg.terrain.heightAt);
  const ui = new UI(timeline, cfg);
  ui.onNavigate = () => rig.reattach();      // era jumps fly you back to the vantage
  ui.onNavigateSoft = () => {};              // wheel scrub keeps your position
  // street-view toggle: drop to a curated eye-level spot for this era
  // (or straight down from wherever you are), press again to fly back up
  ui.onStreetToggle = (instant = false) => {
    if (rig.freeMode) { rig.reattach(); return; }
    const stop = cfg.stops[timeline.nearestStopIndex(timeline.year)];
    if (stop.street) rig.dropTo(stop.street.pos, stop.street.look, instant);
    else {
      const p = camera.position;
      rig.dropTo([p.x, cfg.terrain.heightAt(p.x, p.z) + 2.4, p.z], null, instant);
    }
  };

  // deep-link: ?year=1037 starts the journey at that year
  const startYear = parseFloat(params.get('year'));
  let startStop = cfg.stops[0];
  if (!Number.isNaN(startYear)) {
    timeline.year = timeline.target = Math.max(timeline.minYear, Math.min(timeline.maxYear, startYear));
    startStop = cfg.stops[timeline.nearestStopIndex(timeline.year)];
  }
  camera.position.set(...startStop.camera.pos);
  camera.lookAt(...startStop.camera.look);

  let last = performance.now();
  let firstFrames = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    timeline.update(dt);
    const seg = world.update(dt);
    rig.update(dt, cfg.stops, seg);
    ui.update();
    renderer.render(world.scene, camera);
    if (++firstFrames === 3) {
      if (params.has('snap')) loaderEl.remove();   // instant reveal (screenshots)
      else {
        loaderEl.classList.add('done');            // reveal once warm
        setTimeout(() => loaderEl.remove(), 800);
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // open the first story after the intro settles
  setTimeout(() => { if (timeline.atStop() === 0) ui.showStory(0); }, 1800);
  // ?street=1 deep-links straight into street level
  if (params.has('street')) setTimeout(() => ui.onStreetToggle(params.has('snap')), 300);
}

start().catch((err) => {
  loaderSub.textContent = `Failed to load: ${err.message}`;
  console.error(err);
});
