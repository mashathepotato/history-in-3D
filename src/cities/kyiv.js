// Kyiv — 1,500 years in one config.
// Geography (stylized but true to the real city): the Dnipro runs along the
// east; the right bank rises in hills (Starokyivska, Zamkova, Pechersk);
// Podil is the low riverside district to the north; the Khreshchatyk valley
// cuts between Old Kyiv and Pechersk; the left bank is flat floodplain.
// 1 unit ≈ 1 metre. North is -z, east is +x.

const WATER_Y = 2;

// ---------- terrain ----------
const riverX = (z) => 620 + 90 * Math.sin(z * 0.0016);
const gauss = (x, z, cx, cz, r, amp) => {
  const dx = x - cx, dz = z - cz;
  return amp * Math.exp(-(dx * dx + dz * dz) / (r * r));
};
const sstep = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// distance from point to segment (for the Khreshchatyk valley carve)
function segDist(px, pz, ax, az, bx, bz) {
  const abx = bx - ax, abz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / (abx * abx + abz * abz)));
  const cx = ax + abx * t, cz = az + abz * t;
  return Math.hypot(px - cx, pz - cz);
}

function heightAt(x, z) {
  const rc = riverX(z);
  const d = x - rc;
  const HW = 140;                        // river half-width
  const noise = Math.sin(x * 0.021) * Math.cos(z * 0.017) * 1.6 + Math.sin(x * 0.043 + z * 0.031) * 0.9;

  let h;
  if (Math.abs(d) <= HW) {
    const t = 1 - (Math.abs(d) / HW) ** 2;
    h = WATER_Y - 7 * t;                 // river bed
  } else if (d > HW) {
    h = 4 + 2 * Math.min(1, (d - HW) / 600) + noise * 0.5;   // left-bank floodplain
  } else {
    const inland = -d - HW;
    h = 4 + 48 * sstep(0, 280, inland) + noise;              // right-bank scarp up to the plateau
    h += gauss(x, z, -160, -280, 220, 14);                   // Starokyivska Hill
    h += gauss(x, z, -20, -470, 75, 24);                     // Zamkova Hora
    h += gauss(x, z, 170, 480, 300, 10);                     // Pechersk plateau
    h += gauss(x, z, -700, 300, 500, 8);                     // SW upland
    // Khreshchatyk valley
    const vd = segDist(x, z, 180, -140, 40, 280);
    h = h + (16 - h) * sstep(110, 0, vd) * 0.9;
    // Podil: flat riverside terrace
    const pdx = (x - 200) / 200, pdz = (z + 610) / 230;
    const podil = Math.max(0, 1 - (pdx * pdx + pdz * pdz));
    h = h + (7 - h) * sstep(0.05, 0.5, podil);
  }
  return h;
}

// river course for boats
const riverPath = [];
for (let z = -1150; z <= 1150; z += 140) riverPath.push([riverX(z) + 20 * Math.sin(z * 0.01), z]);

// ---------- rampart paths ----------
const KYI_FORT = [[-160, -360], [-80, -380], [-40, -330], [-90, -280], [-160, -300], [-160, -360]];
const VOLODYMYR_WALL = [[-220, -390], [-90, -420], [-5, -330], [-60, -235], [-190, -230], [-250, -300], [-220, -390]];
const YAROSLAV_WALL = [[-470, -80], [-430, -260], [-300, -390], [-120, -430], [10, -350], [30, -210], [-50, -70], [-260, -20], [-470, -80]];

// Colors for the medieval masonry: unplastered pink-striped plinfa brick.
const PLINFA = { wallStyle: 'plinthite', wall: '#c9b3a0' };

