// Dnipro — from the river rapids to the rocket city.
// Geography (stylized but true): the river makes a great eastward bend; the
// right bank (west) rises in steppe hills where the city center sits inside
// the bend; the left bank is flat floodplain; Monastyrskyi Island lies just
// off the right bank; the famous rapids (porohy) begin downstream (south).
// 1 unit ≈ 1 metre. North is -z, east is +x.

const WATER_Y = 2;

// ---------- terrain ----------
const riverX = (z) => 520 + 210 * Math.sin(z * 0.0011 + 0.55);
const gauss = (x, z, cx, cz, r, amp) => {
  const dx = x - cx, dz = z - cz;
  return amp * Math.exp(-(dx * dx + dz * dz) / (r * r));
};
const sstep = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function heightAt(x, z) {
  const rc = riverX(z);
  const d = x - rc;
  const HW = 150;
  const noise = Math.sin(x * 0.0079 + z * 0.0034) * Math.cos(z * 0.0061 - x * 0.0025) * 1.4 + Math.sin(x * 0.021 + z * 0.019) * 0.4;

  let h;
  if (Math.abs(d) <= HW) {
    const t = 1 - (Math.abs(d) / HW) ** 2;
    h = WATER_Y - 7 * t;                                        // river bed
  } else if (d > HW) {
    h = 4 + 1.5 * Math.min(1, (d - HW) / 700) + noise * 0.5;    // flat left bank
  } else {
    const inland = -d - HW;
    h = 4 + 46 * sstep(0, 320, inland) + noise;                 // right-bank steppe bluffs
    h += gauss(x, z, -250, 150, 450, 10);                       // city hill
    h += gauss(x, z, -450, 900, 500, 8);                        // southern upland
  }
  // Monastyrskyi Island rises out of the channel
  h += gauss(x, z, 597, -160, 72, 11);
  // the rapids: rocky islets downstream
  h += gauss(x, z, 726, 1100, 26, 8);
  h += gauss(x, z, 698, 1185, 22, 7);
  h += gauss(x, z, 752, 1240, 20, 7);
  return h;
}

// river course for boats (they weave past the island)
const riverPath = [];
for (let z = -1150; z <= 980; z += 130) riverPath.push([riverX(z) + 55 * Math.sin(z * 0.006), z]);

// ---------- named routes ----------
const PROSPEKT = [[-520, -40], [-330, 60], [-120, 130], [120, 170], [430, 195]];
const EMBANK_D = [];
for (let z = -700; z <= 900; z += 130) EMBANK_D.push([riverX(z) - 165, z]);
const KODAK_RD = [[0, 300], [-80, 600], [-140, 900], [-150, 1040]];
const LEFT_AVE_D = [[830, -500], [870, -100], [890, 300], [900, 620]];
const CROSS_A = [[-260, 320], [-160, 140], [-60, -30]];
const CROSS_B = [[-60, 300], [20, 120], [60, -60]];
const eye = (x, z, h = 2.3) => [x, heightAt(x, z) + h, z];

const PLINFA = { wallStyle: 'plinthite', wall: '#c9b3a0' };

