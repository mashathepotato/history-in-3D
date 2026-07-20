// ============================================================
//  CITY TEMPLATE — copy this file to src/cities/yourcity.js
// ============================================================
// A tiny fictional river town that exercises every engine feature.
// Preview it at ?city=template — then replace every part with YOUR city.
//
// The workflow that produced Kyiv, Dnipro and London (see CITY_GUIDE.md):
//   1. RESEARCH first. Collect real dates, materials, colors, heights,
//      destruction events. Flag legends as legends in the stories.
//   2. GEOGRAPHY: write heightAt(x, z) — river bed below waterLevel,
//      hills as gaussians, plateaus with smoothstep. 1 unit = 1 metre,
//      north = -z, east = +x. Keep it deterministic (no Math.random).
//   3. LANDMARKS as structures with phases: built → re-dressed →
//      destroyed → rebuilt, each with its real years.
//   4. FABRIC: districts of generic buildings per era + a streetGrid per
//      district so the city reads like a map.
//   5. LIFE: roads, plazas, lamplines, traffic, boats, crowds, groves,
//      fires. Era-gate everything.
//   6. STOPS: 14-18 era keyframes with camera vantage, sky/light mood,
//      and an educational story + bigger-picture context.
//   7. VALIDATE: node scripts/check-city.mjs yourcity
//      (this template intentionally leaves a few warnings — they are
//      your to-do list when you copy it.)

const WATER_Y = 2;

// ---------- geography ----------
// A north-south river with one bend; town hill on the west bank.
const riverX = (z) => 400 + 120 * Math.sin(z * 0.0012);
const gauss = (x, z, cx, cz, r, amp) => {
  const dx = x - cx, dz = z - cz;
  return amp * Math.exp(-(dx * dx + dz * dz) / (r * r));
};
const sstep = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function heightAt(x, z) {
  const d = x - riverX(z);
  const HW = 110;                       // river half-width
  const noise = Math.sin(x * 0.009 + z * 0.004) * Math.cos(z * 0.007) * 1.2;
  let h;
  if (Math.abs(d) <= HW) {
    h = WATER_Y - 6 * (1 - (Math.abs(d) / HW) ** 2);            // river bed
  } else if (d > HW) {
    h = 4 + noise * 0.5;                                        // flat east bank
  } else {
    h = 5 + 30 * sstep(0, 260, -d - HW) + noise;                // west bluffs
    h += gauss(x, z, -150, -100, 250, 12);                      // the town hill
  }
  return h;
}

// ---------- shared routes (roads + lamps + traffic reuse these) ----------
const HIGH_ST = [[-450, -60], [-200, -80], [50, -60], [255, -40]];   // hill → bridge
const RIVER_RD = [];
for (let z = -500; z <= 500; z += 100) RIVER_RD.push([riverX(z) - 130, z]);
const riverPath = [];
for (let z = -700; z <= 700; z += 100) riverPath.push([riverX(z), z]);