export function buildConfig() {
  return {
    id: 'kyiv',
    name: 'Kyiv',
    terrain: {
      size: 2600, segments: 230, heightAt,
      waterLevel: WATER_Y,
      grassColor: '#5c7345', dirtColor: '#8a7a58', sandColor: '#b5a377',
      waterDeep: '#22506b', waterShallow: '#3f7d96',
    },

    // ================= STRUCTURES =================
    structures: [
      // -- earliest fort of Kyi on Starokyivska Hill --
      { id: 'kyi-fort', pos: [0, 0], phases: [
        { from: 482, to: 978, build: 'palisade', params: { path: KYI_FORT, h: 4.5 }, rise: 20 },
      ]},

      // -- Perun and the pagan pantheon (980–988) --
      { id: 'perun', pos: [-70, -255], phases: [
        { from: 980, to: 988, build: 'idol', params: { h: 7 }, rise: 2, sinkDepth: 20 },
      ]},

      // -- City of Volodymyr rampart --
      { id: 'volodymyr-wall', pos: [0, 0], phases: [
        { from: 984, to: 1240, build: 'rampart', params: { path: VOLODYMYR_WALL, earthH: 7, wallH: 4 }, rise: 8 },
      ]},

      // -- Church of the Tithes (Desyatynna), 989–996; fell 1240 --
      { id: 'desyatynna', pos: [-120, -330], rotY: 0.2, phases: [
        { from: 996, to: 1240, build: 'church', params: { ...PLINFA, w: 26, d: 32, h: 15, apses: 3, galleries: true,
          domeStyle: 'helmet', domeColor: '#8d95a3',
          domes: [{ x: 0, z: -2, r: 4.4, drumH: 7 }, { x: -7, z: 6, r: 2.6, drumH: 5 }, { x: 7, z: 6, r: 2.6, drumH: 5 },
                  { x: -7, z: -10, r: 2.6, drumH: 5 }, { x: 7, z: -10, r: 2.6, drumH: 5 }] }, rise: 7, sinkDepth: 18 },
        { from: 1240, to: 1828, build: 'ruin', params: { seed: 12, n: 18, spread: 26, maxSize: 5, wallStub: [18, 6], color: '#b09a86' }, rise: 3 },
      ]},

      // -- Saint Sophia Cathedral: begun 1011/1037 → baroque re-dressing 1690–1707 --
      { id: 'sofia', pos: [-280, -190], rotY: 0.15, phases: [
        // Byzantine original: five naves, 13 helmet domes, striped pink plinfa
        { from: 1037, to: 1700, rise: 26, build: 'church', params: { ...PLINFA, w: 30, d: 36, h: 18, apses: 5, galleries: true,
          domeStyle: 'helmet', domeColor: '#8d95a3',
          domes: [
            { x: 0, z: -2, r: 5.4, drumH: 9 },
            { x: -8, z: 6, r: 3, drumH: 6 }, { x: 8, z: 6, r: 3, drumH: 6 },
            { x: -8, z: -10, r: 3, drumH: 6 }, { x: 8, z: -10, r: 3, drumH: 6 },
            { x: -15, z: 0, r: 2.4, drumH: 4.5 }, { x: 15, z: 0, r: 2.4, drumH: 4.5 },
            { x: -15, z: -12, r: 2.4, drumH: 4 }, { x: 15, z: -12, r: 2.4, drumH: 4 },
            { x: -15, z: 10, r: 2.4, drumH: 4 }, { x: 15, z: 10, r: 2.4, drumH: 4 },
            { x: 0, z: 12, r: 2.6, drumH: 5 }, { x: 0, z: -14, r: 2.6, drumH: 5 },
          ] } },
        // Ukrainian Baroque: whitewashed, pear domes, green + gold
        { from: 1700, to: 9999, rise: 10, build: 'church', params: { wallStyle: 'baroque', wall: '#f4efe2', accent: '#d9cfb8',
          w: 32, d: 38, h: 20, apses: 5, galleries: true, domeStyle: 'pear', domeColor: 'gold',
          domes: [
            { x: 0, z: -2, r: 5.2, drumH: 10 },
            { x: -9, z: 7, r: 3, drumH: 7 }, { x: 9, z: 7, r: 3, drumH: 7 },
            { x: -9, z: -11, r: 3, drumH: 7 }, { x: 9, z: -11, r: 3, drumH: 7 },
            { x: -16, z: -2, r: 2.5, drumH: 5.5 }, { x: 16, z: -2, r: 2.5, drumH: 5.5 },
            { x: 0, z: 13, r: 2.7, drumH: 6 }, { x: 0, z: -15, r: 2.7, drumH: 6 },
          ] } },
      ]},
      { id: 'sofia-belltower', pos: [-235, -140], rotY: 0.15, phases: [
        { from: 1706, to: 9999, build: 'bellTower', params: { tiers: 4, w: 16, h: 62, wall: '#f4efe2', accent: '#7db0d6', domeStyle: 'pear' }, rise: 7 },
      ]},

      // -- Golden Gate, ca. 1024–1037; ruined 1240; reconstructed 1982 --
      { id: 'golden-gate', pos: [-435, -168], rotY: 1.15, phases: [
        { from: 1037, to: 1240, build: 'gate', params: { ...PLINFA, w: 17, h: 15, d: 13, chapel: true, domeStyle: 'helmet' }, rise: 13 },
        { from: 1240, to: 1750, build: 'gate', params: { ...PLINFA, w: 17, h: 9, d: 13, chapel: false }, rise: 3 },
        { from: 1982, to: 9999, build: 'gate', params: { wallStyle: 'log', w: 17, h: 16, d: 13, chapel: true, domeStyle: 'helmet' }, rise: 2 },
      ]},

      // -- Ramparts of Yaroslav, 1037; breached 1240; traces to the 1830s --
      { id: 'yaroslav-wall', pos: [0, 0], phases: [
        { from: 1037, to: 1240, build: 'rampart', params: { path: YAROSLAV_WALL, earthH: 12, wallH: 5 }, rise: 14 },
        { from: 1240, to: 1837, build: 'rampart', params: { path: YAROSLAV_WALL, earthH: 6, wallH: 0.5, towers: false }, rise: 3 },
      ]},

      // -- St. Michael's Golden-Domed: 1108–1113 → baroque → dynamited 1937 → rebuilt 1999 --
      { id: 'st-michaels', pos: [-30, -295], rotY: -0.2, phases: [
        { from: 1113, to: 1746, rise: 5, build: 'church', params: { ...PLINFA, w: 22, d: 28, h: 14, apses: 3,
          domeStyle: 'helmet', domeColor: 'gold',
          domes: [{ x: 0, z: -2, r: 4.6, drumH: 8 }, { x: -6.5, z: 6, r: 2.2, drumH: 5 }, { x: 6.5, z: 6, r: 2.2, drumH: 5 }] } },
        { from: 1746, to: 1937, rise: 8, build: 'church', params: { wallStyle: 'baroque', wall: '#9fc6e8', accent: '#f2f4f6',
          w: 24, d: 30, h: 16, apses: 3, domeStyle: 'pear', domeColor: 'gold',
          domes: [
            { x: 0, z: -2, r: 4.4, drumH: 9 },
            { x: -7, z: 6, r: 2.2, drumH: 6 }, { x: 7, z: 6, r: 2.2, drumH: 6 },
            { x: -7, z: -10, r: 2.2, drumH: 6 }, { x: 7, z: -10, r: 2.2, drumH: 6 },
            { x: 0, z: 10, r: 2, drumH: 5 }, { x: 0, z: -13, r: 2, drumH: 5 },
          ] }, sinkDepth: 22 },
        { from: 1999, to: 9999, rise: 2.5, build: 'church', params: { wallStyle: 'baroque', wall: '#9fc6e8', accent: '#f2f4f6',
          w: 24, d: 30, h: 16, apses: 3, domeStyle: 'pear', domeColor: 'gold',
          domes: [
            { x: 0, z: -2, r: 4.4, drumH: 9 },
            { x: -7, z: 6, r: 2.2, drumH: 6 }, { x: 7, z: 6, r: 2.2, drumH: 6 },
            { x: -7, z: -10, r: 2.2, drumH: 6 }, { x: 7, z: -10, r: 2.2, drumH: 6 },
            { x: 0, z: 10, r: 2, drumH: 5 }, { x: 0, z: -13, r: 2, drumH: 5 },
          ] } },
      ]},
      { id: 'michaels-belltower', pos: [-65, -270], rotY: -0.2, phases: [
        { from: 1999, to: 9999, build: 'bellTower', params: { tiers: 3, w: 13, h: 44, wall: '#9fc6e8', accent: '#f2f4f6', domeStyle: 'pear' }, rise: 2 },
      ]},

      // -- Kyiv Pechersk Lavra --
      { id: 'lavra-dormition', pos: [300, 520], rotY: -0.4, phases: [
        { from: 1089, to: 1729, rise: 14, build: 'church', params: { ...PLINFA, w: 22, d: 28, h: 14, apses: 3,
          domeStyle: 'helmet', domeColor: 'gold', domes: [{ x: 0, z: -2, r: 4.8, drumH: 8 }] } },
        { from: 1729, to: 1941, rise: 8, build: 'church', params: { wallStyle: 'baroque', wall: '#f4efe2', accent: '#cbb87a',
          w: 26, d: 32, h: 16, apses: 3, domeStyle: 'pear', domeColor: 'gold',
          domes: [{ x: 0, z: -2, r: 4.6, drumH: 9 }, { x: -8, z: 6, r: 2.2, drumH: 6 }, { x: 8, z: 6, r: 2.2, drumH: 6 },
                  { x: -8, z: -10, r: 2.2, drumH: 6 }, { x: 8, z: -10, r: 2.2, drumH: 6 }] }, sinkDepth: 20 },
        { from: 1941.9, to: 1998, build: 'ruin', params: { seed: 31, n: 16, spread: 24, maxSize: 5, wallStub: [16, 5], color: '#d9cdb6' }, rise: 1 },
        { from: 2000, to: 9999, rise: 2, build: 'church', params: { wallStyle: 'baroque', wall: '#f4efe2', accent: '#cbb87a',
          w: 26, d: 32, h: 16, apses: 3, domeStyle: 'pear', domeColor: 'gold',
          domes: [{ x: 0, z: -2, r: 4.6, drumH: 9 }, { x: -8, z: 6, r: 2.2, drumH: 6 }, { x: 8, z: 6, r: 2.2, drumH: 6 },
                  { x: -8, z: -10, r: 2.2, drumH: 6 }, { x: 8, z: -10, r: 2.2, drumH: 6 }] } },
      ]},
      { id: 'lavra-belltower', pos: [340, 565], phases: [
        { from: 1745, to: 9999, build: 'bellTower', params: { tiers: 4, w: 18, h: 88, round: true, wall: '#f4efe2', accent: '#cbb87a', domeStyle: 'flat' }, rise: 14 },
      ]},
      { id: 'lavra-gatechurch', pos: [255, 470], rotY: -0.4, phases: [
        { from: 1108, to: 9999, build: 'church', params: { wallStyle: 'baroque', wall: '#f4efe2', accent: '#cbb87a',
          w: 12, d: 14, h: 9, apses: 1, domeStyle: 'pear', domeColor: 'gold', domes: [{ x: 0, z: 0, r: 2.4, drumH: 5 }] }, rise: 6 },
      ]},

      // -- Lithuanian wooden castle on Zamkova Hora, ~1370s – mid-1600s --
      { id: 'castle', pos: [-20, -470], rotY: 0.5, phases: [
        { from: 1374, to: 1651, build: 'woodCastle', params: {}, rise: 10, sinkDepth: 20 },
      ]},

      // -- Podil institutions --
      { id: 'mohyla-academy', pos: [205, -655], rotY: 0.1, phases: [
        { from: 1703, to: 9999, build: 'classical', params: { w: 38, d: 16, floors: 2, wall: '#e8e2d2', frame: '#5a5648', trim: 0xcfc7b2, cols: 4, colColor: 0xe0dac8 }, rise: 6 },
      ]},
      { id: 'magdeburg-column', pos: [430, -520], phases: [
        { from: 1808, to: 9999, build: 'column', params: { h: 18, figure: false }, rise: 3 },
      ]},
      // -- St. Andrew's Church (Rastrelli, 1747–1754) on the bluff over Podil --
      { id: 'st-andrews', pos: [30, -540], rotY: -0.5, phases: [
        { from: 1754, to: 9999, build: 'church', params: { wallStyle: 'baroque', wall: '#77b5b8', accent: '#f4f2ea',
          w: 16, d: 18, h: 14, apses: 1, domeStyle: 'pear', domeColor: '#2e6b4f',
          domes: [{ x: 0, z: 0, r: 4, drumH: 7 }, { x: -5.5, z: 5.5, r: 1.2, drumH: 4 }, { x: 5.5, z: 5.5, r: 1.2, drumH: 4 },
                  { x: -5.5, z: -5.5, r: 1.2, drumH: 4 }, { x: 5.5, z: -5.5, r: 1.2, drumH: 4 }] }, rise: 7 },
      ]},

      // -- Imperial Kyiv --
      { id: 'university', pos: [-330, 80], rotY: 1.57, phases: [
        { from: 1842, to: 9999, build: 'classical', params: { w: 72, d: 26, floors: 4, wall: '#a83226', frame: '#2c2620', trim: 0x8c2a20, cols: 8, colColor: 0x1f1c18 }, rise: 5 },
      ]},
      { id: 'st-volodymyr-cathedral', pos: [-360, 190], rotY: 1.57, phases: [
        { from: 1882, to: 9999, build: 'church', params: { wallStyle: 'baroque', wall: '#e5c86e', accent: '#f4ecd8',
          w: 22, d: 30, h: 16, apses: 3, domeStyle: 'helmet', domeColor: 'gold',
          domes: [{ x: 0, z: -2, r: 4, drumH: 8 }, { x: -6.5, z: 6, r: 2, drumH: 6 }, { x: 6.5, z: 6, r: 2, drumH: 6 },
                  { x: -6.5, z: -10, r: 2, drumH: 6 }, { x: 6.5, z: -10, r: 2, drumH: 6 },
                  { x: 0, z: 10, r: 1.8, drumH: 5 }, { x: 0, z: -13, r: 1.8, drumH: 5 }] }, rise: 20 },
      ]},
      { id: 'mariinskyi', pos: [190, 260], rotY: -1.2, phases: [
        { from: 1752, to: 9999, build: 'classical', params: { w: 48, d: 20, floors: 2, wall: '#4f9aa8', frame: '#f2efe6', trim: 0xf2efe6, cols: 6, colColor: 0xf2efe6 }, rise: 8 },
      ]},

      // -- Soviet Kyiv --
      { id: 'foreign-ministry', pos: [-95, -260], rotY: -0.2, phases: [
        { from: 1938, to: 9999, build: 'stalinka', params: { w: 44, d: 24, floors: 9, wall: '#b9b4a6' }, rise: 3 },
      ]},
      { id: 'hotel-ukraina', pos: [70, 40], rotY: 0.35, phases: [
        { from: 1961, to: 9999, build: 'stalinka', params: { w: 30, d: 18, floors: 15, wall: '#d8c8a8' }, rise: 4 },
      ]},
      { id: 'paton-bridge', pos: [668, 300], phases: [
        { from: 1953, to: 9999, build: 'bridge', params: { len: 460, w: 16, deckY: 16, color: 0x5a6470 }, rise: 4 },
      ]},
      { id: 'metro-bridge', pos: [655, -60], phases: [
        { from: 1965, to: 9999, build: 'bridge', params: { len: 440, w: 14, deckY: 15, arches: true, color: 0x77808c }, rise: 4 },
      ]},
      { id: 'motherland', pos: [230, 660], phases: [
        { from: 1981, to: 2023, build: 'motherland', params: { trident: false }, rise: 4 },
        { from: 2023, to: 9999, build: 'motherland', params: { trident: true }, rise: 0.5 },
      ]},

      // -- Independence era --
      { id: 'independence-monument', pos: [115, -35], phases: [
        { from: 2001, to: 9999, build: 'column', params: { h: 44 }, rise: 1.5 },
      ]},
      { id: 'maidan-flags', pos: [140, -70], phases: [
        { from: 1991, to: 9999, build: 'flag', params: { h: 16 }, rise: 1 },
      ]},
      { id: 'sofia-flag', pos: [-320, -230], phases: [
        { from: 1991, to: 9999, build: 'flag', params: { h: 14 }, rise: 1 },
      ]},
      { id: 'hedgehogs-khreshchatyk', pos: [110, 20], phases: [
        { from: 2022.1, to: 2023.3, build: 'hedgehogs', params: { n: 12, spread: 90, seed: 8 }, rise: 0.3 },
      ]},
    ],

    // ================= DISTRICTS (generic fabric) =================
    districts: [
      // Starokyivska hilltop settlement
      { id: 'old-hill', area: [-120, -320, 120, 90], seed: 101, phases: [
        { from: 490, to: 900, style: { gen: 'dugout', vary: { size: [2.6, 4] } }, count: 26, rise: 30 },
        { from: 900, to: 1240, style: { gen: 'hut', vary: { w: [4, 6.5], d: [3.5, 5] } }, count: 42, rise: 40 },
        { from: 1600, to: 1830, style: { gen: 'hut', vary: { w: [4.5, 7], d: [4, 6] } }, count: 18, rise: 60 },
      ]},
      // Upper town inside Yaroslav's walls
      { id: 'upper-town', area: [-240, -220, 200, 150], seed: 202, phases: [
        { from: 1040, to: 1240, style: { gen: 'hut', vary: { w: [4, 7], d: [3.5, 5.5] } }, count: 70, rise: 40 },
        { from: 1250, to: 1650, style: { gen: 'hut', vary: { w: [4, 6], d: [3.5, 5] } }, count: 8, rise: 60 },   // near-empty ruins era
        { from: 1650, to: 1850, style: { gen: 'hut', vary: { w: [4.5, 7], d: [4, 6] } }, count: 34, rise: 50 },
        { from: 1850, to: 1950, style: { gen: 'townhouse', vary: { w: [10, 16], d: [8, 12], floors: [2, 4.4] } }, count: 46, rise: 25 },
        { from: 1950, to: 9999, style: [
          { gen: 'townhouse', vary: { w: [10, 16], d: [8, 12], floors: [3, 5.4] } },
          { gen: 'stalinka', vary: { w: [20, 30], d: [12, 16], floors: [5, 7.5] } },
        ], count: 52, rise: 12 },
      ]},
      // Podil: the riverside town that never died
      { id: 'podil', area: [200, -600, 170, 190], seed: 303, gridAngle: 0.25, phases: [
        { from: 887, to: 1350, style: { gen: 'hut', vary: { w: [4, 6.5], d: [3.5, 5] } }, count: 60, rise: 45 },
        { from: 1350, to: 1811, style: [
          { gen: 'hut', vary: { w: [4.5, 7], d: [4, 6] } },
          { gen: 'woodChurch', vary: {} },
        ], count: 74, rise: 60 },
        { from: 1815, to: 9999, style: { gen: 'townhouse', vary: { w: [10, 15], d: [8, 12], floors: [2, 3.8] } }, count: 64, rise: 25 },
      ]},
      // Khreshchatyk valley: nothing → 19th-c. street → ruins are handled by era
      { id: 'khreshchatyk', area: [110, 60, 70, 180], seed: 404, gridAngle: -0.45, phases: [
        { from: 1810, to: 1870, style: { gen: 'hut', vary: { w: [5, 8], d: [4, 6] } }, count: 20, rise: 20 },
        { from: 1870, to: 1941.7, style: { gen: 'townhouse', vary: { w: [12, 18], d: [10, 14], floors: [3, 4.9] } }, count: 40, rise: 18, sinkDepth: 12 },
        { from: 1949, to: 9999, style: { gen: 'stalinka', vary: { w: [26, 38], d: [14, 20], floors: [6, 8.9] } }, count: 26, rise: 11 },
      ]},
      // Pechersk fabric
      { id: 'pechersk', area: [140, 380, 200, 220], seed: 505, phases: [
        { from: 1700, to: 1870, style: { gen: 'hut', vary: { w: [4.5, 7], d: [4, 6] } }, count: 26, rise: 60 },
        { from: 1870, to: 9999, style: [
          { gen: 'townhouse', vary: { w: [11, 16], d: [9, 13], floors: [2, 4.5] } },
        ], count: 40, rise: 30 },
      ]},
      // Left bank: villages → panelki sea → glass
      { id: 'left-bank-north', area: [1000, -450, 220, 280], seed: 606, gridAngle: 0.1, phases: [
        { from: 1600, to: 1960, style: { gen: 'hut', vary: { w: [4.5, 7], d: [4, 6] } }, count: 22, rise: 80 },
        { from: 1975, to: 9999, style: { gen: 'panelka', vary: { w: [22, 34], d: [11, 14], floors: [9, 16.9] } }, count: 42, rise: 10 },
      ]},
      { id: 'left-bank-south', area: [1010, 260, 230, 300], seed: 707, gridAngle: -0.15, phases: [
        { from: 1650, to: 1955, style: { gen: 'hut', vary: { w: [4.5, 7], d: [4, 6] } }, count: 18, rise: 80 },
        { from: 1962, to: 9999, style: { gen: 'panelka', vary: { w: [22, 34], d: [11, 14], floors: [5, 12.9] } }, count: 48, rise: 12 },
      ]},
      { id: 'modern-towers', area: [420, 240, 140, 200], seed: 808, phases: [
        { from: 2003, to: 9999, style: { gen: 'glassTower', vary: { w: [14, 22], d: [14, 22], h: [50, 110] } }, count: 14, rise: 6 },
      ]},
    ],

    // ================= EFFECTS =================
    effects: {
      birdCenter: [0, 0, -300],
      birdRadius: 420,
      fires: [
        // Perun's eternal flame
        { pos: [-70, 62, -250], radius: 3, from: 980, to: 988, intensity: 0.5 },
        // 1240: the sack — upper town and Podil burn
        { pos: [-160, 62, -300], radius: 60, from: 1239.8, to: 1243, intensity: 1 },
        { pos: [-330, 55, -160], radius: 45, from: 1239.8, to: 1243, intensity: 0.8 },
        { pos: [200, 8, -600], radius: 70, from: 1239.9, to: 1242.5, intensity: 0.9 },
        // 1811 great Podil fire
        { pos: [220, 8, -580], radius: 80, from: 1811, to: 1812.2, intensity: 0.9 },
        // 1941: Khreshchatyk mined; Lavra blown
        { pos: [110, 18, 40], radius: 80, from: 1941.7, to: 1944, intensity: 1 },
        { pos: [300, 55, 520], radius: 30, from: 1941.85, to: 1943.5, intensity: 0.7 },
        // 2014 Maidan barricade smoke
        { pos: [115, 18, -30], radius: 30, from: 2013.9, to: 2014.2, intensity: 0.6 },
        // 2022: war on the horizon (Irpin/Hostomel to the northwest)
        { pos: [-1150, 30, -1000], radius: 160, from: 2022.12, to: 2022.28, intensity: 1 },
        { pos: [-950, 30, -1150], radius: 140, from: 2022.12, to: 2022.28, intensity: 0.8 },
      ],
      boats: [
        { from: 860, to: 1300, style: 'longship', path: riverPath, speed: 0.006 },
        { from: 900, to: 1500, style: 'sail', path: riverPath.map(([x, z]) => [x + 40, z]), speed: 0.005 },
        { from: 1500, to: 1940, style: 'sail', path: riverPath, speed: 0.006 },
        { from: 1950, to: 9999, style: 'barge', path: riverPath.map(([x, z]) => [x - 30, z]), speed: 0.008 },
      ],
      crowds: [
        // 988: the baptism in the river shallows
        { from: 987.6, to: 989.5, area: [480, -640, 45, 40], count: 130, inWater: true, waterY: WATER_Y,
          colors: ['#e8dcc8', '#d9c8a8', '#c8b498'], seed: 21 },
        // 1648: Khmelnytsky's welcome at the Golden Gate
        { from: 1648, to: 1649.6, area: [-460, -190, 45, 45], count: 90,
          colors: ['#8a3a2a', '#5a6a8a', '#c8b498', '#7a5a3a'], seed: 22 },
        // 2004 & 2013–14: the Maidan
        { from: 2004.85, to: 2005.1, area: [115, -35, 55, 55], count: 160, colors: ['#e8862a', '#d97a20', '#c8c8d0'], seed: 23 },
        { from: 2013.9, to: 2014.25, area: [115, -35, 60, 60], count: 220, colors: ['#3a4a6a', '#2a2d33', '#0057b7', '#ffd700'], seed: 24 },
        // present-day life
        { from: 2024, to: 9999, area: [115, -35, 60, 60], count: 60, colors: ['#5a6a8a', '#8a5a3a', '#c8b498'], seed: 25 },
      ],
      groves: [
        { area: [-650, -550, 380, 350], count: 130, kind: 'oak', seed: 51 },
        { area: [-500, 500, 400, 380], count: 110, kind: 'oak', seed: 52 },
        { area: [180, 620, 280, 220], count: 80, kind: 'pine', seed: 53 },
        { area: [-100, -800, 300, 200], count: 70, kind: 'oak', seed: 54 },
        { area: [1050, 0, 250, 500], count: 60, kind: 'poplar', seed: 55, to: 1965 },
        // the famous chestnuts of postwar Khreshchatyk
        { area: [110, 60, 55, 170], count: 46, kind: 'chestnut', seed: 56, from: 1950 },
      ],
    },

    // ================= ERA STOPS =================
    stops: [
      {
        year: 482, major: true, title: 'The Legend of the Founders', kicker: 'Foundation · ~5th–6th century',
        caption: 'Three brothers and a sister stop on a hill above the Dnipro…',
        transitTitle: 'The first centuries…',
        camera: { pos: [-420, 140, -640], look: [-90, 55, -320] },
        env: { skyTop: '#7fa8d0', skyBottom: '#e8cfa0', sunDir: [0.75, 0.3, -0.45], sunColor: '#ffdca0', sunIntensity: 2.0, ambient: 0.85, fogColor: '#d8c8a8', fogDensity: 0.0009, haze: 0.55 },
        story: `<p>The chronicle tells of three brothers — <b>Kyi</b>, <b>Shchek</b> and <b>Khoryv</b> — and their sister <b>Lybid</b>, of the Slavic tribe of the Polianians, who settled these hills. The city took the eldest brother's name: <b>Kyiv</b>, "Kyi's place". Each sibling left a mark on the map that survives today — Shchekavytsia and Khorevytsia hills, and the little river Lybid.</p>
<p>What you see is a fortified hilltop hamlet on <b>Starokyivska Hill</b>: semi-dugout houses with earthen roofs, a timber palisade, smoke rising from clay stoves. Below, the great river — the future highway of an empire.</p>`,
        context: `<b>Honest history:</b> the year 482 is symbolic — it was fixed for the city's "1,500th anniversary" in 1982. Archaeology confirms continuous settlement here from roughly the 6th–8th centuries. The legend itself is told in the <i>Primary Chronicle</i>, written six centuries later.`,
      },
      {
        year: 900, title: 'The River Road', kicker: 'Trade · 9th–10th century',
        caption: 'From the Varangians to the Greeks — and Kyiv holds the middle.',
        transitTitle: 'Trade quickens on the Dnipro…',
        camera: { pos: [520, 60, -900], look: [280, 10, -560] },
        env: { skyTop: '#6fa5d8', skyBottom: '#e0d4b0', sunDir: [0.5, 0.5, -0.5], sunColor: '#fff0c0', sunIntensity: 2.2, ambient: 0.9, fogColor: '#d0d4c8', fogDensity: 0.0008, haze: 0.45 },
        story: `<p>By the 9th century Kyiv commands the <b>route "from the Varangians to the Greeks"</b> — the river road linking Scandinavia to Constantinople. Below the hills, at the mouth of the little Pochaina river, grows <b>Podil</b>: the harbour town of merchants and craftsmen. Tree-ring dating of its preserved log houses shows organized streets here by <b>the year 887</b>.</p>
<p>Watch the boats: Varangian longships and traders' sails. In Podil's lanes live the potters (<i>Honchari</i>) and tanners (<i>Kozhemyaky</i>) — neighbourhood names the city still uses eleven centuries later.</p>`,
        context: `Kyiv became the seat of the <b>Rurikid princes</b> — by tradition, Oleh seized it around 882 and declared it "the mother of cities of Rus". The state historians call <b>Kyivan Rus</b> was born of this river trade: furs, wax, honey and slaves going south; silver, silk and ideas coming north.`,
      },
      {
        year: 988, major: true, title: 'The Baptism of Rus', kicker: 'Turning point · 988',
        caption: 'The idols fall. A whole city walks into the river.',
        transitTitle: 'Volodymyr chooses a faith…',
        camera: { pos: [620, 55, -780], look: [430, 0, -620] },
        env: { skyTop: '#8fb8e0', skyBottom: '#f0e0b8', sunDir: [0.6, 0.55, -0.35], sunColor: '#fff4d0', sunIntensity: 2.4, ambient: 1.0, fogColor: '#dce0d4', fogDensity: 0.0007, haze: 0.4 },
        story: `<p>In 980 Grand Prince <b>Volodymyr</b> raised six wooden idols on the hill by his palace — chief among them <b>Perun</b> the thunder god, wooden with a <b>silver head and golden moustache</b>. Eight years later, Volodymyr chose Byzantine Christianity. Perun was toppled, dragged by horses, and thrown into the Dnipro; the people of Kyiv were baptized together in the river shallows — look for them below.</p>
<p>Immediately after, Byzantine masters began the first stone church of Rus: the <b>Church of the Tithes</b> (989–996), funded by a tenth of the prince's income. So rich in marble that chroniclers called it simply "the marble church".</p>`,
        context: `The Baptism of 988 bound Rus to Constantinople rather than Rome — the deep root of Ukraine's Orthodox and Byzantine cultural inheritance: its alphabet, its icon tradition, its domed skyline. Every gold cupola you'll see from here on descends from this moment.`,
      },
      {
        year: 1037, major: true, title: 'The Golden Age: Saint Sophia', kicker: 'Yaroslav the Wise · 1019–1054',
        caption: 'A cathedral to rival Constantinople.',
        transitTitle: 'Yaroslav builds his city…',
        camera: { pos: [-490, 110, -420], look: [-270, 70, -190] },
        env: { skyTop: '#5f9fd8', skyBottom: '#e8ddb8', sunDir: [0.45, 0.65, -0.4], sunColor: '#fff6d8', sunIntensity: 2.5, ambient: 1.0, fogColor: '#d8dcd0', fogDensity: 0.00065, haze: 0.35 },
        story: `<p>Under <b>Yaroslav the Wise</b> Kyiv exploded in size. A rampart of oak cribs packed with earth — up to 14 metres high — enclosed a new upper city, pierced by the ceremonial <b>Golden Gate</b>, its archway crowned with a gilded chapel visible for miles, echoing Constantinople's own Golden Gate.</p>
<p>At the centre rose <b>Saint Sophia Cathedral</b> — dedicated, like Constantinople's Hagia Sophia, to Holy Wisdom. Look at it now: not white, but <b>striped pink</b> — bare <i>plinfa</i> brick banded with crushed-brick mortar — carrying <b>13 lead-grey domes</b>, one for Christ, twelve for the apostles, stepping up in a pyramid. Inside: the largest surviving ensemble of 11th-century mosaics and frescoes in the world, including the golden <b>Oranta</b>, the praying Mother of God, who has never left her apse.</p>`,
        context: `<b>When was Sophia founded?</b> The Primary Chronicle says <b>1037</b>, under Yaroslav; wall-graffiti research argues for <b>1011</b>, under his father Volodymyr — the date UNESCO adopted. Both may be true: begun by father, finished by son. Yaroslav made Kyiv a European capital — his daughters became queens of France, Norway and Hungary.`,
      },
      {
        year: 1113, title: 'City of Golden Domes', kicker: 'The peak of Rus · 12th century',
        caption: 'Forty stone churches above a sea of timber roofs.',
        transitTitle: 'Monasteries multiply…',
        camera: { pos: [180, 150, -80], look: [-60, 60, -300] },
        env: { skyTop: '#6aa5d4', skyBottom: '#e4d8b4', sunDir: [0.35, 0.6, -0.5], sunColor: '#fff2cc', sunIntensity: 2.4, ambient: 0.95, fogColor: '#d4d8cc', fogDensity: 0.0007, haze: 0.4 },
        story: `<p>Kyiv at its medieval zenith: <b>perhaps 40–50,000 people</b> — the size of Paris, larger than London. Chronicles boast of "400 churches"; archaeology confirms dozens in stone, rising above thousands of log houses.</p>
<p>On the hill nearest you gleams <b>St. Michael's Golden-Domed Monastery</b> (1108–1113) — by tradition the <b>first gilded dome in Rus</b>, the innovation that named a whole civilization's skyline. South along the bluffs, monks have burrowed the <b>Caves Monastery — the Pechersk Lavra</b> — since 1051, its underground cells now crowned by the single-domed <b>Dormition Cathedral</b> (1073–1089), the model copied across the East Slavic world.</p>`,
        context: `This is the city the Mongols will find. Remember this skyline — pink-striped churches, gold and lead domes, timber walls. Within five generations of artists' work, nearly all of it will be ash, and the centre of gravity of Rus will scatter — a rupture whose consequences (who "inherits" Kyivan Rus?) are argued over to this day.`,
      },
      {
        year: 1240, major: true, title: 'The Mongol Catastrophe', kicker: 'December 1240',
        caption: 'Nine days of siege. The city of 50,000 becomes a ruin of 2,000.',
        transitTitle: 'The horde approaches…',
        camera: { pos: [-360, 130, -560], look: [-120, 45, -320] },
        env: { skyTop: '#6a5548', skyBottom: '#c88a50', sunDir: [0.3, 0.25, -0.6], sunColor: '#ff9a50', sunIntensity: 1.6, ambient: 0.55, fogColor: '#a08268', fogDensity: 0.0014, haze: 0.75 },
        story: `<p><b>Batu Khan's</b> army reached Kyiv in late November 1240. Catapults battered the ramparts near the Lyadski Gate — today's Maidan — until the wall broke. On <b>6 December</b> the city fell. The last defenders and hundreds of townspeople crowded into the Church of the Tithes; the chronicle says the building <b>collapsed under their weight</b>.</p>
<p>Of some fifty thousand Kyivans, <b>perhaps two thousand survived</b>. Of about forty stone buildings, six still stood — Sophia among them, pillaged but standing. Six years later a papal envoy passed through and counted <b>barely two hundred houses</b>.</p>`,
        context: `The catastrophe ended Kyivan Rus as a political world. For the next three centuries Kyiv shrank to the riverside town of Podil, under Mongol tribute, then Lithuanian and Polish rule. Yet the idea of Kyiv — the baptismal font of a civilization — outlived the city itself, which is why every later power would claim its inheritance.`,
      },
      {
        year: 1552, title: 'The Castle on the Hill', kicker: 'Lithuanian & Polish era · 14th–17th century',
        caption: 'A wooden castle guards a town of merchants.',
        transitTitle: 'Life gathers again by the river…',
        camera: { pos: [280, 90, -800], look: [-10, 55, -500] },
        env: { skyTop: '#7aa8c8', skyBottom: '#dcd4b8', sunDir: [0.5, 0.5, -0.45], sunColor: '#f8ecc8', sunIntensity: 2.1, ambient: 0.9, fogColor: '#ccd0c4', fogDensity: 0.0008, haze: 0.5 },
        story: `<p>After the Battle of Blue Waters (1362) Kyiv passed to the <b>Grand Duchy of Lithuania</b>. On the steep hill above Podil — ever after called <b>Zamkova Hora</b>, Castle Hill — princes raised a <b>wooden fortress</b>: log walls, three-tiered watchtowers, wells sixty metres deep, and the only clock in town.</p>
<p>The real city is below: <b>Podil</b>, with its market, harbour, and town hall. Around 1494–1497 Kyiv received <b>Magdeburg rights</b> — European urban self-government, with elected burgomasters. The upper city remains a meadow of ruins where Sophia's domes rise over grazing goats; monks patch the old cathedral as best they can.</p>`,
        context: `These centuries tie Kyiv into Central Europe — guilds, town law, Renaissance learning arriving through Poland — while Orthodox brotherhoods defend the Byzantine inheritance. That creative tension defines early-modern Ukraine. The castle burned in the wars of the 1650s and was never rebuilt; the hill stands empty today.`,
      },
      {
        year: 1648, major: true, title: 'Khmelnytsky Rides Through the Golden Gate', kicker: 'The Cossack revolution · 1648',
        caption: 'Bells of Sophia ring for the Hetman.',
        transitTitle: 'The steppe rises…',
        camera: { pos: [-560, 60, -300], look: [-420, 30, -160] },
        env: { skyTop: '#7fa8d0', skyBottom: '#e8d8b0', sunDir: [0.55, 0.45, -0.4], sunColor: '#fff0c8', sunIntensity: 2.2, ambient: 0.95, fogColor: '#d4d4c4', fogDensity: 0.00075, haze: 0.45 },
        story: `<p>In December 1648 Hetman <b>Bohdan Khmelnytsky</b>, leading the great Cossack uprising against Polish rule, entered Kyiv <b>through the ancient Golden Gate</b> — a deliberate act of political theatre. Students of the academy sang; the bells of Sophia rang; the Patriarch of Jerusalem hailed him as a new Moses. The crowd below is waiting for him.</p>
<p>Kyiv's mind was ready: since <b>1632</b> Metropolitan <b>Petro Mohyla</b>'s collegium — the future <b>Kyiv-Mohyla Academy</b> — had made Podil the intellectual capital of the Orthodox world, teaching Latin rhetoric and philosophy to future hetmans and philosophers alike.</p>`,
        context: `The Khmelnytsky uprising created the <b>Cossack Hetmanate</b>, the polity modern Ukraine claims as its early-modern state. Its fateful turn: the 1654 Pereiaslav agreement with Moscow, meant as alliance, became the door through which the tsars would eventually swallow Ukraine — the beginning of an argument still being fought.`,
      },
      {
        year: 1707, title: 'Cossack Baroque', kicker: 'Mazepa’s Kyiv · 1687–1709',
        caption: 'The old stones put on white and gold.',
        transitTitle: 'A golden skin over Byzantium…',
        camera: { pos: [-470, 130, -390], look: [-265, 65, -180] },
        env: { skyTop: '#5f9fd8', skyBottom: '#f0e2bc', sunDir: [0.4, 0.6, -0.45], sunColor: '#fff6d8', sunIntensity: 2.5, ambient: 1.0, fogColor: '#dcdccc', fogDensity: 0.00065, haze: 0.35 },
        story: `<p>Hetman <b>Ivan Mazepa</b> poured Cossack wealth into the holy places. Between 1690 and 1707 <b>Saint Sophia was reborn</b>: the battered Byzantine walls plastered and whitewashed, the shallow lead domes replaced with <b>pear-shaped cupolas of green and gold</b>, ornate gables added — the style we now call <b>Ukrainian Baroque</b>. A monumental bell tower rose beside it (1699–1706); Mazepa's 13-ton bell still hangs there.</p>
<p>The Lavra received the same golden re-dressing, and later its <b>Great Bell Tower</b> (1731–1745) — at 96.5 metres the tallest structure in the Russian Empire when built. Watch it climb above the Pechersk woods.</p>`,
        context: `Ukrainian Baroque is the visual signature of Cossack Ukraine — Byzantine bones in festive European dress. It is why almost nothing in Kyiv <i>looks</i> medieval today: the Middle Ages are underneath, like a fresco under whitewash. Mazepa himself, after siding with Sweden against Peter I in 1708, became the empire's arch-traitor and Ukraine's tragic hero.`,
      },
      {
        year: 1842, title: 'Imperial Kyiv', kicker: 'The governorate city · 19th century',
        caption: 'A university the colour of an order’s ribbon.',
        transitTitle: 'The empire builds in stone…',
        camera: { pos: [-540, 100, 260], look: [-330, 40, 90] },
        env: { skyTop: '#84aed4', skyBottom: '#e4dcc0', sunDir: [0.5, 0.55, -0.35], sunColor: '#fff2cc', sunIntensity: 2.3, ambient: 0.95, fogColor: '#d4d8cc', fogDensity: 0.0007, haze: 0.4 },
        story: `<p>Under the Russian Empire, Kyiv became a governorate capital and garrison city. Its grandest statement: <b>St. Volodymyr University</b> (1837–1842) by Vincenzo Beretti — a vast classical quadrangle painted <b>deep red with black capitals</b>, the colours of the ribbon of the Order of St. Vladimir. (The legend that a tsar painted it red to shame rebellious students is just that — a legend.)</p>
<p>Nearby, a wooded ravine called <b>Khreshchatyk</b> is filling with houses — the 1837 plan has just fixed the line of what will become the most famous street in Ukraine. On the hill above the river, the turquoise <b>Mariinskyi Palace</b> (Rastrelli's design, 1750s) hosts visiting empresses; St. Andrew's teal-and-white silhouette floats above Podil.</p>`,
        context: `Imperial Kyiv was a city of three languages — Russian officialdom, Polish gentry, Ukrainian countryside — with Yiddish soon joining as the Pale of Settlement's Jews moved in. The university built to Russify the region instead incubated the Ukrainian national revival: Taras Shevchenko worked here, and the first Ukrainian political societies met in its halls.`,
      },
      {
        year: 1900, title: 'The Boomtown', kicker: 'Sugar, rail & electricity · circa 1900',
        caption: 'The first electric tram in the empire climbs a Kyiv hill.',
        transitTitle: 'Chimneys and cupolas…',
        camera: { pos: [320, 120, 180], look: [60, 30, -40] },
        env: { skyTop: '#7fa8cc', skyBottom: '#e0d4b8', sunDir: [0.45, 0.5, -0.4], sunColor: '#ffeec4', sunIntensity: 2.2, ambient: 0.95, fogColor: '#ccd0c8', fogDensity: 0.00075, haze: 0.5 },
        story: `<p>Sugar-beet fortunes, railways and the Dnipro made Kyiv boom. <b>Khreshchatyk</b> is now a canyon of banks, theatres and department stores; in <b>1892</b> the city launched the <b>first electric tram in the Russian Empire</b> to conquer its impossible hills, and in 1905 a <b>funicular</b> began hauling passengers up from Podil.</p>
<p>The skyline gained the seven-domed, mustard-yellow <b>St. Volodymyr's Cathedral</b> (1862–1896), its interior painted by Vasnetsov and Vrubel for the 900th anniversary of the Baptism. Chestnut trees — the city's future emblem — line the new boulevards.</p>`,
        context: `By 1900 Kyiv held about 250,000 people and was the empire's third city after St. Petersburg and Moscow by growth. Beneath the prosperity ran the century's fault lines: revolution in 1905, pogroms, and competing national dreams. Between 1917 and 1921 the city would change hands more than a dozen times as a Ukrainian People's Republic fought to be born.`,
      },
      {
        year: 1937, title: 'The Soviet Capital', kicker: 'Capital of the Ukrainian SSR · 1934',
        caption: 'A twelfth-century monastery is dynamited for a parade ground.',
        transitTitle: 'The plan demands a square…',
        camera: { pos: [160, 110, -420], look: [-50, 55, -285] },
        env: { skyTop: '#8898a8', skyBottom: '#c8c4b4', sunDir: [0.4, 0.5, -0.3], sunColor: '#e8e4d0', sunIntensity: 1.9, ambient: 0.8, fogColor: '#b8bcb4', fogDensity: 0.0009, haze: 0.55 },
        story: `<p>In 1934 the Soviet government of Ukraine moved from Kharkiv back to Kyiv — and set about rebuilding the ancient centre as a stage for power. A colossal government square was planned where <b>St. Michael's Golden-Domed Monastery</b> stood. Its mosaics were stripped, its domes pulled down, and on <b>14 August 1937</b> the 800-year-old cathedral was <b>dynamited</b>.</p>
<p>Only one building of the grand ensemble was ever finished — the stripped-classical colossus beside the void (today's Foreign Ministry). The empty hilltop where golden domes stood for eight centuries is the era's true monument.</p>`,
        context: `These are the years of Stalin's terror in Ukraine: the <b>Holodomor</b> famine of 1932–33 killed millions in the countryside around a capital that dined on ration cards; the intellectuals of the 1920s Ukrainian renaissance were shot in the purges — a generation now called the <b>Executed Renaissance</b>. The war on churches was part of the same campaign to break the old identity.`,
      },
      {
        year: 1943, major: true, title: 'War', kicker: '1941–1945',
        caption: 'The main street is a minefield. The ravine has a name: Babyn Yar.',
        transitTitle: 'The front rolls over the city…',
        camera: { pos: [340, 140, 120], look: [90, 25, 30] },
        env: { skyTop: '#5a5f68', skyBottom: '#8a8478', sunDir: [0.3, 0.3, -0.5], sunColor: '#c0b8a0', sunIntensity: 1.3, ambient: 0.5, fogColor: '#8a887c', fogDensity: 0.0016, haze: 0.8 },
        story: `<p>German troops took Kyiv on 19 September 1941. Five days later, <b>radio-controlled mines</b> pre-laid by the retreating NKVD began detonating along <b>Khreshchatyk</b> — the first long-range radio demolition in the history of war. The fires burned for days and levelled the heart of the city. In November, the Lavra's thousand-year-old Dormition Cathedral was blown up.</p>
<p>On 29–30 September 1941, in the ravine of <b>Babyn Yar</b> on the city's northwest edge, SS Einsatzgruppe C shot <b>33,771 Jews</b> in two days — one of the largest single massacres of the Holocaust. By war's end the ravine held as many as 100,000 dead: Jews, Roma, prisoners, patients, resisters.</p>`,
        context: `Kyiv was retaken in November 1943 at enormous cost. The city had lost most of its population — evacuated, deported, starved or murdered. Ukraine as a whole lost on the order of <b>seven million people</b> in the war. What you rebuild after such a wound, and what you choose to remember, shaped everything that follows.`,
      },
      {
        year: 1964, title: 'The Rebuilt City', kicker: 'Postwar Kyiv · 1950s–60s',
        caption: 'Chestnuts bloom over a brand-new ancient street.',
        transitTitle: 'Cranes over the ruins…',
        camera: { pos: [300, 100, 260], look: [70, 30, 40] },
        env: { skyTop: '#6fa5d4', skyBottom: '#dcd8c0', sunDir: [0.5, 0.6, -0.35], sunColor: '#fff2cc', sunIntensity: 2.4, ambient: 1.0, fogColor: '#ccd4cc', fogDensity: 0.0007, haze: 0.35 },
        story: `<p><b>Khreshchatyk</b> rose again (1949–1960) as a triumphal boulevard nearly 100 metres wide — cream-coloured ceramic facades in a style found nowhere else: <b>Stalinist neoclassicism wearing Ukrainian Baroque ornament</b>, under a promenade of chestnut trees.</p>
<p>The city leapt across the river: the all-welded <b>Paton Bridge</b> (1953, a world first), then the <b>Metro</b> (1960), whose <b>Arsenalna station</b> — 105.5 metres down inside the river bluff — remained the deepest on Earth for six decades. On the flat left bank, seas of prefabricated <b>panelky</b> apartments begin their march to the horizon.</p>`,
        context: `Soviet Kyiv grew past two million people. It was a capital of science (Paton's welding institute, cybernetics) and of quiet dissent — the <b>shistdesiatnyky</b>, the "Sixtiers" poets, met in these new apartments to keep the Ukrainian language alive. In 1986, 100 km north, reactor No. 4 at Chornobyl would test the state's habit of silence.`,
      },
      {
        year: 1991, major: true, title: 'Independence', kicker: '24 August 1991',
        caption: 'Blue over yellow above Saint Sophia.',
        transitTitle: 'An empire dissolves…',
        camera: { pos: [-140, 90, -560], look: [-250, 55, -200] },
        env: { skyTop: '#5f9fd8', skyBottom: '#f0e4c0', sunDir: [0.45, 0.6, -0.4], sunColor: '#fff6d8', sunIntensity: 2.5, ambient: 1.05, fogColor: '#dce0d4', fogDensity: 0.0006, haze: 0.3 },
        story: `<p>On <b>24 August 1991</b>, as the Soviet Union broke apart, the parliament in Kyiv declared the <b>independence of Ukraine</b>. In December, over 90% of voters confirmed it. The blue-and-yellow flag — sky over wheat — rose over the ancient city for the first time since 1920.</p>
<p>Kyiv, founded before most of Europe's capitals, became the capital of Europe's newest large state — inheriting a thousand years of layered history, and the task of deciding what to restore.</p>`,
        context: `Independent Ukraine chose to rebuild what the 1930s destroyed: watch the skyline in the next stops as <b>St. Michael's</b> (1997–1999) and the Lavra's <b>Dormition Cathedral</b> (1998–2000) return in their baroque forms — resurrection as national policy, and a statement about which history the country claims.`,
      },
      {
        year: 2014, major: true, title: 'The Maidan', kicker: 'Revolution of Dignity · 2013–2014',
        caption: 'A square becomes the centre of Europe.',
        transitTitle: 'Tents rise on the square…',
        camera: { pos: [280, 80, -180], look: [110, 25, -35] },
        env: { skyTop: '#70808f', skyBottom: '#b0a894', sunDir: [0.35, 0.4, -0.4], sunColor: '#e0d4b8', sunIntensity: 1.7, ambient: 0.75, fogColor: '#a8a89c', fogDensity: 0.0011, haze: 0.6 },
        story: `<p><b>Maidan Nezalezhnosti</b> — Independence Square — sits where the Lyadski Gate once stood, the gate the Mongols broke in 1240. Since 2001 the <b>Independence Monument</b>, a slender 61-metre column carrying the guardian-figure <b>Berehynia</b>, has watched over it.</p>
<p>Here the <b>Orange Revolution</b> filled the square in 2004; and in the winter of 2013–14 the <b>Revolution of Dignity</b> built a barricaded tent city that withstood snipers' bullets. More than a hundred protesters — the <b>Heavenly Hundred</b> — were killed, most on 18–20 February 2014 on the slope just above the square.</p>`,
        context: `The Maidan revolutions were fought over one question: does Ukraine belong to the imperial past or the European future? Russia answered by seizing Crimea and igniting war in the Donbas within weeks. The square's name entered the world's languages — "maidan" now means a people refusing to be ruled without consent.`,
      },
      {
        year: 2022, major: true, title: 'The City That Held', kicker: 'Full-scale invasion · 24 February 2022',
        caption: 'Kyiv in three days, they said.',
        transitTitle: 'Sirens over the Dnipro…',
        camera: { pos: [-240, 160, -680], look: [-30, 60, -290] },
        env: { skyTop: '#4a5560', skyBottom: '#8a8070', sunDir: [0.3, 0.25, -0.55], sunColor: '#d0b890', sunIntensity: 1.2, ambient: 0.55, fogColor: '#787468', fogDensity: 0.0015, haze: 0.8 },
        story: `<p>On <b>24 February 2022</b> Russia launched a full-scale invasion, expecting to take Kyiv in days. Paratroopers struck Hostomel airfield on the northwest edge; a 64-kilometre armoured column crawled toward the city. Kyiv answered with flooded rivers, blown bridges, anti-tank hedgehogs on Khreshchatyk — you can see them below — and its people queuing for rifles.</p>
<p>The column never arrived. By <b>2 April 2022</b> the whole Kyiv region was liberated, leaving behind the murdered civilians of <b>Bucha</b> and Irpin as evidence of what occupation meant. The smoke on the northwestern horizon is that battle.</p>`,
        context: `For the third time in a century — 1918–21, 1941–43, 2022 — Kyiv became a battlefield of European history. In August 2023 the Soviet coat of arms on the Motherland Monument was cut away and replaced with the Ukrainian <b>trident</b>: the thousand-year-old mark of Volodymyr's dynasty, back on the city's tallest shoulder.`,
      },
      {
        year: 2026, title: 'Kyiv, Continuing', kicker: 'The present day',
        caption: 'Fifteen centuries, one skyline.',
        transitTitle: 'Toward today…',
        camera: { pos: [500, 190, -420], look: [-40, 60, -180] },
        env: { skyTop: '#5f9fd8', skyBottom: '#ecdfc0', sunDir: [0.55, 0.55, -0.4], sunColor: '#fff6d8', sunIntensity: 2.5, ambient: 1.05, fogColor: '#d8dcd4', fogDensity: 0.0006, haze: 0.3 },
        story: `<p>Look around: every era is still here. The hills of Kyi. Podil's street grid, aligned since the 800s. Sophia's Byzantine core in its baroque coat. The rebuilt gold of St. Michael's and the Lavra. Khreshchatyk's chestnuts. The panelky sea across the river, glass towers between them — and <b>Mother Ukraine</b> on the southern hill, trident on her shield, facing east.</p>
<p>A city that has been capital of a medieval empire, a provincial ruin, a boomtown, a Soviet showcase, and the heart of a European democracy — and has outlived everyone who tried to end it.</p>`,
        context: `<b>Extend this world:</b> this entire timeline is one data file. Add your own city — its terrain, its buildings, its stories — and walk its history the same way. See the README for how.`,
      },
    ],
  };
}