export function buildConfig() {
  return {
    id: 'dnipro',
    name: 'Dnipro',
    terrain: {
      size: 2600, segments: 230, heightAt,
      waterLevel: WATER_Y,
      grassColor: '#7d7a48', dirtColor: '#94805a', sandColor: '#bda87a',   // dry steppe palette
      waterDeep: '#26506a', waterShallow: '#417d92',
      urbanZones: [
        { x: -150, z: 150, rx: 360, rz: 290, year: 1790, strength: 0.35 },  // imperial grid
        { x: -150, z: 150, rx: 400, rz: 330, year: 1875, strength: 0.55 },  // boom-era center
        { x: 140, z: -480, rx: 240, rz: 220, year: 1888, strength: 0.55 },  // factory belt
        { x: 900, z: -100, rx: 320, rz: 420, year: 1935, strength: 0.4 },   // left bank industry
        { x: 900, z: 0, rx: 320, rz: 460, year: 1965, strength: 0.5 },      // left bank panelky
        { x: -80, z: 760, rx: 260, rz: 260, year: 1972, strength: 0.5 },    // Pobeda district
        { x: -520, z: 1120, rx: 300, rz: 230, year: 1952, strength: 0.5 },  // rocket-plant quarter
        { x: 260, z: 360, rx: 190, rz: 210, year: 2004, strength: 0.4 },    // riverside towers
      ],
    },

    // ================= STRUCTURURES =================
    structures: [
      // -- the island monastery of legend (9th c. – 1240) --
      { id: 'island-monastery', pos: [597, -155], rotY: 0.4, phases: [
        { from: 870, to: 1240, build: 'church', params: { ...PLINFA, w: 12, d: 15, h: 9, apses: 1,
          domeStyle: 'helmet', domeColor: 'gold', domes: [{ x: 0, z: 0, r: 2.6, drumH: 5 }] }, rise: 15, fall: 0.4, sinkDepth: 12 },
        { from: 1240, to: 1750, build: 'ruin', params: { seed: 61, n: 8, spread: 12, maxSize: 3, color: '#b09a86' }, rise: 2 },
        // St. Nicholas church rebuilt on the island, 1999
        { from: 1999, to: 9999, build: 'church', params: { wallStyle: 'baroque', wall: '#f2ede0', accent: '#cbb87a',
          w: 12, d: 15, h: 9, apses: 1, domeStyle: 'pear', domeColor: 'gold', domes: [{ x: 0, z: 0, r: 2.6, drumH: 5 }] }, rise: 2 },
      ]},
      { id: 'island-palisade', pos: [0, 0], phases: [
        { from: 880, to: 1240, build: 'palisade', params: { path: [[560, -200], [630, -210], [650, -150], [620, -105], [560, -130], [560, -200]], h: 3.6 }, rise: 15, fall: 0.5 },
      ]},

      // -- Kodak fortress, 1635–1711: Poland's lock on the Cossack river --
      { id: 'kodak', pos: [0, 0], phases: [
        { from: 1635, to: 1711, build: 'rampart', params: { path: [[-220, 990], [-90, 1000], [-70, 1100], [-200, 1115], [-220, 990]], earthH: 9, wallH: 4 }, rise: 1, fall: 1.5 },
      ]},
      { id: 'kodak-keep', pos: [-145, 1050], phases: [
        { from: 1635, to: 1711, build: 'woodCastle', params: {}, rise: 1, fall: 1.5, sinkDepth: 18 },
      ]},

      // -- Potemkin's imperial dream --
      // the legendary giant foundation of the Transfiguration Cathedral (1787)
      { id: 'foundation-outline', pos: [-330, 180], rotY: 0.3, phases: [
        { from: 1787, to: 1835, build: 'ruin', params: { seed: 62, n: 4, spread: 6, maxSize: 2, wallStub: [66, 2.2], color: '#a99a88' }, rise: 1 },
      ]},
      { id: 'transfiguration', pos: [-330, 180], rotY: 0.3, phases: [
        { from: 1835, to: 9999, build: 'classical', params: { w: 34, d: 20, floors: 2, wall: '#f0ead8', frame: '#7a7362',
          trim: 0xe0d8c2, cols: 6, colColor: 0xe8e2d0, dome: true, domeColor: '#caa53c' }, rise: 5 },
      ]},
      { id: 'potemkin-palace', pos: [-420, 90], rotY: 0.5, phases: [
        { from: 1789, to: 1943.7, build: 'classical', params: { w: 52, d: 20, floors: 2, wall: '#e8d8a8', frame: '#6a6252',
          trim: 0xd9cba8, cols: 8, colColor: 0xe0d4b4 }, rise: 3, fall: 0.4, sinkDepth: 14 },
        { from: 1943.8, to: 1952, build: 'ruin', params: { seed: 63, n: 10, spread: 20, maxSize: 4, wallStub: [30, 4], color: '#d9cba8' }, rise: 0.5 },
        { from: 1952, to: 9999, build: 'classical', params: { w: 52, d: 20, floors: 2, wall: '#e8d8a8', frame: '#6a6252',
          trim: 0xd9cba8, cols: 8, colColor: 0xe0d4b4 }, rise: 2 },
      ]},

      // -- the boom: bridge, plants, smokestacks --
      { id: 'amur-bridge', pos: [575, -260], phases: [
        { from: 1884, to: 1941.6, build: 'bridge', params: { len: 500, w: 10, deckY: 18, arches: true, color: 0x4a5058 }, rise: 3, fall: 0.3 },
        { from: 1955.9, to: 9999, build: 'bridge', params: { len: 500, w: 10, deckY: 18, arches: true, color: 0x5a6068 }, rise: 1.5 },
      ]},
      { id: 'bryansk-plant', pos: [140, -480], rotY: 0.25, phases: [
        { from: 1887, to: 9999, build: 'factory', params: { sheds: 3, stacks: 4, stackH: 46, seed: 21 }, rise: 4 },
      ]},
      { id: 'leftbank-plant', pos: [910, -220], rotY: -0.2, phases: [
        { from: 1932, to: 9999, build: 'factory', params: { sheds: 3, stacks: 3, stackH: 40, seed: 22 }, rise: 4 },
      ]},

      // -- the rocket city --
      { id: 'yuzhmash', pos: [-540, 1120], rotY: 0.2, phases: [
        { from: 1951, to: 9999, build: 'factory', params: { sheds: 4, stacks: 2, stackH: 30, furnace: false, seed: 23 }, rise: 4 },
      ]},
      { id: 'yuzhmash-rocket', pos: [-450, 1050], phases: [
        { from: 1957, to: 9999, build: 'rocket', params: { h: 30 }, rise: 2 },
      ]},
      { id: 'rocket-park', pos: [-180, 420], phases: [
        { from: 2013, to: 9999, build: 'rocket', params: { h: 22 }, rise: 1.5 },
      ]},

      // -- bridges and late-Soviet city --
      // the Merefa-Kherson rail bridge marches its arches right over the island
      { id: 'merefa-kherson-bridge', pos: [597, -158], phases: [
        { from: 1932, to: 1941.6, build: 'bridge', params: { len: 520, w: 8, deckY: 20, arches: true, color: 0x8f9296 }, rise: 2, fall: 0.3 },
        { from: 1948, to: 9999, build: 'bridge', params: { len: 520, w: 8, deckY: 20, arches: true, color: 0x9a9da0 }, rise: 1.5 },
      ]},
      { id: 'central-bridge', pos: [641, 60], phases: [
        { from: 1966, to: 9999, build: 'bridge', params: { len: 470, w: 14, deckY: 15, color: 0x5a6470 }, rise: 3 },
      ]},
      { id: 'circus', pos: [90, 330], phases: [
        { from: 1980, to: 9999, build: 'stadium', params: { r: 26 }, rise: 3 },
      ]},

      // -- independence era --
      { id: 'menorah-center', pos: [-240, 235], rotY: 0.3, phases: [
        { from: 2012, to: 9999, build: 'menorah', params: {}, rise: 3 },
      ]},
      { id: 'city-flag', pos: [-300, 140], phases: [
        { from: 1991, to: 9999, build: 'flag', params: { h: 16 }, rise: 1 },
      ]},

      // ================= ROADS & SQUARES =================
      // the prospekt: Potemkin's axis, later the great boulevard
      { id: 'road-prospekt', pos: [0, 0], phases: [
        { from: 1793, to: 1855, build: 'road', params: { path: PROSPEKT, w: 9, color: 0x8f7a52 }, rise: 6 },
        { from: 1855, to: 1957, build: 'road', params: { path: PROSPEKT, w: 16, color: 0x8d8578, sidewalk: true }, rise: 8 },
        { from: 1957, to: 9999, build: 'road', params: { path: PROSPEKT, w: 20, color: 0x4f5257, sidewalk: true, line: true }, rise: 4 },
      ]},
      { id: 'road-cross-a', pos: [0, 0], phases: [
        { from: 1860, to: 9999, build: 'road', params: { path: CROSS_A, w: 9, color: 0x8d8578, sidewalk: true }, rise: 8 },
      ]},
      { id: 'road-cross-b', pos: [0, 0], phases: [
        { from: 1862, to: 9999, build: 'road', params: { path: CROSS_B, w: 9, color: 0x8d8578, sidewalk: true }, rise: 8 },
      ]},
      { id: 'road-kodak', pos: [0, 0], phases: [
        { from: 1650, to: 1955, build: 'road', params: { path: KODAK_RD, w: 6, color: 0x8f7a52 }, rise: 20 },
        { from: 1960, to: 9999, build: 'road', params: { path: [[0, 300], [-60, 600], [-90, 850]], w: 12, color: 0x4f5257, line: true }, rise: 4 },
      ]},
      { id: 'road-embankment', pos: [0, 0], phases: [
        { from: 1965, to: 9999, build: 'road', params: { path: EMBANK_D, w: 13, color: 0x4f5257, line: true }, rise: 5 },
      ]},
      { id: 'road-central-appr', pos: [0, 0], phases: [
        { from: 1966, to: 9999, build: 'road', params: { path: [[120, 170], [300, 110], [408, 62]], w: 12, color: 0x4f5257, line: true }, rise: 3 },
      ]},
      { id: 'road-central-left', pos: [0, 0], phases: [
        { from: 1966, to: 9999, build: 'road', params: { path: [[874, 58], [1020, 55], [1180, 52]], w: 12, color: 0x4f5257, line: true }, rise: 3 },
      ]},
      { id: 'road-leftbank-ave', pos: [0, 0], phases: [
        { from: 1963, to: 9999, build: 'road', params: { path: LEFT_AVE_D, w: 14, color: 0x4f5257, sidewalk: true, line: true }, rise: 5 },
      ]},
      { id: 'road-plant-spur', pos: [0, 0], phases: [
        { from: 1888, to: 9999, build: 'road', params: { path: [[-120, 130], [40, -160], [120, -400]], w: 9, color: 0x8d8578 }, rise: 8 },
      ]},
      { id: 'road-yuzhmash', pos: [0, 0], phases: [
        { from: 1952, to: 9999, build: 'road', params: { path: [[-90, 850], [-300, 1000], [-470, 1090]], w: 12, color: 0x4f5257, line: true }, rise: 4 },
      ]},
      // junction pads
      ...[
        [-120, 130, 1855, 12], [120, 170, 1855, 12], [-330, 60, 1793, 10],
        [0, 300, 1860, 9], [-90, 850, 1955, 10], [874, 58, 1966, 10],
      ].map(([jx, jz, jy, jr], i) => ({
        id: `junction-${i}`, pos: [jx, jz], phases: [
          { from: jy, to: 9999, build: 'plaza', params: { rx: jr, rz: jr, color: jy >= 1950 ? 0x4f5257 : 0x8d8578 }, rise: 6 },
        ],
      })),
      // squares
      { id: 'plaza-cathedral', pos: [-330, 130], phases: [
        { from: 1835, to: 9999, build: 'plaza', params: { rx: 42, rz: 34, color: 0x8d8578 }, rise: 8 },
      ]},
      { id: 'plaza-heroes', pos: [-150, 150], phases: [
        { from: 1955, to: 9999, build: 'plaza', params: { rx: 40, rz: 34, color: 0x9a938c }, rise: 5 },
      ]},
      // streetlights
      { id: 'lamps-prospekt', pos: [0, 0], phases: [
        { from: 1885, to: 1955, build: 'lampline', params: { path: PROSPEKT, style: 'gas', offset: 9, spacing: 36 }, rise: 4 },
        { from: 1957, to: 9999, build: 'lampline', params: { path: PROSPEKT, style: 'modern', offset: 11, spacing: 42, bothSides: true }, rise: 3 },
      ]},
      { id: 'lamps-embankment', pos: [0, 0], phases: [
        { from: 1967, to: 9999, build: 'lampline', params: { path: EMBANK_D, style: 'modern', offset: 8.5, spacing: 52 }, rise: 3 },
      ]},
    ],

    // ================= DISTRICTS =================
    districts: [
      // Polovytsia: the Cossack sloboda the imperial city displaced
      { id: 'polovytsia', area: [-60, 160, 200, 160], seed: 111, phases: [
        { from: 1745, to: 1800, style: { gen: 'hut', vary: { w: [4.5, 7], d: [4, 6] } }, count: 30, rise: 25 },
      ]},
      // the imperial/boom-era center on the hill
      { id: 'center', area: [-160, 140, 330, 260], seed: 222, gridAngle: 0.3, phases: [
        { from: 1800, to: 1875, style: { gen: 'hut', vary: { w: [5, 8], d: [4, 6] } }, count: 40, rise: 30 },
        { from: 1875, to: 1950, style: { gen: 'townhouse', vary: { w: [11, 17], d: [9, 13], floors: [2, 4.4] } }, count: 64, rise: 18 },
        { from: 1955, to: 9999, style: [
          { gen: 'townhouse', vary: { w: [11, 16], d: [9, 13], floors: [3, 5.4] } },
          { gen: 'stalinka', vary: { w: [24, 34], d: [14, 18], floors: [5, 8.5] } },
        ], count: 60, rise: 10 },
      ]},
      // workers' sloboda around the Bryansk plant
      { id: 'plant-sloboda', area: [220, -420, 190, 170], seed: 333, gridAngle: 0.25, phases: [
        { from: 1890, to: 1955, style: { gen: 'hut', vary: { w: [4.5, 7], d: [4, 6] } }, count: 44, rise: 15 },
        { from: 1958, to: 9999, style: { gen: 'panelka', vary: { w: [20, 30], d: [11, 13], floors: [5, 9.9] } }, count: 26, rise: 10 },
      ]},
      // the flat left bank: villages -> industry-era housing -> panelky sea
      { id: 'left-bank', area: [920, 40, 300, 420], seed: 444, gridAngle: 0.1, phases: [
        { from: 1878, to: 1958, style: { gen: 'hut', vary: { w: [4.5, 7], d: [4, 6] } }, count: 30, rise: 40 },
        { from: 1965, to: 9999, style: { gen: 'panelka', vary: { w: [22, 34], d: [11, 14], floors: [9, 16.9] } }, count: 60, rise: 10 },
      ]},
      // Pobeda: the riverside panel district on the right bank
      { id: 'pobeda', area: [-80, 770, 240, 230], seed: 555, gridAngle: -0.2, phases: [
        { from: 1972, to: 9999, style: { gen: 'panelka', vary: { w: [24, 36], d: [11, 14], floors: [9, 16.9] } }, count: 40, rise: 8 },
      ]},
      // the rocket-plant quarter: neat Soviet town for a secret factory
      { id: 'yuzhmash-town', area: [-480, 1040, 260, 200], seed: 666, gridAngle: 0.2, phases: [
        { from: 1955, to: 9999, style: [
          { gen: 'stalinka', vary: { w: [22, 30], d: [13, 16], floors: [4, 6.5] } },
          { gen: 'panelka', vary: { w: [20, 30], d: [11, 13], floors: [5, 9.9] } },
        ], count: 34, rise: 10 },
      ]},
      // riverside towers of the 2000s
      { id: 'river-towers', area: [260, 380, 170, 190], seed: 777, phases: [
        { from: 2004, to: 9999, style: { gen: 'glassTower', vary: { w: [14, 20], d: [14, 20], h: [45, 100] } }, count: 12, rise: 6 },
      ]},
    ],

    // ================= EFFECTS =================
    effects: {
      birdCenter: [200, 0, 0],
      birdRadius: 420,
      fires: [
        // industrial smoke: the boom-era plants (no flames, just plumes)
        { pos: [90, 8, -510], radius: 40, from: 1888, to: 1993, intensity: 0.8, smokeOnly: true },
        { pos: [880, 6, -250], radius: 36, from: 1933, to: 1996, intensity: 0.7, smokeOnly: true },
        // 1941–43: occupation and destruction
        { pos: [-180, 45, 140], radius: 60, from: 1941.6, to: 1944, intensity: 1 },
        { pos: [120, 20, 170], radius: 45, from: 1941.6, to: 1943.9, intensity: 0.8 },
        // 2022–: missile strikes; January 2023 in the Pobeda district
        { pos: [-60, 25, 740], radius: 40, from: 2023.03, to: 2023.25, intensity: 1 },
        { pos: [250, 15, 320], radius: 30, from: 2022.2, to: 2022.5, intensity: 0.6 },
      ],
      boats: [
        // Cossack chaiky running the river road
        { from: 1550, to: 1780, style: 'longship', path: riverPath, speed: 0.007 },
        { from: 1787, to: 1910, style: 'sail', path: riverPath.map(([x, z]) => [x + 40, z]), speed: 0.005 },
        { from: 1900, to: 9999, style: 'barge', path: riverPath.map(([x, z]) => [x - 30, z]), speed: 0.008 },
      ],
      traffic: [
        { from: 1800, to: 1920, path: PROSPEKT, type: 'cart', count: 2, speed: 0.006, seed: 71 },
        { from: 1660, to: 1900, path: KODAK_RD, type: 'cart', count: 1, speed: 0.005, seed: 72 },
        // the electric tram arrives in 1897
        { from: 1897, to: 9999, path: PROSPEKT, type: 'tram', count: 2, speed: 0.010, seed: 73 },
        { from: 1958, to: 9999, path: PROSPEKT, type: 'car', count: 5, speed: 0.02, offset: 6, seed: 74 },
        { from: 1960, to: 9999, path: [...PROSPEKT].reverse(), type: 'car', count: 4, speed: 0.019, offset: 6, seed: 75 },
        { from: 1966, to: 9999, path: EMBANK_D, type: 'bus', count: 2, speed: 0.012, seed: 76 },
        { from: 1965, to: 9999, path: LEFT_AVE_D, type: 'car', count: 4, speed: 0.018, offset: 5, seed: 77 },
      ],
      crowds: [
        // May 1787: Catherine II and Joseph II lay the cathedral's stone
        { from: 1786.9, to: 1788, area: [-330, 150, 45, 40], count: 90,
          colors: ['#8a3a2a', '#3a4a6a', '#d9c8a8', '#6a5a8a'], seed: 81 },
        // 2014: the city rallies
        { from: 2013.9, to: 2014.4, area: [-150, 150, 45, 40], count: 140,
          colors: ['#3a4a6a', '#2a2d33', '#0057b7', '#ffd700'], seed: 82 },
        { from: 2024, to: 9999, area: [-150, 150, 45, 45], count: 50, colors: ['#5a6a8a', '#8a5a3a', '#c8b498'], seed: 83 },
      ],
      groves: [
        { area: [-600, -400, 400, 380], count: 90, kind: 'oak', seed: 91 },
        { area: [-500, 500, 350, 300], count: 70, kind: 'oak', seed: 92 },
        { area: [597, -160, 70, 70], count: 16, kind: 'oak', seed: 93 },       // the island's woods
        { area: [1000, 300, 280, 400], count: 50, kind: 'poplar', seed: 94 },
        { area: [-100, 400, 180, 160], count: 40, kind: 'chestnut', seed: 95, from: 1890 },  // the city park
        { area: [-350, 1100, 300, 200], count: 40, kind: 'pine', seed: 96 },
      ],
    },

    // ================= ERA STOPS =================
    stops: [
      {
        year: 950, major: true, title: 'The River Road and the Rapids', kicker: 'Before the city · 9th–10th century',
        caption: 'Below this bend, the river breaks into nine walls of stone.',
        transitTitle: 'The steppe and the river…',
        camera: { pos: [850, 120, -450], look: [600, 15, -150] },
        street: { pos: eye(590, -120, 2.5), look: eye(620, -180, 6) },
        env: { skyTop: '#7fa8d0', skyBottom: '#e8d0a0', sunDir: [0.7, 0.35, -0.4], sunColor: '#ffdca0', sunIntensity: 2.1, ambient: 0.85, fogColor: '#d8c8a4', fogDensity: 0.0008, haze: 0.5 },
        story: `<p>Long before any city, this bend of the Dnipro was the most dangerous mile of the great trade road <b>"from the Varangians to the Greeks"</b>. Just downstream — look south — the river once broke over the <b>porohy</b>, nine granite rapids that forced every boat ashore, to be dragged past the white water while the steppe watched.</p>
<p>On the wooded island below you, tradition places a <b>Byzantine monastery of the 9th century</b>, where travellers prayed before daring the rapids — destroyed, the story goes, by the Mongols in 1240. The island has been called <b>Monastyrskyi</b> ever since.</p>`,
        context: `<b>Honest history:</b> the island monastery rests on a tradition first written down only in 1880, with no archaeological support — but the rapids and the portage are hard fact, and they made this place matter for a thousand years before a city existed. The rapids themselves vanished in 1932, drowned by the Dniprohes dam downstream.`,
      },
      {
        year: 1635, title: 'The Fortress on the Rapids', kicker: 'Cossacks & crowns · 17th century',
        caption: 'A star fort rises to lock the Cossacks out of their own river.',
        transitTitle: 'The Wild Fields…',
        camera: { pos: [180, 130, 850], look: [-140, 55, 1050] },
        street: { pos: eye(-100, 970, 2.4), look: eye(-145, 1050, 10) },
        env: { skyTop: '#7aa8c8', skyBottom: '#ddd0ac', sunDir: [0.5, 0.5, -0.4], sunColor: '#f8ecc8', sunIntensity: 2.1, ambient: 0.9, fogColor: '#ccc8b0', fogDensity: 0.0008, haze: 0.5 },
        story: `<p>These steppes were the <b>Wild Fields</b> — the Zaporozhian Cossacks' world, beyond any king's writ. In July 1635 the Polish-Lithuanian Commonwealth built <b>Kodak Fortress</b> on the bluff above the first rapid, to cut the Cossack lowlands off from the Sich downstream and stop runaway serfs from joining them.</p>
<p>It stood <b>one month</b>. In August 1635 Hetman <b>Ivan Sulyma</b> stormed it by night and razed it. Rebuilt bigger in 1639, it watched the river until 1711, when treaty obliged its demolition. Cossack settlements — Novyi Kodak, Polovytsia — grew along the bank below; their farmsteads are the true ancestors of the city.</p>`,
        context: `Kodak's fate is the whole story of Ukraine's 17th century in miniature: imperial powers building forts on Cossack rivers, and Cossacks refusing to accept them. When Khmelnytsky's great uprising came in 1648, its causes were already standing here in stone.`,
      },
      {
        year: 1787, major: true, title: 'Catherine’s Glory', kicker: 'Yekaterinoslav · 1776–1787',
        caption: 'Two emperors lay two stones for a cathedral that will never rise.',
        transitTitle: 'An empire draws a city on the steppe…',
        camera: { pos: [-560, 110, 380], look: [-330, 55, 170] },
        street: { pos: eye(-360, 130, 2.4), look: eye(-330, 180, 6) },
        env: { skyTop: '#6fa5d8', skyBottom: '#ecd8ac', sunDir: [0.5, 0.55, -0.35], sunColor: '#fff0c8', sunIntensity: 2.3, ambient: 0.95, fogColor: '#d8d0b8', fogDensity: 0.0007, haze: 0.4 },
        story: `<p>In 1776, on conquered Cossack land, the empire founded <b>Yekaterinoslav</b> — "Catherine's Glory". Prince <b>Potemkin</b> dreamed it as a third imperial capital: a university, a conservatory, botanical gardens, and a cathedral modelled on Rome's basilica of <b>St. Paul Outside the Walls</b> — which legend soon inflated into "one arshin longer than St. Peter's".</p>
<p>In May 1787 <b>Catherine II</b> sailed down the Dnipro with Emperor <b>Joseph II</b> of Austria to found it. The two monarchs laid the first stones of the great cathedral — prompting Joseph's reported quip: <i>"I laid the second stone, and the Empress the first — and the last."</i> He was nearly right: money and Potemkin died, and only the vast foundation outline remained — you can see it below, a rectangle of stone in the grass.</p>`,
        context: `The first Yekaterinoslav (1776) was actually planted north of here on the marshy Kilchen river and drowned in its own floods; the city moved to this high right bank in 1784 — onto the Cossack village of <b>Polovytsia</b>, whose houses stand around you. Imperial glory was built literally on top of Cossack ground: the city's two origin stories in one hillside. (Even the "1776" founding date is political — it was fixed in 1976 so the bicentennial would coincide with Brezhnev's 70th birthday.)`,
      },
      {
        year: 1835, title: 'The Modest Reality', kicker: 'A governorate town · early 19th century',
        caption: 'Inside a giant’s foundation, a modest cathedral.',
        transitTitle: 'The dream shrinks to fit…',
        camera: { pos: [-520, 90, 320], look: [-340, 45, 160] },
        street: { pos: eye(-300, 155, 2.4), look: eye(-330, 180, 8) },
        env: { skyTop: '#84aed4', skyBottom: '#e4d8b8', sunDir: [0.5, 0.55, -0.35], sunColor: '#fff2cc', sunIntensity: 2.2, ambient: 0.95, fogColor: '#d4d4c0', fogDensity: 0.0007, haze: 0.4 },
        story: `<p>Fifty years on, "Catherine's Glory" is a sleepy governorate town of some ten thousand souls. In 1830–1835 the <b>Transfiguration Cathedral</b> was finally built — a graceful classical church that would fit inside the altar of Potemkin's fantasy. It stands <b>inside the original foundation perimeter</b>, which peeks from the lawn around it like the outline of a ghost.</p>
<p>The <b>Potemkin Palace</b> on the hill above the river — the prince's own residence of the 1780s, the city's oldest building — hosts the nobility's assemblies. The great <b>prospekt</b> Potemkin drew across the hill is a dusty, tree-lined promise.</p>`,
        context: `Cities rarely die of embarrassment; they wait. Yekaterinoslav's advantages — the river, the hill, the black-earth steppe — were real even when the imperial theatre was not. It needed only a reason to matter. The reason, discovered a few hundred kilometres away, was <b>iron</b>.`,
      },
      {
        year: 1884, title: 'The Bridge', kicker: 'Ore meets coal · 1884',
        caption: 'A mile of iron connects two buried treasures.',
        transitTitle: 'Rails race across the steppe…',
        camera: { pos: [300, 110, -600], look: [575, 20, -260] },
        street: { pos: eye(390, -310, 2.6), look: [575, 22, -260] },
        env: { skyTop: '#7fa8cc', skyBottom: '#e0d0b0', sunDir: [0.45, 0.5, -0.4], sunColor: '#ffeec4', sunIntensity: 2.2, ambient: 0.9, fogColor: '#ccc8b8', fogDensity: 0.00075, haze: 0.5 },
        story: `<p>West of the city lay the iron mountain of <b>Kryvyi Rih</b>; east, the coal of the <b>Donbas</b>. In 1884 the <b>Catherine Railway</b> joined them — and its centrepiece was this <b>kilometre-and-a-half, two-tier iron bridge</b> across the Dnipro — rails below, road above, the third-longest bridge in Europe when it opened — carrying trains high over the water on a march of arches.</p>
<p>The geometry was destiny: ore and coal had to meet somewhere, and they met here. Within three years the first great metallurgical works would light its furnaces on the riverbank you see smoking to the north.</p>`,
        context: `Railways made the modern map of Ukraine's south and east: Yekaterinoslav, Yuzivka (Donetsk), Kryvyi Rih — all children of the 1880s ore-and-coal economy. Their fortunes, their factory culture, even their 21st-century fates trace back to this decade of iron.`,
      },
      {
        year: 1900, major: true, title: 'The Ukrainian Manchester', kicker: 'Boomtown · circa 1900',
        caption: 'Furnaces by the river, mansions on the hill.',
        transitTitle: 'Smoke and money…',
        camera: { pos: [-350, 130, -180], look: [0, 40, 90] },
        street: { pos: eye(-150, 105, 2.4), look: eye(-40, 145, 5) },
        env: { skyTop: '#8aa4b8', skyBottom: '#d8c8a4', sunDir: [0.4, 0.45, -0.4], sunColor: '#f4e0b0', sunIntensity: 2.0, ambient: 0.85, fogColor: '#bcb4a0', fogDensity: 0.001, haze: 0.6 },
        story: `<p>In one generation the sleepy town exploded into <b>the Ukrainian Manchester</b>: the Alexandrovsk (Bryansk) works and its sisters poured steel day and night; population leapt from twenty thousand to well past a hundred; in <b>1897</b> an <b>electric tram</b> — the third in the empire, after Kyiv and Nizhny Novgorod — began climbing the prospekt, now a canyon of banks and mansions.</p>
<p>A third of the city was <b>Jewish</b> — merchants, doctors, factory hands — one of the great Jewish cities of Europe. Prosperity had a dark twin: the pogrom of October 1905 killed scores here. Workers' slobodas of mud and timber pressed against the factory fences below the smoke.</p>`,
        context: `Steel towns grow fast and argue hard. In 1905 and again in 1917–20 Yekaterinoslav was a battlefield of revolutions — Reds, Whites, Ukrainian republicans and <b>Makhno's</b> anarchist tachanky all held the prospekt at gunpoint in turn. The factories changed flags; the furnaces barely cooled.`,
      },
      {
        year: 1932, title: 'Red Metallurgy', kicker: 'Dnipropetrovsk · 1926–1930s',
        caption: 'The city takes a Bolshevik’s name and doubles its steel.',
        transitTitle: 'Five-year plans…',
        camera: { pos: [500, 140, -700], look: [300, 30, -350] },
        street: { pos: eye(300, -380, 2.4), look: eye(150, -470, 12) },
        env: { skyTop: '#7a94a8', skyBottom: '#c8bca0', sunDir: [0.4, 0.5, -0.3], sunColor: '#e8dcc0', sunIntensity: 1.9, ambient: 0.8, fogColor: '#b0aa98', fogDensity: 0.0011, haze: 0.6 },
        story: `<p>In 1926 the Soviets renamed the city <b>Dnipropetrovsk</b>, after the Bolshevik <b>Grigory Petrovsky</b> — nominal head of Soviet Ukraine. Under the first five-year plans its plants swelled; a new industrial city grew on the flat <b>left bank</b>, joined to the old hill by bridge and barge.</p>
<p>The same years broke the countryside around it: the <b>Holodomor</b> famine of 1932–33, engineered by grain seizures, killed millions of peasants in these black-earth provinces while the city's canteens fed steelworkers by ration card.</p>`,
        context: `Industrial triumph and rural catastrophe were one policy seen from two windows. Remember the name on the city for the next ninety years — Petrovsky himself signed decrees that fed the famine. In 2016 the city would shed his name and keep only the river's.`,
      },
      {
        year: 1943, major: true, title: 'War', kicker: '1941–1943',
        caption: 'Two years of occupation. The ravines keep the count.',
        transitTitle: 'The front crosses the river…',
        camera: { pos: [-450, 140, -100], look: [-150, 40, 160] },
        street: { pos: eye(-200, 120, 2.4), look: eye(-120, 160, 4) },
        env: { skyTop: '#5a5f68', skyBottom: '#8a8478', sunDir: [0.3, 0.3, -0.5], sunColor: '#c0b8a0', sunIntensity: 1.3, ambient: 0.5, fogColor: '#8a887c', fogDensity: 0.0016, haze: 0.8 },
        story: `<p>German forces took Dnipropetrovsk in <b>August 1941</b>; the retreating Soviets blew the great bridge behind them. In <b>October 1941</b> the occupiers marched more than <b>ten thousand of the city's Jews</b> to an anti-tank ditch near the botanical garden and shot them over two days — one of the largest single massacres in Ukraine after Babyn Yar. The community that had been a third of the city was annihilated.</p>
<p>Liberation came on <b>25 October 1943</b>, across a burning river into a city of ruins. The bridge rose again within a year; whole districts took a decade.</p>`,
        context: `Every industrial city of Ukraine's east carries this same double scar: the Holocaust in its ravines and ditches, and near-total destruction in two passes of the front. What was rebuilt afterwards would be a different city with a different secret — one the world would not be allowed to see.`,
      },
      {
        year: 1959, major: true, title: 'The Rocket City', kicker: 'Closed city · 1951–1987',
        caption: 'The tractor factory that aimed at the Moon — and at Washington.',
        transitTitle: 'A secret takes over the city…',
        camera: { pos: [-150, 160, 800], look: [-480, 40, 1100] },
        street: { pos: eye(-420, 1010, 2.4), look: eye(-460, 1055, 14) },
        env: { skyTop: '#6fa5d4', skyBottom: '#dcd4b4', sunDir: [0.5, 0.6, -0.35], sunColor: '#fff2cc', sunIntensity: 2.4, ambient: 1.0, fogColor: '#ccd0c0', fogDensity: 0.0007, haze: 0.35 },
        story: `<p>South of the old city, a postwar "automobile plant" quietly changed products. By the mid-1950s <b>Yuzhmash</b> (the Southern Machine-Building Plant) and <b>Mikhail Yangel's</b> design bureau <b>KB Yuzhnoye</b> were building the Soviet Union's ballistic missiles — the R-12, the R-16, and eventually the heaviest ICBM ever fielded, known to NATO as the <b>SS-18 Satan</b>, alongside space launchers like Zenit and Tsyklon.</p>
<p>The price of the secret: <b>Dnipropetrovsk was closed to foreigners</b> from 1959 until 1987. A city of a million lived publicly invisible — no foreign tourists, no sister cities, its own name absent from certain maps' explanations.</p>`,
        context: `The rocket city bred a political dynasty: <b>Brezhnev</b> began his career here, and the "Dnipropetrovsk clan" ran much of the late USSR — and then, through <b>Leonid Kuchma</b>, Yuzhmash's own director, the presidency of independent Ukraine (1994–2005). Steel, rockets, power: the city's three exports.`,
      },
      {
        year: 1976, title: 'The Millionth Citizen', kicker: 'Late-Soviet metropolis · 1970s',
        caption: 'Panel housing to the horizon on both banks.',
        transitTitle: 'The city crosses a million…',
        camera: { pos: [420, 160, 700], look: [-50, 40, 500] },
        street: { pos: eye(-40, 720, 2.4), look: eye(-110, 790, 8) },
        env: { skyTop: '#6fa5d4', skyBottom: '#e0d8bc', sunDir: [0.5, 0.6, -0.35], sunColor: '#fff2cc', sunIntensity: 2.4, ambient: 1.0, fogColor: '#ccd4c8', fogDensity: 0.00065, haze: 0.35 },
        story: `<p>In the 1970s Dnipropetrovsk passed <b>one million inhabitants</b> — a metropolis of steel, rockets and prefab concrete. Panel districts marched down both banks: <b>Pobeda</b> ("Victory") spread along the right-bank riverfront below you, its sixteen-storey slabs facing the water across the new <b>embankment</b> — locals will tell you it's the longest in Europe.</p>
<p>With Brezhnev in the Kremlin the city's men held the ministries; the joke ran that history has three eras — <i>pre-Petrine, Petrine, and Dnipropetrine</i>. A metro was decreed; digging began in 1981 and would outlast the state that ordered it.</p>`,
        context: `Late-Soviet Dnipropetrovsk was comfortable, closed, and quietly Ukrainian-speaking at home while Russian-speaking in public — the standard double life of the east. When the empire ended, no city had more to renegotiate: its factories, its secrets, and its self.`,
      },
      {
        year: 1995, title: 'Independence, the Hard Way', kicker: '1991–1990s',
        caption: 'The rockets get civilian passports.',
        transitTitle: 'Flags change over the plants…',
        camera: { pos: [-500, 120, 300], look: [-240, 45, 180] },
        street: { pos: eye(-280, 120, 2.4), look: eye(-330, 175, 10) },
        env: { skyTop: '#5f9fd8', skyBottom: '#ecdfc0', sunDir: [0.5, 0.55, -0.4], sunColor: '#fff6d8', sunIntensity: 2.4, ambient: 1.0, fogColor: '#d8dcd0', fogDensity: 0.00065, haze: 0.35 },
        story: `<p>Independent Ukraine inherited the rocket city and gave up the warheads: Yuzhmash's missiles left the country under disarmament treaties, while its <b>Zenit</b> rockets found civilian work launching satellites from a floating pad on the Pacific. The plant's director, <b>Leonid Kuchma</b>, became prime minister, then <b>president</b> in 1994.</p>
<p>On <b>29 December 1995</b> the city finally opened its <b>metro</b> — six stations, thirteen years in the digging, a Soviet promise delivered into a different country. The 1990s otherwise ran on survival: idle furnaces, barter salaries, and the first private fortunes rising out of the metal trade.</p>`,
        context: `Dnipropetrovsk kept producing presidents, oligarchs and prime ministers at a rate no other city matched — Kuchma, Tymoshenko, Kolomoisky all built power here. Whatever Ukraine was becoming, a large share of it was decided in this city's offices.`,
      },
      {
        year: 2014, major: true, title: 'The Outpost', kicker: 'Dignity & war · 2012–2016',
        caption: 'The rear becomes the front’s strong shoulder.',
        transitTitle: 'War comes east…',
        camera: { pos: [-460, 110, 420], look: [-240, 50, 230] },
        street: { pos: eye(-190, 200, 2.4), look: eye(-240, 235, 12) },
        env: { skyTop: '#70808f', skyBottom: '#b0a894', sunDir: [0.35, 0.4, -0.4], sunColor: '#e0d4b8', sunIntensity: 1.7, ambient: 0.75, fogColor: '#a8a89c', fogDensity: 0.001, haze: 0.55 },
        story: `<p>In 2012 the city's Jewish community — reborn from the ashes of 1941 — opened the <b>Menorah Center</b> beside the Golden Rose synagogue: seven stone towers in the shape of the seven-branched lamp, called the largest Jewish community complex in the world. Two years later, when war began in the Donbas, Dnipropetrovsk chose its side without hesitation.</p>
<p>The city became the front's <b>outpost</b>: volunteer battalions mustered here, warehouses filled with donated armour and food, and <b>Mechnikov Hospital</b> became the place that gave wounded soldiers back their lives, hundreds upon hundreds of them. In 2016 the city dropped the Bolshevik from its name: simply <b>Dnipro</b>, like the river.</p>`,
        context: `The reversal was complete: the closed Soviet rocket city became one of the loudest engines of Ukraine's independence war effort — Russian-speaking, and immune to the "Russian world" offered to it. Identity, it turned out, was never about language here.`,
      },
      {
        year: 2023.2, major: true, title: 'Under Fire, Standing', kicker: 'Full-scale invasion · 2022–',
        caption: 'The sirens know the address; the city stays.',
        transitTitle: 'Missiles over the river…',
        camera: { pos: [350, 150, 950], look: [-80, 30, 720] },
        street: { pos: eye(-20, 700, 2.4), look: eye(-70, 745, 8) },
        env: { skyTop: '#4a5560', skyBottom: '#8a8070', sunDir: [0.3, 0.25, -0.55], sunColor: '#d0b890', sunIntensity: 1.2, ambient: 0.55, fogColor: '#787468', fogDensity: 0.0014, haze: 0.8 },
        story: `<p>Since February 2022 Dnipro has lived an hour's flight from the front — close enough to bleed, strong enough to hold. Missiles have struck its homes again and again; worst of all on <b>14 January 2023</b>, when a heavy anti-ship missile levelled a nine-storey apartment block in the riverside districts, killing <b>46 civilians</b>. The smoke you see rises there.</p>
<p>And still the city does what it has always done: makes things and mends people. Its plants turn to armour and drones, its logistics feed the eastern front, and Mechnikov's surgeons work through the sirens, as they have since 2014.</p>`,
        context: `From Kodak to the closed rocket plant to this: four centuries of empires trying to hold this bend of the river, and the river's city outlasting each attempt. The pattern is the point — and the reason this timeline exists.`,
      },
      {
        year: 2026, title: 'Dnipro, Continuing', kicker: 'The present day',
        caption: 'Steel, rockets, resilience — one skyline.',
        transitTitle: 'Toward today…',
        camera: { pos: [700, 190, 500], look: [-100, 50, 200] },
        street: { pos: eye(370, 210, 2.6), look: eye(-100, 170, 30) },
        env: { skyTop: '#5f9fd8', skyBottom: '#ecdfc0', sunDir: [0.55, 0.55, -0.4], sunColor: '#fff6d8', sunIntensity: 2.5, ambient: 1.05, fogColor: '#d8dcd4', fogDensity: 0.0006, haze: 0.3 },
        story: `<p>Look around: the layers are all present. Monastyrskyi Island with its rebuilt church. The prospekt Potemkin drew, still the city's spine. The classical cathedral inside its giant's foundation. The bridges of 1884, 1932 — its arches striding over the island — and 1966. Smokestacks upstream, the Menorah's seven towers on the hill, panelky and glass along the water, and the embankment stitching it all together.</p>
<p>A city founded as an empress's compliment, raised by iron, hidden for rockets, and revealed — in its hardest years — as one of the sturdiest corners of a free country.</p>`,
        context: `<b>Extend this world:</b> Dnipro is the second city built on this engine — one config file, like Kyiv's. Yours could be the third; see the README.`,
      },
    ],
  };
}