export function buildConfig() {
  return {
    id: 'template',
    name: 'Newtown',                    // ← your city
    terrain: {
      size: 2000, segments: 200, heightAt,
      waterLevel: WATER_Y,
      grassColor: '#5c7345', dirtColor: '#8a7a58', sandColor: '#b5a377',
      waterDeep: '#22506b', waterShallow: '#3f7d96',
      // the ground pave-over: each zone turns from meadow to city after its year
      urbanZones: [
        { x: -150, z: -90, rx: 260, rz: 200, year: 1520, strength: 0.35 },
        { x: -150, z: -90, rx: 290, rz: 230, year: 1860, strength: 0.55 },
        { x: 620, z: 60, rx: 220, rz: 260, year: 1955, strength: 0.5 },
      ],
    },

    // ================= STRUCTURES (landmarks with life stories) =========
    structures: [
      // a wooden fort that becomes a stone castle, sacked in 1710
      { id: 'fort', pos: [0, 0], phases: [
        { from: 1015, to: 1250, build: 'palisade', params: { path: [[-220, -170], [-100, -190], [-70, -100], [-160, -50], [-230, -90], [-220, -170]], h: 4.5 }, rise: 15 },
      ]},
      { id: 'castle', pos: [-150, -120], rotY: 0.4, phases: [
        { from: 1250, to: 1710, build: 'woodCastle', params: {}, rise: 15, fall: 0.5, sinkDepth: 18 },  // fall: destruction is FAST
        { from: 1710, to: 1890, build: 'ruin', params: { seed: 5, n: 12, spread: 20, maxSize: 4 }, rise: 2 },
      ]},
      // the church: medieval → baroque re-dressing (two phases, same spot)
      { id: 'church', pos: [-120, -30], rotY: 0.2, phases: [
        { from: 1180, to: 1740, build: 'church', params: { wallStyle: 'plinthite', wall: '#c9b3a0',
          domeStyle: 'helmet', domeColor: '#a8b2c0', w: 18, d: 24, h: 12, apses: 1,
          domes: [{ x: 0, z: 0, r: 3.4, drumH: 6 }] }, rise: 20 },
        { from: 1740, to: 9999, build: 'church', params: { wallStyle: 'baroque', wall: '#f2ede0', accent: '#d9cfb8',
          domeStyle: 'pear', domeColor: 'gold', w: 20, d: 26, h: 14, apses: 1,
          domes: [{ x: 0, z: 0, r: 3.4, drumH: 7 }] }, rise: 8 },
      ]},
      { id: 'bridge', pos: [400, 20], phases: [
        { from: 1620, to: 9999, build: 'bridge', params: { len: 330, w: 10, deckY: 12, arches: true, color: 0x8a8272 }, rise: 6 },
      ]},
      { id: 'mill', pos: [560, -180], rotY: 0.2, phases: [
        { from: 1885, to: 1985, build: 'factory', params: { sheds: 2, stacks: 2, stackH: 34, furnace: false, seed: 6 }, rise: 5, fall: 4 },
      ]},
      { id: 'tower', pos: [660, 140], phases: [
        { from: 2008, to: 9999, build: 'glassTower', params: { w: 18, d: 18, h: 70 }, rise: 4 },
      ]},

      // ---- roads: arterials with era phases (dirt → cobble → asphalt) ----
      { id: 'road-high-st', pos: [0, 0], phases: [
        { from: 1100, to: 1700, build: 'road', params: { path: HIGH_ST, w: 6, color: 0x84714f }, rise: 40 },
        { from: 1700, to: 1950, build: 'road', params: { path: HIGH_ST, w: 9, color: 0x8d8578, sidewalk: true }, rise: 10 },
        { from: 1950, to: 9999, build: 'road', params: { path: HIGH_ST, w: 11, color: 0x4f5257, sidewalk: true, line: true }, rise: 4 },
      ]},
      { id: 'road-river', pos: [0, 0], phases: [
        { from: 1958, to: 9999, build: 'road', params: { path: RIVER_RD, w: 11, color: 0x4f5257, line: true }, rise: 5 },
      ]},
      { id: 'road-bridge-east', pos: [0, 0], phases: [
        { from: 1620, to: 9999, build: 'road', params: { path: [[545, 45], [680, 60], [820, 70]], w: 8, color: 0x8d8578 }, rise: 6 },
      ]},
      // squares + junction pads hide seams where roads meet
      { id: 'plaza-market', pos: [-90, -70], phases: [
        { from: 1520, to: 9999, build: 'plaza', params: { rx: 28, rz: 24, color: 0x8d8578 }, rise: 15 },
      ]},
      // streetlights (gas → modern)
      { id: 'lamps-high-st', pos: [0, 0], phases: [
        { from: 1868, to: 1952, build: 'lampline', params: { path: HIGH_ST, style: 'gas', offset: 6, spacing: 34 }, rise: 4 },
        { from: 1952, to: 9999, build: 'lampline', params: { path: HIGH_ST, style: 'modern', offset: 7, spacing: 44 }, rise: 3 },
      ]},
      // ---- the capillary street network: one grid per district ----
      { id: 'grid-old-town', pos: [0, 0], phases: [
        { from: 1200, to: 1720, build: 'streetGrid', params: { area: [-150, -90, 250, 190], angle: 0.15, spacing: 56, seed: 41, w: 4.5, color: 0x84714f, wobble: 0.45 }, rise: 60 },
        { from: 1720, to: 1952, build: 'streetGrid', params: { area: [-150, -90, 250, 190], angle: 0.15, spacing: 56, seed: 41, w: 5.5, color: 0x8d8578, wobble: 0.45 }, rise: 10 },
        { from: 1952, to: 9999, build: 'streetGrid', params: { area: [-150, -90, 250, 190], angle: 0.15, spacing: 56, seed: 41, w: 5.5, color: 0x53565a, wobble: 0.45 }, rise: 5 },
      ]},
      { id: 'grid-east', pos: [0, 0], phases: [
        { from: 1958, to: 9999, build: 'streetGrid', params: { area: [620, 60, 210, 250], angle: 0.05, spacing: 90, seed: 42, w: 8, color: 0x53565a }, rise: 8 },
      ]},
    ],

    // ================= DISTRICTS (generic fabric per era) ================
    districts: [
      { id: 'old-town', area: [-150, -90, 240, 180], seed: 11, gridAngle: 0.15, phases: [
        { from: 1050, to: 1710, style: { gen: 'hut', vary: { w: [4.5, 7], d: [4, 6] } }, count: 40, rise: 60, fall: 1 },
        { from: 1715, to: 1900, style: { gen: 'townhouse', vary: { w: [10, 15], d: [8, 12], floors: [2, 3.8] } }, count: 44, rise: 20 },
        { from: 1900, to: 9999, style: [
          { gen: 'townhouse', vary: { w: [10, 16], d: [9, 12], floors: [3, 4.9] } },
          { gen: 'stalinka', vary: { w: [22, 30], d: [13, 16], floors: [4, 6.5] } },
        ], count: 46, rise: 12 },
      ]},
      { id: 'east-bank', area: [620, 60, 200, 240], seed: 12, gridAngle: 0.05, phases: [
        { from: 1890, to: 1958, style: { gen: 'hut', vary: { w: [4.5, 7], d: [4, 6] } }, count: 20, rise: 20 },
        { from: 1962, to: 9999, style: { gen: 'panelka', vary: { w: [22, 32], d: [11, 14], floors: [6, 12.9] } }, count: 34, rise: 10 },
      ]},
    ],

    // ================= EFFECTS (life) ====================================
    effects: {
      birdCenter: [0, 0, 0],
      birdRadius: 350,
      fires: [
        { pos: [-150, 20, -120], radius: 40, from: 1709.9, to: 1711, intensity: 1 },        // the sack of 1710
        { pos: [545, 6, -190], radius: 25, from: 1886, to: 1982, intensity: 0.6, smokeOnly: true },  // mill smoke
      ],
      boats: [
        { from: 1100, to: 1900, style: 'sail', path: riverPath, speed: 0.006 },
        { from: 1900, to: 9999, style: 'barge', path: riverPath.map(([x, z]) => [x - 25, z]), speed: 0.008 },
      ],
      traffic: [
        { from: 1200, to: 1920, path: HIGH_ST, type: 'cart', count: 2, speed: 0.006, seed: 21 },
        { from: 1955, to: 9999, path: HIGH_ST, type: 'car', count: 4, speed: 0.02, offset: 4, seed: 22 },
        { from: 1960, to: 9999, path: RIVER_RD, type: 'bus', count: 1, speed: 0.012, seed: 23 },
      ],
      crowds: [
        { from: 1519.5, to: 1521, area: [-90, -70, 30, 25], count: 60,
          colors: ['#8a5a3a', '#5a6a8a', '#a0846a'], seed: 31 },                            // market charter festival
      ],
      groves: [
        { area: [-400, 300, 300, 250], count: 70, kind: 'oak', seed: 32 },
        { area: [700, -300, 250, 200], count: 40, kind: 'poplar', seed: 33 },
      ],
    },

    // ================= ERA STOPS =========================================
    // The reference cities use 14-18 stops. This template ships 5 so the
    // validator's warnings become your checklist. Every stop needs:
    // camera vantage, env mood, story + context.
    stops: [
      {
        year: 1015, major: true, title: 'The Ford and the Fort', kicker: 'Foundation · 11th century',
        caption: 'A palisade above the crossing…',
        transitTitle: 'First timbers…',
        camera: { pos: [-350, 90, -350], look: [-140, 30, -110] },
        env: { skyTop: '#7fa8d0', skyBottom: '#e8cfa0', sunDir: [0.7, 0.35, -0.4], sunColor: '#ffdca0', sunIntensity: 2.1, ambient: 0.9, fogColor: '#d8c8a8', fogDensity: 0.0009, haze: 0.5 },
        story: `<p><b>Replace with researched history.</b> Who settled here, when, and why this spot — the ford? the hill? the trade route? Two short paragraphs. Bold the <b>key names and dates</b>.</p>`,
        context: `The bigger picture: how this moment connects to the region's history. Flag legends honestly (“the founding date is traditional, not archaeological”).`,
      },
      {
        year: 1520, title: 'The Market Charter', kicker: 'Town rights · 1520',
        caption: 'A square, a charter, a crowd.',
        transitTitle: 'The town finds its feet…',
        camera: { pos: [-320, 80, 220], look: [-100, 25, -60] },
        env: { skyTop: '#6fa5d8', skyBottom: '#e8d8b0', sunDir: [0.5, 0.55, -0.4], sunColor: '#fff0c8', sunIntensity: 2.3, ambient: 0.95, fogColor: '#d8d4c4', fogDensity: 0.00075, haze: 0.45 },
        story: `<p><b>Replace.</b> The medieval/early-modern turning point: market rights, a castle, a siege, a fire. Put the crowd effect at the right spot and year.</p>`,
        context: `Tie-in with the wider era.`,
      },
      {
        year: 1890, title: 'Steam Arrives', kicker: 'Industrial era · 19th century',
        caption: 'A chimney taller than the church.',
        transitTitle: 'Rails and smoke…',
        camera: { pos: [250, 100, -450], look: [520, 20, -170] },
        env: { skyTop: '#8a9caa', skyBottom: '#ccb894', sunDir: [0.4, 0.45, -0.4], sunColor: '#ecd8ac', sunIntensity: 1.9, ambient: 0.85, fogColor: '#b4a88c', fogDensity: 0.001, haze: 0.6 },
        story: `<p><b>Replace.</b> Industry, railways, boomtown growth — whatever your city's 19th century actually was.</p>`,
        context: `Bigger picture.`,
      },
      {
        year: 1965, title: 'The Concrete Decades', kicker: 'Postwar · 20th century',
        caption: 'The east bank fills with towers.',
        transitTitle: 'Cranes over the river…',
        camera: { pos: [900, 110, 400], look: [620, 25, 60] },
        env: { skyTop: '#6fa5d4', skyBottom: '#dcd8c0', sunDir: [0.5, 0.6, -0.35], sunColor: '#fff2cc', sunIntensity: 2.4, ambient: 1.0, fogColor: '#ccd4cc', fogDensity: 0.0007, haze: 0.35 },
        story: `<p><b>Replace.</b> War damage and rebuilding, mass housing, the modern grid.</p>`,
        context: `Bigger picture.`,
      },
      {
        year: 2026, title: 'Newtown, Continuing', kicker: 'The present day',
        caption: 'Every era in one skyline.',
        transitTitle: 'Toward today…',
        camera: { pos: [550, 140, -400], look: [-50, 30, -50] },
        env: { skyTop: '#5f9fd8', skyBottom: '#ecdfc0', sunDir: [0.55, 0.55, -0.4], sunColor: '#fff6d8', sunIntensity: 2.5, ambient: 1.05, fogColor: '#d8dcd4', fogDensity: 0.0006, haze: 0.3 },
        story: `<p><b>Replace.</b> The walk-through of the layers still visible today — point the reader at what they can see from this vantage.</p>`,
        context: `<b>Extend this world:</b> keep the chain going — point to the README so the next person adds their city.`,
      },
    ],
  };
}
