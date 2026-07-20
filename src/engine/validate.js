// City config validator. Runs in the browser on load (console report) and
// from the CLI: node scripts/check-city.mjs <cityId>
// Its job is to hold every city — including contributed ones — to the same
// quality bar: enough eras, working cameras, street grids, life systems,
// and honest structure phases.

// Keep in sync with the generator names in src/engine/buildings.js.
// (The browser passes the live list; this snapshot serves the Node CLI,
// which cannot import three.js-dependent modules.)
const GENERATOR_SNAPSHOT = [
  'dugout', 'hut', 'townhouse', 'stalinka', 'panelka', 'glassTower',
  'palisade', 'rampart', 'idol', 'church', 'gate', 'bellTower', 'woodCastle',
  'classical', 'motherland', 'column', 'bridge', 'housedBridge', 'towerBridge',
  'ferrisWheel', 'ruin', 'woodChurch', 'stadium', 'factory', 'menorah',
  'rocket', 'flag', 'hedgehogs', 'road', 'plaza', 'lampline', 'streetGrid',
];

export function validateCity(cfg, opts = {}) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);
  const gens = new Set(opts.generatorNames || GENERATOR_SNAPSHOT);

  // ---------- basics ----------
  if (!cfg.id) err('config needs an `id` (lowercase, used in ?city=)');
  if (!cfg.name) err('config needs a display `name`');

  // ---------- terrain ----------
  const t = cfg.terrain || {};
  if (typeof t.heightAt !== 'function') err('terrain.heightAt(x, z) function is required');
  if (!t.size) err('terrain.size is required (world span in metres, e.g. 2600)');
  const heightAt = typeof t.heightAt === 'function' ? t.heightAt : () => 0;
  if (typeof t.heightAt === 'function') {
    for (const [x, z] of [[0, 0], [t.size / 2 - 1 || 500, 0], [0, -(t.size / 2 - 1) || -500], [123.4, -567.8]]) {
      const h = t.heightAt(x, z);
      if (!Number.isFinite(h)) err(`terrain.heightAt(${x}, ${z}) returned ${h} — must be a finite number`);
    }
  }
  if (!Array.isArray(t.urbanZones) || t.urbanZones.length === 0) {
    warn('no terrain.urbanZones — the ground will stay meadow forever; add zones so districts pave over as they urbanize');
  }

  // ---------- stops ----------
  const stops = cfg.stops || [];
  if (stops.length < 2) err('at least 2 era stops are required');
  else if (stops.length < 8) warn(`only ${stops.length} era stops — reference cities use 14-18; consider covering more of the city's arc`);
  let missingContext = 0, missingCaption = 0, majors = 0;
  stops.forEach((s, i) => {
    const label = `stops[${i}] (${s.year ?? '?'})`;
    if (typeof s.year !== 'number') err(`${label}: numeric year required`);
    if (i > 0 && stops[i - 1].year >= s.year) err(`${label}: stops must be strictly sorted by year (previous is ${stops[i - 1].year})`);
    if (!s.title) err(`${label}: title required`);
    if (!s.story) warn(`${label}: no story — every stop should teach something`);
    if (!s.context) missingContext++;
    if (!s.caption) missingCaption++;
    if (s.major) majors++;
    const cam = s.camera || {};
    if (!Array.isArray(cam.pos) || cam.pos.length !== 3 || !Array.isArray(cam.look) || cam.look.length !== 3) {
      err(`${label}: camera.pos and camera.look must be [x, y, z]`);
    } else {
      const ground = heightAt(cam.pos[0], cam.pos[2]);
      if (cam.pos[1] < ground + 2) err(`${label}: camera is underground (y=${cam.pos[1].toFixed(1)}, terrain=${ground.toFixed(1)})`);
    }
    const env = s.env || {};
    for (const key of ['skyTop', 'skyBottom']) {
      if (!env[key]) err(`${label}: env.${key} required (per-era sky colors are what sell the transitions)`);
    }
  });
  if (missingContext) warn(`${missingContext} stop(s) without a context block — the "bigger picture" panel is part of the format`);
  if (missingCaption) warn(`${missingCaption} stop(s) without a caption (the line shown during transit)`);
  if (stops.length >= 8 && majors < 3) warn('mark 4-8 pivotal stops with major: true so they get timeline labels');

  // ---------- structures ----------
  const ids = new Set();
  let roadCount = 0, gridCount = 0, plazaCount = 0, lampCount = 0;
  for (const entry of cfg.structures || []) {
    const label = `structure "${entry.id || '?'}"`;
    if (!entry.id) err('every structure needs an id');
    else if (ids.has(entry.id)) err(`duplicate structure id "${entry.id}"`);
    ids.add(entry.id);
    if (!Array.isArray(entry.pos) || entry.pos.length !== 2) err(`${label}: pos must be [x, z]`);
    if (!Array.isArray(entry.phases) || !entry.phases.length) err(`${label}: needs at least one phase`);
    for (const phase of entry.phases || []) {
      if (!gens.has(phase.build)) err(`${label}: unknown generator "${phase.build}"`);
      if (typeof phase.from !== 'number') err(`${label}: phase.from year required`);
      if (phase.to != null && phase.to <= phase.from) err(`${label}: phase.to (${phase.to}) must be after from (${phase.from})`);
      if (phase.build === 'road') roadCount++;
      if (phase.build === 'streetGrid') gridCount++;
      if (phase.build === 'plaza') plazaCount++;
      if (phase.build === 'lampline') lampCount++;
    }
  }
  if (roadCount < 6) warn(`only ${roadCount} road phase(s) — reference cities have 15-30 (arterials with era phases: dirt -> cobble -> asphalt)`);
  if (gridCount === 0) warn('no streetGrid structures — without them the modern city will not read like a map; give each district a grid (see CITY_GUIDE.md)');
  if (plazaCount === 0) warn('no plazas — squares and junction pads knit the road network together');
  if (lampCount === 0) warn('no lamplines — streetlights are a cheap, huge win at street level');

  // ---------- districts ----------
  const districts = cfg.districts || [];
  if (!districts.length) warn('no districts — landmarks alone will not look like a city; add generic era-phased building fabric');
  for (const d of districts) {
    const label = `district "${d.id || '?'}"`;
    if (!Array.isArray(d.area) || d.area.length !== 4) err(`${label}: area must be [x, z, rx, rz]`);
    for (const phase of d.phases || []) {
      const styles = Array.isArray(phase.style) ? phase.style : [phase.style];
      for (const st of styles) {
        const gen = typeof st === 'string' ? st : st?.gen;
        if (!gens.has(gen)) err(`${label}: unknown district generator "${gen}"`);
      }
      if (!phase.count) warn(`${label}: phase has no count`);
    }
  }

  // ---------- effects / life ----------
  const fx = cfg.effects || {};
  if (!fx.traffic?.length) warn('no traffic — carts/trams/cars/buses are what make streets feel alive');
  if (!fx.boats?.length && cfg.terrain?.waterLevel != null) warn('no boats — if the city has water, put something on it');
  if (!fx.crowds?.length) warn('no crowds — at least one historic gathering makes an era memorable');
  if (!fx.groves?.length) warn('no groves — cities need trees');
  if (!fx.fires?.length) warn('no fires/smoke — most cities have at least one catastrophe or industrial era to show');

  return { errors, warnings };
}

// Pretty console report; returns true if the config is usable (no errors).
export function reportValidation(cfg, opts = {}) {
  const { errors, warnings } = validateCity(cfg, opts);
  const log = opts.log || console;
  const name = cfg?.name || cfg?.id || 'city';
  if (!errors.length && !warnings.length) {
    log.info(`✓ ${name}: config passes all quality checks`);
    return true;
  }
  if (errors.length) {
    log.error(`✗ ${name}: ${errors.length} error(s) — the city will misbehave until these are fixed:`);
    for (const e of errors) log.error(`   • ${e}`);
  }
  if (warnings.length) {
    log.warn(`△ ${name}: ${warnings.length} quality warning(s) — reference-city bar not met yet:`);
    for (const w of warnings) log.warn(`   • ${w}`);
  }
  return errors.length === 0;
}
