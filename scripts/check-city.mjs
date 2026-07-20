#!/usr/bin/env node
// Validate a city config against the project's quality bar:
//   node scripts/check-city.mjs kyiv
//   node scripts/check-city.mjs mycity
// Exits non-zero on errors (warnings don't fail the build).
import { validateCity } from '../src/engine/validate.js';

const id = process.argv[2];
if (!id) {
  console.error('usage: node scripts/check-city.mjs <cityId>   (e.g. kyiv, dnipro, london, template, or your new city)');
  process.exit(2);
}

let mod;
try {
  mod = await import(`../src/cities/${id === 'template' ? '_template' : id}.js`);
} catch (e) {
  console.error(`could not load src/cities/${id}.js — ${e.message}`);
  process.exit(2);
}
if (typeof mod.buildConfig !== 'function') {
  console.error(`src/cities/${id}.js must export a buildConfig() function`);
  process.exit(2);
}

const cfg = mod.buildConfig();
const { errors, warnings } = validateCity(cfg);

console.log(`\n${cfg.name || id} — validation report`);
console.log('─'.repeat(44));
if (!errors.length && !warnings.length) console.log('✓ passes all quality checks\n');
for (const e of errors) console.log(`  ERROR    ${e}`);
for (const w of warnings) console.log(`  warning  ${w}`);
if (errors.length || warnings.length) {
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  console.log(errors.length
    ? 'Fix the errors — the city will misbehave until they are resolved.\n'
    : 'No errors — the warnings are the gap between "works" and the reference-city bar.\n');
}
process.exit(errors.length ? 1 : 0);
