// London — Londinium to the Shard.
// Geography (stylized but true): the Thames runs west–east in a gentle S;
// the walled City sits on two low hills (Ludgate, Cornhill) on the north
// bank; Westminster lies upstream to the southwest; Southwark faces the
// City across the bridge; the docks and later Canary Wharf lie downstream.
// 1 unit ≈ 1 metre. North is -z, east is +x.

const WATER_Y = 2;

// ---------- terrain ----------
const riverZ = (x) => 90 * Math.sin(x * 0.0015 + 0.4);
const gauss = (x, z, cx, cz, r, amp) => {
  const dx = x - cx, dz = z - cz;
  return amp * Math.exp(-(dx * dx + dz * dz) / (r * r));
};
const sstep = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function heightAt(x, z) {
  const rc = riverZ(x);
  const d = z - rc;
  const HW = 95;
  const noise = Math.sin(x * 0.0081 + z * 0.0037) * Math.cos(z * 0.0063 - x * 0.0027) * 1.1 + Math.sin(x * 0.023 + z * 0.017) * 0.35;

  let h;
  if (Math.abs(d) <= HW) {
    const t = 1 - (Math.abs(d) / HW) ** 2;
    h = WATER_Y - 6 * t;                                       // river bed
  } else if (d > HW) {
    h = 5 + 2 * Math.min(1, (d - HW) / 700) + noise * 0.6;     // low south bank
  } else {
    const inland = -d - HW;
    h = 7 + 9 * sstep(0, 550, inland) + noise;                 // north bank rising gently
    h += gauss(x, z, -80, -190, 160, 7);                       // Ludgate Hill
    h += gauss(x, z, 190, -190, 150, 6);                       // Cornhill
  }
  return h;
}

// river course for boats
const riverPath = [];
for (let x = -1150; x <= 1150; x += 130) riverPath.push([x, riverZ(x) + 25 * Math.sin(x * 0.004)]);

// ---------- named routes ----------
const WATLING = [[-900, -240], [-500, -200], [-150, -180], [180, -170], [500, -120], [820, -100]];
const STRAND = [[-780, -40], [-520, -90], [-260, -140], [-80, -170]];
const BOROUGH = [[180, 170], [160, 300], [140, 430]];
const BRIDGE_LINK = [[180, -170], [180, -55]];
const EAST_RD = [[400, -120], [650, -95], [900, -75]];
const EMBANK_L = [];
for (let x = -760; x <= -60; x += 100) EMBANK_L.push([x, riverZ(x) - 104]);
const eye = (x, z, h = 2.3) => [x, heightAt(x, z) + h, z];

export function buildConfig() {
  return {
    id: 'london',
    name: 'London',
    terrain: {
      size: 2600, segments: 230, heightAt,
      waterLevel: WATER_Y,
      grassColor: '#5f7a4a', dirtColor: '#7d7256', sandColor: '#a89a72',
      waterDeep: '#3d4a48', waterShallow: '#5a6e66',            // the Thames' grey-green
      urbanZones: [
        { x: 60, z: -210, rx: 330, rz: 230, year: 60, strength: 0.35 },     // Londinium
        { x: 60, z: -210, rx: 330, rz: 230, year: 890, strength: 0.35 },    // medieval City
        { x: 60, z: -190, rx: 360, rz: 250, year: 1670, strength: 0.55 },   // post-Fire City
        { x: -780, z: -60, rx: 200, rz: 150, year: 1050, strength: 0.3 },   // Westminster
        { x: -780, z: -40, rx: 220, rz: 170, year: 1750, strength: 0.5 },
        { x: 150, z: 200, rx: 220, rz: 160, year: 1570, strength: 0.35 },   // Southwark
        { x: -450, z: -260, rx: 260, rz: 190, year: 1720, strength: 0.5 },  // West End
        { x: 660, z: -150, rx: 280, rz: 180, year: 1810, strength: 0.5 },   // East End
        { x: 0, z: -150, rx: 950, rz: 550, year: 1860, strength: 0.4 },     // the Victorian ocean of brick
        { x: 950, z: 60, rx: 180, rz: 150, year: 1988, strength: 0.45 },    // Docklands
      ],
    },

    // ================= STRUCTURES =================
    structures: [
      // -- Roman Londinium --
      { id: 'roman-bridge', pos: [180, 56], rotY: Math.PI / 2, phases: [
        { from: 52, to: 1176, build: 'bridge', params: { len: 230, w: 7, deckY: 8, color: 0x6b5238 }, rise: 4 },
      ]},
      { id: 'roman-forum', pos: [200, -230], rotY: 0.1, phases: [
        { from: 105, to: 360, build: 'classical', params: { w: 56, d: 24, floors: 2, wall: '#e0d4bc', frame: '#8a5a44',
          trim: 0xa84832, cols: 8, colColor: 0xe8e0cc }, rise: 18, fall: 20 },
      ]},
      { id: 'amphitheatre', pos: [80, -280], phases: [
        { from: 120, to: 420, build: 'stadium', params: { r: 24 }, rise: 30, fall: 40 },
      ]},
      { id: 'london-wall', pos: [0, 0], phases: [
        { from: 210, to: 1760, build: 'rampart', params: {
          path: [[-160, -85], [-230, -260], [-100, -390], [150, -410], [360, -310], [390, -35]],
          earthH: 2.5, wallH: 6 }, rise: 20, fall: 30 },
      ]},

      // -- Norman London --
      { id: 'white-tower', pos: [380, -95], rotY: 0.15, phases: [
        { from: 1080, to: 9999, build: 'gate', params: { wallStyle: 'stone', wall: '#e8e2d2', accent: '#b8ad94',
          w: 26, h: 22, d: 26, chapel: false }, rise: 15 },
      ]},
      { id: 'tower-walls', pos: [0, 0], phases: [
        { from: 1285, to: 9999, build: 'rampart', params: {
          path: [[330, -140], [430, -145], [445, -60], [340, -50], [330, -140]], earthH: 2, wallH: 5 }, rise: 10 },
      ]},
      { id: 'westminster-abbey', pos: [-800, -100], rotY: 1.57, phases: [
        { from: 1065, to: 1245, build: 'church', params: { wallStyle: 'plinthite', wall: '#cfc4ae',
          w: 16, d: 40, h: 16, apses: 1, domeStyle: 'tent', domeColor: '#8a8578',
          domes: [{ x: 0, z: -6, r: 2.4, drumH: 3 }] }, rise: 10 },
        { from: 1245, to: 9999, build: 'church', params: { wallStyle: 'baroque', wall: '#ddd2ba', accent: '#a89d84',
          w: 18, d: 46, h: 22, apses: 1, domeStyle: 'tent', domeColor: '#8a8578',
          domes: [{ x: 0, z: -8, r: 2.2, drumH: 2.5 }] }, rise: 30 },
      ]},
      { id: 'abbey-towers', pos: [-800, -128], rotY: 1.57, phases: [
        { from: 1745, to: 9999, build: 'bellTower', params: { tiers: 2, w: 10, h: 30, wall: '#ddd2ba', accent: '#a89d84', domeStyle: 'tent' }, rise: 6 },
      ]},

      // -- medieval City --
      // Old St Paul's: its spire was among the tallest things ever built
      { id: 'old-st-pauls', pos: [-80, -200], rotY: 1.57, phases: [
        { from: 1240, to: 1561, build: 'church', params: { wallStyle: 'plinthite', wall: '#c9bfa8',
          w: 24, d: 56, h: 20, apses: 1, domeStyle: 'tent', domeColor: '#6f6a5c',
          domes: [{ x: 0, z: 0, r: 4.5, drumH: 26 }] }, rise: 60 },
        { from: 1561, to: 1666.68, build: 'church', params: { wallStyle: 'plinthite', wall: '#c9bfa8',
          w: 24, d: 56, h: 20, apses: 1, domeStyle: 'flat', domeColor: '#6f6a5c',
          domes: [{ x: 0, z: 0, r: 4.5, drumH: 8 }] }, rise: 2, fall: 0.15, sinkDepth: 20 },
      ]},
      // Old London Bridge: a street of houses standing on nineteen arches
      { id: 'old-london-bridge', pos: [180, 56], rotY: Math.PI / 2, phases: [
        { from: 1209, to: 1760, build: 'housedBridge', params: { len: 235, w: 12, deckY: 10, seed: 27 }, rise: 30 },
        { from: 1760, to: 1831, build: 'housedBridge', params: { len: 235, w: 12, deckY: 10, houses: false }, rise: 2 },
        { from: 1831, to: 9999, build: 'bridge', params: { len: 240, w: 14, deckY: 10, color: 0x8a8272 }, rise: 3 },
      ]},

      // -- Shakespeare's Southwark --
      { id: 'globe', pos: [120, 155], phases: [
        { from: 1599, to: 1644, build: 'stadium', params: { r: 13 }, rise: 1, fall: 2 },
        { from: 1997, to: 9999, build: 'stadium', params: { r: 13 }, rise: 1.5 },
      ]},

      // -- Wren's London --
      { id: 'st-pauls', pos: [-80, -200], rotY: 1.57, phases: [
        { from: 1710, to: 9999, build: 'church', params: { wallStyle: 'baroque', wall: '#e8e0cc', accent: '#c2b89e',
          w: 34, d: 58, h: 22, apses: 1, domeStyle: 'flat', domeColor: '#5f6e66',
          domes: [{ x: 0, z: 2, r: 9, drumH: 14 }, { x: 0, z: -24, r: 2.2, drumH: 8 }, { x: -9, z: -24, r: 2.2, drumH: 8 }] }, rise: 35 },
      ]},
      { id: 'monument', pos: [230, -70], phases: [
        { from: 1677, to: 9999, build: 'column', params: { h: 20, figure: false }, rise: 4 },
      ]},

      // -- imperial capital --
      { id: 'parliament', pos: [-845, -15], rotY: 1.35, phases: [
        { from: 1852, to: 9999, build: 'classical', params: { w: 100, d: 26, floors: 3, wall: '#c9b586', frame: '#6f6045',
          trim: 0xb8a473, portico: false }, rise: 10 },
      ]},
      { id: 'big-ben', pos: [-795, 15], phases: [
        { from: 1859, to: 9999, build: 'bellTower', params: { tiers: 3, w: 10, h: 58, wall: '#c9b586', accent: '#6f6045', domeStyle: 'tent' }, rise: 4 },
      ]},
      { id: 'victoria-tower', pos: [-890, -30], phases: [
        { from: 1860, to: 9999, build: 'bellTower', params: { tiers: 2, w: 15, h: 60, wall: '#c9b586', accent: '#6f6045', domeStyle: 'flat' }, rise: 6 },
      ]},
      { id: 'tower-bridge', pos: [430, 78], rotY: Math.PI / 2, phases: [
        { from: 1894, to: 9999, build: 'towerBridge', params: { len: 235, w: 14, deckY: 12 }, rise: 6 },
      ]},
      { id: 'gasworks', pos: [760, -50], rotY: 0.15, phases: [
        { from: 1815, to: 1975, build: 'factory', params: { sheds: 2, stacks: 3, stackH: 34, furnace: false, seed: 31 }, rise: 8, fall: 4 },
      ]},

      // -- the modern skyline --
      { id: 'bt-tower', pos: [-460, -330], phases: [
        { from: 1965, to: 9999, build: 'glassTower', params: { w: 13, d: 13, h: 110, tint: '#8a9298' }, rise: 3 },
      ]},
      { id: 'tower-42', pos: [185, -225], phases: [
        { from: 1980, to: 9999, build: 'glassTower', params: { w: 20, d: 20, h: 92, tint: '#4a5a68' }, rise: 3 },
      ]},
      { id: 'one-canada-square', pos: [955, 55], phases: [
        { from: 1991, to: 9999, build: 'glassTower', params: { w: 26, d: 26, h: 120, tint: '#7a8894' }, rise: 3 },
      ]},
      { id: 'london-eye', pos: [-715, 45], rotY: 1.35, phases: [
        { from: 2000, to: 9999, build: 'ferrisWheel', params: { r: 46 }, rise: 2 },
      ]},
      { id: 'gherkin', pos: [245, -205], phases: [
        { from: 2004, to: 9999, build: 'glassTower', params: { w: 20, d: 20, h: 88, tint: '#5a7d62' }, rise: 2 },
      ]},
      { id: 'shard', pos: [200, 175], phases: [
        { from: 2012, to: 9999, build: 'glassTower', params: { w: 24, d: 24, h: 150, tint: '#9ab0bc' }, rise: 3 },
      ]},

      // ================= ROADS & SQUARES =================
      { id: 'road-watling', pos: [0, 0], phases: [
        { from: 60, to: 1935, build: 'road', params: { path: WATLING, w: 8, color: 0x8a8578 }, rise: 15 },
        { from: 1935, to: 9999, build: 'road', params: { path: WATLING, w: 12, color: 0x4f5257, sidewalk: true, line: true }, rise: 4 },
      ]},
      { id: 'road-strand', pos: [0, 0], phases: [
        { from: 890, to: 1600, build: 'road', params: { path: STRAND, w: 7, color: 0x84714f }, rise: 30 },
        { from: 1600, to: 1930, build: 'road', params: { path: STRAND, w: 11, color: 0x8d8578, sidewalk: true }, rise: 10 },
        { from: 1930, to: 9999, build: 'road', params: { path: STRAND, w: 12, color: 0x4f5257, sidewalk: true, line: true }, rise: 4 },
      ]},
      { id: 'road-borough', pos: [0, 0], phases: [
        { from: 60, to: 1930, build: 'road', params: { path: BOROUGH, w: 7, color: 0x8a8578 }, rise: 15 },
        { from: 1930, to: 9999, build: 'road', params: { path: BOROUGH, w: 11, color: 0x4f5257, sidewalk: true, line: true }, rise: 4 },
      ]},
      { id: 'road-bridge-link', pos: [0, 0], phases: [
        { from: 60, to: 9999, build: 'road', params: { path: BRIDGE_LINK, w: 7, color: 0x8a8578 }, rise: 15 },
      ]},
      { id: 'road-east', pos: [0, 0], phases: [
        { from: 1300, to: 1850, build: 'road', params: { path: EAST_RD, w: 7, color: 0x84714f }, rise: 30 },
        { from: 1850, to: 9999, build: 'road', params: { path: EAST_RD, w: 11, color: 0x4f5257, sidewalk: true, line: true }, rise: 8 },
      ]},
      // Bazalgette's Victoria Embankment reclaims the foreshore
      { id: 'road-embankment', pos: [0, 0], phases: [
        { from: 1870, to: 9999, build: 'road', params: { path: EMBANK_L, w: 12, color: 0x62655f, sidewalk: true }, rise: 5 },
      ]},
      { id: 'road-canary', pos: [0, 0], phases: [
        { from: 1990, to: 9999, build: 'road', params: { path: [[900, -75], [935, 10], [950, 55]], w: 11, color: 0x4f5257, line: true }, rise: 3 },
      ]},
      ...[
        [180, -170, 60, 10], [-80, -170, 890, 10], [400, -120, 1300, 10], [180, 170, 60, 9], [900, -75, 1990, 10],
      ].map(([jx, jz, jy, jr], i) => ({
        id: `junction-${i}`, pos: [jx, jz], phases: [
          { from: jy, to: 9999, build: 'plaza', params: { rx: jr, rz: jr, color: jy >= 1930 ? 0x4f5257 : 0x8a8578 }, rise: 6 },
        ],
      })),
      // ---- the street fabric: medieval tangle to Georgian order ----
      // the City's lanes: laid down medieval, rebuilt on the SAME lines
      // after the Fire (the merchants would not wait for Wren's plan)
      { id: 'grid-city', pos: [0, 0], phases: [
        { from: 950, to: 1670, build: 'streetGrid', params: { area: [70, -210, 295, 195], angle: 0.1, spacing: 54, seed: 701, w: 4.5, color: 0x84714f, wobble: 0.5 }, rise: 80 },
        { from: 1670, to: 1932, build: 'streetGrid', params: { area: [70, -210, 295, 195], angle: 0.1, spacing: 54, seed: 701, w: 5.5, color: 0x8d8578, wobble: 0.5 }, rise: 8 },
        { from: 1932, to: 9999, build: 'streetGrid', params: { area: [70, -210, 295, 195], angle: 0.1, spacing: 54, seed: 701, w: 5.5, color: 0x53565a, wobble: 0.5 }, rise: 5 },
      ]},
      { id: 'grid-westend', pos: [0, 0], phases: [
        { from: 1728, to: 1936, build: 'streetGrid', params: { area: [-450, -270, 215, 155], angle: -0.1, spacing: 62, seed: 702, w: 6, color: 0x8d8578 }, rise: 15 },
        { from: 1936, to: 9999, build: 'streetGrid', params: { area: [-450, -270, 215, 155], angle: -0.1, spacing: 62, seed: 702, w: 6, color: 0x53565a }, rise: 5 },
      ]},
      { id: 'grid-westminster', pos: [0, 0], phases: [
        { from: 1742, to: 1936, build: 'streetGrid', params: { area: [-770, -50, 160, 122], angle: -0.2, spacing: 58, seed: 703, w: 6, color: 0x8d8578 }, rise: 15 },
        { from: 1936, to: 9999, build: 'streetGrid', params: { area: [-770, -50, 160, 122], angle: -0.2, spacing: 58, seed: 703, w: 6, color: 0x53565a }, rise: 5 },
      ]},
      { id: 'grid-southwark', pos: [0, 0], phases: [
        { from: 1590, to: 1866, build: 'streetGrid', params: { area: [150, 210, 205, 145], angle: 0.05, spacing: 62, seed: 704, w: 5, color: 0x84714f, wobble: 0.35 }, rise: 40 },
        { from: 1866, to: 1936, build: 'streetGrid', params: { area: [150, 210, 205, 145], angle: 0.05, spacing: 62, seed: 704, w: 6, color: 0x8d8578, wobble: 0.35 }, rise: 10 },
        { from: 1936, to: 9999, build: 'streetGrid', params: { area: [150, 210, 205, 145], angle: 0.05, spacing: 62, seed: 704, w: 6, color: 0x53565a, wobble: 0.35 }, rise: 5 },
      ]},
      { id: 'grid-eastend', pos: [0, 0], phases: [
        { from: 1822, to: 1952, build: 'streetGrid', params: { area: [660, -150, 245, 160], angle: 0.12, spacing: 56, seed: 705, w: 6, color: 0x8d8578 }, rise: 12 },
        { from: 1952, to: 9999, build: 'streetGrid', params: { area: [660, -150, 245, 160], angle: 0.12, spacing: 56, seed: 705, w: 6, color: 0x53565a }, rise: 5 },
      ]},
      { id: 'grid-docklands', pos: [0, 0], phases: [
        { from: 1990, to: 9999, build: 'streetGrid', params: { area: [950, 60, 150, 122], angle: 0.0, spacing: 74, seed: 706, w: 7, color: 0x53565a }, rise: 5 },
      ]},
      // London invented gas street lighting (Pall Mall, 1807)
      { id: 'lamps-strand', pos: [0, 0], phases: [
        { from: 1807, to: 1955, build: 'lampline', params: { path: STRAND, style: 'gas', offset: 7, spacing: 34 }, rise: 3 },
        { from: 1955, to: 9999, build: 'lampline', params: { path: STRAND, style: 'modern', offset: 7.5, spacing: 44 }, rise: 3 },
      ]},
      { id: 'lamps-watling', pos: [0, 0], phases: [
        { from: 1820, to: 1955, build: 'lampline', params: { path: WATLING, style: 'gas', offset: 6.5, spacing: 38 }, rise: 3 },
        { from: 1955, to: 9999, build: 'lampline', params: { path: WATLING, style: 'modern', offset: 8, spacing: 46 }, rise: 3 },
      ]},
      { id: 'lamps-embankment', pos: [0, 0], phases: [
        { from: 1872, to: 9999, build: 'lampline', params: { path: EMBANK_L, style: 'gas', offset: 7, spacing: 40 }, rise: 3 },
      ]},

      // Wren's skyline of white steeples after the Fire
      // (handled as a district below; this is the anchor for the story)
    ],

    // ================= DISTRICTS =================
    districts: [
      // the City: Roman insulae -> timber town -> brick -> Victorian -> glass
      { id: 'city-core', area: [70, -210, 310, 210], seed: 121, gridAngle: 0.1, phases: [
        { from: 70, to: 420, style: { gen: 'townhouse', vary: { w: [9, 14], d: [8, 11], floors: [1, 2.4] },
          params: { wall: '#e0d4bc', roofColor: 0xa84832, shops: false } }, count: 44, rise: 40, fall: 40 },
        { from: 890, to: 1666.7, style: [
          { gen: 'hut', vary: { w: [4.5, 7], d: [4, 6] } },
          { gen: 'townhouse', vary: { w: [8, 13], d: [7, 10], floors: [2, 3.4] }, params: { wall: '#c9b190' } },
        ], count: 80, rise: 60, fall: 0.15 },
        { from: 1670, to: 1850, style: { gen: 'townhouse', vary: { w: [10, 15], d: [8, 12], floors: [3, 4.4] },
          params: { wall: '#a8785a' } }, count: 74, rise: 6 },
        { from: 1850, to: 1940.9, style: { gen: 'townhouse', vary: { w: [12, 18], d: [10, 14], floors: [4, 5.9] },
          params: { wall: '#b89878' } }, count: 40, rise: 14, fall: 0.6 },
        { from: 1850, to: 9999, style: { gen: 'townhouse', vary: { w: [12, 18], d: [10, 14], floors: [4, 5.9] },
          params: { wall: '#a89070' } }, count: 34, rise: 14 },
        { from: 1955, to: 9999, style: [
          { gen: 'stalinka', vary: { w: [24, 34], d: [14, 18], floors: [5, 8.5] }, params: { wall: '#b8b4a8' } },
          { gen: 'glassTower', vary: { w: [14, 20], d: [14, 20], h: [35, 70] } },
        ], count: 30, rise: 8 },
      ]},
      // Wren's steeples rising among the brick after the Fire
      { id: 'wren-steeples', area: [60, -200, 280, 180], seed: 131, phases: [
        { from: 1680, to: 9999, style: { gen: 'bellTower', vary: { h: [16, 26], w: [6, 8] },
          params: { tiers: 3, wall: '#ece6d6', accent: '#c2b89e', domeStyle: 'tent' } }, count: 13, rise: 15 },
      ]},
      // Lundenwic: the Saxon trading town outside the walls
      { id: 'lundenwic', area: [-350, -190, 170, 110], seed: 141, phases: [
        { from: 620, to: 880, style: { gen: 'hut', vary: { w: [4, 6.5], d: [3.5, 5] } }, count: 30, rise: 40 },
      ]},
      // Southwark: inns, theatres, and everything the City banned
      { id: 'southwark', area: [150, 210, 200, 140], seed: 151, gridAngle: 0.05, phases: [
        { from: 1150, to: 1680, style: { gen: 'hut', vary: { w: [4.5, 7], d: [4, 6] } }, count: 40, rise: 80 },
        { from: 1680, to: 1860, style: { gen: 'townhouse', vary: { w: [9, 14], d: [8, 11], floors: [2, 3.4] },
          params: { wall: '#b09070' } }, count: 44, rise: 30 },
        { from: 1860, to: 9999, style: { gen: 'townhouse', vary: { w: [11, 16], d: [9, 13], floors: [3, 4.9] },
          params: { wall: '#a08868' } }, count: 46, rise: 15 },
      ]},
      // Westminster: the royal village that became the seat of empire
      { id: 'westminster', area: [-760, -70, 170, 130], seed: 161, gridAngle: -0.2, phases: [
        { from: 1050, to: 1720, style: { gen: 'hut', vary: { w: [4.5, 7], d: [4, 6] } }, count: 26, rise: 80 },
        { from: 1720, to: 9999, style: { gen: 'townhouse', vary: { w: [11, 16], d: [9, 12], floors: [3, 4.4] },
          params: { wall: '#ddd4c2' } }, count: 40, rise: 20 },
      ]},
      // the Georgian West End
      { id: 'west-end', area: [-450, -270, 230, 170], seed: 171, gridAngle: -0.1, phases: [
        { from: 1725, to: 9999, style: { gen: 'townhouse', vary: { w: [11, 15], d: [9, 12], floors: [3, 4.9] },
          params: { wall: '#d4c9b2' } }, count: 54, rise: 25 },
      ]},
      // the East End: docks, terraces, the Blitz, the towers
      { id: 'east-end', area: [660, -160, 260, 170], seed: 181, gridAngle: 0.12, phases: [
        { from: 1815, to: 1940.8, style: { gen: 'townhouse', vary: { w: [9, 13], d: [8, 11], floors: [2, 3.9] },
          params: { wall: '#9a7a5e' } }, count: 56, rise: 15, fall: 0.5 },
        { from: 1955, to: 9999, style: [
          { gen: 'panelka', vary: { w: [20, 30], d: [11, 14], floors: [8, 16.9] }, params: { wall: '#b0aca0' } },
          { gen: 'townhouse', vary: { w: [9, 13], d: [8, 11], floors: [2, 3.4] }, params: { wall: '#9a7a5e' } },
        ], count: 44, rise: 10 },
      ]},
      // Docklands reborn in glass
      { id: 'canary-wharf', area: [950, 65, 160, 130], seed: 191, phases: [
        { from: 1991, to: 9999, style: { gen: 'glassTower', vary: { w: [16, 24], d: [16, 24], h: [50, 100] } }, count: 11, rise: 6 },
      ]},
    ],

    // ================= EFFECTS =================
    effects: {
      birdCenter: [100, 0, -100],
      birdRadius: 450,
      fires: [
        // Boudica burns Londinium, 60/61 AD
        { pos: [80, 12, -220], radius: 90, from: 60.8, to: 61.6, intensity: 1 },
        // the Great Fire, September 1666
        { pos: [150, 14, -140], radius: 90, from: 1666.67, to: 1666.75, intensity: 1 },
        { pos: [-40, 16, -200], radius: 70, from: 1666.68, to: 1666.75, intensity: 1 },
        { pos: [250, 12, -120], radius: 60, from: 1666.67, to: 1666.73, intensity: 0.8 },
        // the Blitz, 1940–41: the City and the East End
        { pos: [0, 16, -190], radius: 70, from: 1940.68, to: 1941.4, intensity: 0.9 },
        { pos: [680, 10, -140], radius: 80, from: 1940.68, to: 1941.4, intensity: 1 },
        { pos: [780, 8, -40], radius: 60, from: 1940.68, to: 1941.4, intensity: 0.8 },
        // gasworks smoke
        { pos: [745, 8, -60], radius: 30, from: 1816, to: 1972, intensity: 0.6, smokeOnly: true },
      ],
      boats: [
        { from: 50, to: 420, style: 'sail', path: riverPath, speed: 0.006 },
        { from: 890, to: 1870, style: 'sail', path: riverPath.map(([x, z]) => [x, z + 30]), speed: 0.005 },
        { from: 1550, to: 1930, style: 'sail', path: riverPath.map(([x, z]) => [x, z - 25]), speed: 0.006 },
        { from: 1850, to: 9999, style: 'barge', path: riverPath, speed: 0.008 },
      ],
      traffic: [
        { from: 100, to: 1900, path: WATLING, type: 'cart', count: 2, speed: 0.006, seed: 201 },
        { from: 950, to: 1910, path: STRAND, type: 'cart', count: 2, speed: 0.005, seed: 202 },
        { from: 1901, to: 1952, path: EAST_RD, type: 'tram', count: 1, speed: 0.01, color: 0xa03028, seed: 203 },
        // the red double-deckers
        { from: 1925, to: 9999, path: STRAND, type: 'doubledecker', count: 2, speed: 0.013, offset: 3, seed: 204 },
        { from: 1930, to: 9999, path: WATLING, type: 'doubledecker', count: 3, speed: 0.013, offset: 4, seed: 205 },
        { from: 1935, to: 9999, path: WATLING, type: 'car', count: 5, speed: 0.02, offset: -4, seed: 206 },
        { from: 1935, to: 9999, path: [...STRAND].reverse(), type: 'car', count: 4, speed: 0.018, offset: 3, seed: 207 },
        { from: 1930, to: 9999, path: EMBANK_L, type: 'car', count: 3, speed: 0.02, offset: 3, seed: 208 },
      ],
      crowds: [
        // groundlings at the Globe
        { from: 1599, to: 1642, area: [120, 190, 35, 30], count: 70,
          colors: ['#6a5a3a', '#8a3a2a', '#5a6a8a', '#4a4a52'], seed: 211 },
        // the South Bank crowds of the present
        { from: 2000, to: 9999, area: [-700, 95, 60, 40], count: 70,
          colors: ['#5a6a8a', '#8a5a3a', '#c8b498', '#3a3d40'], seed: 212 },
      ],
      groves: [
        { area: [-600, -500, 400, 300], count: 80, kind: 'oak', seed: 221 },
        { area: [-900, 300, 350, 300], count: 60, kind: 'oak', seed: 222 },
        { area: [500, 350, 400, 300], count: 60, kind: 'oak', seed: 223 },
        // the royal parks going green as the West End builds up
        { area: [-620, -320, 180, 140], count: 40, kind: 'chestnut', seed: 224, from: 1730 },
        { area: [-720, -95, 120, 60], count: 16, kind: 'oak', seed: 225 },
      ],
    },

    // ================= ERA STOPS =================
    stops: [
      {
        year: 47, major: true, title: 'Londinium', kicker: 'Roman foundation · c. 47–50 AD',
        caption: 'Where the river narrows enough for a bridge, an empire plants a town.',
        transitTitle: 'Rome reaches the Thames…',
        camera: { pos: [500, 110, 420], look: [180, 15, -80] },
        env: { skyTop: '#7fa8d0', skyBottom: '#e0d4b4', sunDir: [0.5, 0.5, -0.4], sunColor: '#fff0c8', sunIntensity: 2.2, ambient: 0.95, fogColor: '#ccd0c4', fogDensity: 0.0008, haze: 0.5 },
        story: `<p>Around <b>47–50 AD</b>, a few years after the Roman invasion, engineers found the lowest point where the Thames could be bridged — and <b>Londinium</b> was born at the north end of that bridge. No ancient tribe had a capital here; London is a Roman start-up, sited purely for logistics: a tidal river deep enough for sea-ships, narrow enough for a crossing.</p>
<p>The first town is a huddle of timber-and-clay buildings along two gravel hills, with the wooden bridge — ancestor of every London Bridge since — already carrying the road that will become Watling Street.</p>`,
        context: `Almost everything that matters about London is already in this picture: the bridge, the port, the road junction, and the two hills — Ludgate and Cornhill — that the City still stands on. The Roman street line under your feet is, in places, the modern street line.`,
      },
      {
        year: 61, title: 'Boudica Burns It', kicker: 'The revolt · 60–61 AD',
        caption: 'The queen of the Iceni leaves a layer of red ash.',
        transitTitle: 'Rebellion sweeps south…',
        camera: { pos: [-250, 130, 350], look: [100, 20, -200] },
        env: { skyTop: '#6a5548', skyBottom: '#c88a50', sunDir: [0.3, 0.3, -0.55], sunColor: '#ff9a50', sunIntensity: 1.6, ambient: 0.55, fogColor: '#a08268', fogDensity: 0.0013, haze: 0.75 },
        story: `<p>In 60–61 AD <b>Boudica</b>, queen of the Iceni, rose against Roman rule after unbearable provocation — her kingdom seized, her daughters assaulted. Her army destroyed Colchester, then fell on the young, undefended Londinium. Everyone who could not flee was killed; the town burned so hot that it left a <b>layer of fired red clay</b> that archaeologists still strike a few metres beneath the City's banks.</p>
<p>Rome crushed the revolt, and rebuilt. Within a generation Londinium was back — bigger, and this time it would be given walls.</p>`,
        context: `The burnt layer of 61 AD is London's first great destruction stratum — the city's history is literally legible in its soil: Boudica's ash, the Great Fire's ash of 1666, the Blitz rubble of 1941. A city that keeps burning, and keeps deciding to continue.`,
      },
      {
        year: 200, title: 'The Walled City', kicker: 'Roman peak · 2nd–3rd century',
        caption: 'A forum bigger than any north of the Alps.',
        transitTitle: 'Londinium in stone…',
        camera: { pos: [550, 130, -520], look: [150, 20, -220] },
        env: { skyTop: '#6fa5d8', skyBottom: '#e4d8b8', sunDir: [0.5, 0.55, -0.4], sunColor: '#fff2cc', sunIntensity: 2.3, ambient: 0.95, fogColor: '#d4d8cc', fogDensity: 0.0007, haze: 0.4 },
        story: `<p>Londinium at its Roman height: capital of Britannia, perhaps 30,000 people. Its <b>forum-basilica</b> on Cornhill — the town hall and law courts — was the <b>largest basilica north of the Alps</b>, longer than today's St Paul's. An amphitheatre roared where Guildhall now stands, and around the year 200 the city was girdled with the <b>London Wall</b>: three kilometres of Kentish ragstone that would define the City's shape for 1,500 years.</p>
<p>Ships from Gaul and the Mediterranean tie up at timber quays; the bridge hums with carts on Watling Street.</p>`,
        context: `The wall you see is the ancestor of the "Square Mile" — the City of London's boundaries today still roughly trace it, and its gates live on as place-names: Ludgate, Aldgate, Bishopsgate, Moorgate. When Rome's legions left around 410, the town emptied — but the walls stood, waiting.`,
      },
      {
        year: 886, title: 'Alfred Reclaims the Walls', kicker: 'Saxon London · 7th–9th century',
        caption: 'Two Londons: the ghost in the walls, the market on the Strand.',
        transitTitle: 'Centuries of quiet, then the longships…',
        camera: { pos: [-500, 120, 300], look: [-150, 20, -150] },
        env: { skyTop: '#7aa8c8', skyBottom: '#dcd4b8', sunDir: [0.45, 0.45, -0.45], sunColor: '#f8ecc8', sunIntensity: 2.0, ambient: 0.9, fogColor: '#ccd0c4', fogDensity: 0.00085, haze: 0.55 },
        story: `<p>After Rome withdrew, the walled city stood <b>almost empty for four hundred years</b> — a stone ghost the Saxons avoided, perhaps out of awe. Their London was <b>Lundenwic</b>, "London market": a beach-trading town of huts strung along today's Strand, just west of the walls — the district's name literally means "shore".</p>
<p>Then came the Vikings, who found an undefended market irresistible. In <b>886</b> King <b>Alfred the Great</b> moved London back <i>inside</i> the Roman walls, refounding it as the fortified burh of <b>Lundenburg</b>. The old market site was abandoned — remembered only as <i>Ald-wych</i>, "the old settlement", still on the map today.</p>`,
        context: `London's location was so right that it was founded twice — once by Rome for its bridge, once by Alfred for its walls. From 886 the City has been continuously inhabited, self-governing and bloody-minded about it: the Crown has been negotiating with London ever since.`,
      },
      {
        year: 1100, title: 'The Conqueror’s Keep', kicker: 'Norman London · 1066–1100',
        caption: 'A white tower to awe a conquered city.',
        transitTitle: 'The Normans arrive…',
        camera: { pos: [650, 100, -350], look: [390, 25, -95] },
        env: { skyTop: '#6fa5d4', skyBottom: '#e0d8bc', sunDir: [0.5, 0.55, -0.4], sunColor: '#fff2cc', sunIntensity: 2.3, ambient: 0.95, fogColor: '#d0d4c8', fogDensity: 0.00075, haze: 0.45 },
        story: `<p>William the Conqueror took London's submission in 1066 — and immediately began building the <b>White Tower</b> in the wall's southeast corner, a Norman keep of Caen stone deliberately vast beyond anything English eyes had seen. It was fortress, palace and statement in one: <i>the Crown is watching the City</i>.</p>
<p>Upstream at Westminster, Edward the Confessor's great abbey church — consecrated days before his death in <b>1065</b> — had just crowned William on Christmas Day 1066. The twin poles of English history are now set: <b>Westminster rules, the City trades</b>, and the road between them — the Strand — becomes the most important street in the kingdom.</p>`,
        context: `Every English monarch since 1066 has been crowned at Westminster Abbey. And the Tower has been arsenal, mint, prison, menagerie and stage for the Crown's darkest business for nine centuries — the ravens are said to guarantee the kingdom's survival, an insurance policy still employed.`,
      },
      {
        year: 1300, title: 'The Bridge With Houses On It', kicker: 'Medieval peak · c. 1300',
        caption: 'A street of shops standing in the middle of a river.',
        transitTitle: 'The city fills its walls…',
        camera: { pos: [450, 90, 380], look: [180, 15, 40] },
        env: { skyTop: '#6aa5d4', skyBottom: '#e4d8b4', sunDir: [0.4, 0.55, -0.45], sunColor: '#fff2cc', sunIntensity: 2.3, ambient: 0.95, fogColor: '#d4d8cc', fogDensity: 0.00075, haze: 0.45 },
        story: `<p>Medieval London brims against its Roman walls: perhaps <b>80,000 people</b>, over a hundred parish churches, and two wonders. <b>Old London Bridge</b> (finished 1209) carries an entire street of houses and shops on nineteen stone arches — with a chapel in the middle and, in grim centuries, traitors' heads on the southern gate. Its narrow arches dam the river so fiercely that "shooting the bridge" by boat could be lethal.</p>
<p>Above the rooftops soars <b>Old St Paul's</b>, its spire — completed with the cathedral around 1314 — one of the tallest structures medieval Europe ever raised.</p>`,
        context: `Then, in 1348, the Black Death arrived by ship and killed perhaps <b>half the city</b> within two years. London refilled from the countryside within a couple of generations — a pattern (catastrophe, then renewal by newcomers) that is arguably the city's core mechanism, medieval and modern alike.`,
      },
      {
        year: 1599, title: 'Shakespeare’s Bankside', kicker: 'Elizabethan London · 1599',
        caption: 'All the world’s a stage — just outside the City’s jurisdiction.',
        transitTitle: 'Players cross the river…',
        camera: { pos: [-150, 90, 450], look: [130, 20, 150] },
        env: { skyTop: '#7fa8cc', skyBottom: '#e0d4b4', sunDir: [0.45, 0.5, -0.4], sunColor: '#ffeec4', sunIntensity: 2.2, ambient: 0.95, fogColor: '#ccd0c8', fogDensity: 0.0008, haze: 0.5 },
        story: `<p>The City's stern fathers banned playhouses within their walls — so the theatres went to <b>Southwark</b>, the unruly south bank of bear-pits, taverns and everything else forbidden. In <b>1599</b> the Lord Chamberlain's Men raised the <b>Globe</b> here, and a glover's son from Stratford premiered <i>Hamlet</i>, <i>Lear</i> and <i>Macbeth</i> under its thatch to two thousand groundlings at a penny a head.</p>
<p>London has burst its walls: Tudor timber suburbs sprawl along every road, and the bridge — still the only one — is jammed day and night.</p>`,
        context: `The Globe burned in 1613 (a stage cannon during <i>Henry VIII</i>), was rebuilt at once, and was closed by the Puritans in 1642. The faithful reconstruction that opened in 1997 stands a street away from the original site — the only thatched roof permitted in London since 1666. Why since 1666? Scroll forward.`,
      },
      {
        year: 1666.7, major: true, title: 'The Great Fire', kicker: '2–6 September 1666',
        caption: 'Four days. Four-fifths of the City.',
        transitTitle: 'A spark in a bakery on Pudding Lane…',
        camera: { pos: [-200, 140, 420], look: [100, 25, -150] },
        env: { skyTop: '#5a4438', skyBottom: '#c8783c', sunDir: [0.3, 0.28, -0.55], sunColor: '#ff8c40', sunIntensity: 1.6, ambient: 0.5, fogColor: '#96704c', fogDensity: 0.0016, haze: 0.85 },
        story: `<p>In the small hours of <b>2 September 1666</b>, a fire in Thomas Farriner's bakery on Pudding Lane met a dry east wind and a city built of timber and pitch. It burned for four days and consumed almost everything inside the walls: <b>13,200 houses, 87 churches, and Old St Paul's itself</b> — whose stones exploded and whose roof-lead ran down Ludgate Hill like water.</p>
<p>The year before, the Great Plague had killed some 70,000 Londoners. Now the survivors stood on the fields north of the wall and watched the medieval city end.</p>`,
        context: `The official death toll was recorded in single digits — almost certainly an undercount, though the evacuation genuinely worked. What the Fire destroyed in buildings it repaid in reinvention: brick instead of timber, insurance instead of prayer, and a blank page a mile wide for the man about to appear in the next stop.`,
      },
      {
        year: 1710, title: 'Wren’s New Jerusalem', kicker: 'The rebuilding · 1666–1710',
        caption: 'A dome where the gothic spire fell, and a flock of white steeples.',
        transitTitle: 'Brick by brick, steeple by steeple…',
        camera: { pos: [-450, 130, 300], look: [-80, 40, -180] },
        env: { skyTop: '#5f9fd8', skyBottom: '#ecdfc0', sunDir: [0.45, 0.6, -0.4], sunColor: '#fff6d8', sunIntensity: 2.5, ambient: 1.0, fogColor: '#dcdccc', fogDensity: 0.00065, haze: 0.35 },
        story: `<p>Sir <b>Christopher Wren</b> — astronomer turned architect — gave the burned City a new silhouette: <b>51 rebuilt parish churches</b>, each with a differently-invented white steeple, gathered around his masterpiece. The new <b>St Paul's Cathedral</b> (1675–1710) raised the first great classical dome in England, 111 metres of Portland stone where the gothic spire had stood.</p>
<p>By the bridge, his <b>Monument</b> to the Fire stands exactly 202 feet tall — the distance from its base to the bakery where the fire began. The rebuilt City is brick, wider-streeted, and insured.</p>`,
        context: `Wren wanted to redraw the street plan entirely — grand boulevards, plazas. The City's merchants refused to wait, and rebuilt on the medieval lines within a decade; that's why the Square Mile still has Saxon alleys under glass towers. Property beat planning: the most London sentence ever written.`,
      },
      {
        year: 1863, title: 'The World’s City', kicker: 'Imperial capital · mid-19th century',
        caption: 'Trains under the streets — a world first — and an empire’s parliament rising.',
        transitTitle: 'Steam, brick, fog…',
        camera: { pos: [-1050, 130, 300], look: [-800, 30, -30] },
        env: { skyTop: '#8a94a0', skyBottom: '#c4b494', sunDir: [0.35, 0.4, -0.4], sunColor: '#e8d4a8', sunIntensity: 1.8, ambient: 0.8, fogColor: '#b0a488', fogDensity: 0.0012, haze: 0.7 },
        story: `<p>London is now the <b>largest city humanity has ever built</b> — three million people and climbing, capital of a quarter of the world. After the old palace burned in 1834, the <b>Houses of Parliament</b> rise along the river in golden gothic; the clock tower's great bell, <b>Big Ben</b>, first struck in 1859.</p>
<p>And beneath the streets, something unprecedented: on <b>10 January 1863</b> the Metropolitan Railway carried thirty thousand passengers in gas-lit carriages behind steam engines — <b>the world's first underground railway</b>. Above ground, Bazalgette is embanking the Thames and burying the sewers that will end the cholera; gas lamps — a London invention of 1807 — line every street.</p>`,
        context: `Victorian London invented the infrastructure of the modern metropolis — underground transit, sewers, embankments, commuter suburbs — mostly in response to its own filth: the "Great Stink" of 1858 forced Parliament to act by making its own windows unbearable. Progress by nuisance: another durable London method.`,
      },
      {
        year: 1894, title: 'The Empire’s Front Door', kicker: 'Zenith · 1894',
        caption: 'A drawbridge dressed as a castle, for the busiest port on Earth.',
        transitTitle: 'The port roars…',
        camera: { pos: [700, 120, 400], look: [430, 25, 60] },
        env: { skyTop: '#8a9caa', skyBottom: '#ccb894', sunDir: [0.4, 0.45, -0.4], sunColor: '#ecd8ac', sunIntensity: 1.9, ambient: 0.85, fogColor: '#b4a88c', fogDensity: 0.0011, haze: 0.65 },
        story: `<p><b>Tower Bridge</b>, completed in <b>1894</b>, is Victorian engineering in fancy dress: a steel bascule drawbridge clothed in gothic stone so as not to embarrass the ancient Tower beside it. Its roadway lifts a thousand times a year for the tall ships of the <b>Pool of London</b> — the stretch of river behind you, then the busiest port in the world.</p>
<p>Downstream, the docks stretch for miles — tobacco, tea, wool, ivory — worked by the East End terraces pressed around them. Six million people; the map of the Underground is already sprawling; a quarter of the planet's trade passes this river.</p>`,
        context: `This is the London of Sherlock Holmes and the pea-soup fog — the fog being coal smoke, the price of all that steam. The city at its imperial zenith had a generation left at the top: by 1925 New York would pass it, and the docks' own story had fifty years to run.`,
      },
      {
        year: 1940.9, major: true, title: 'The Blitz', kicker: '7 September 1940 – May 1941',
        caption: 'St Paul’s stands in a sea of fire.',
        transitTitle: 'The sirens begin…',
        camera: { pos: [-350, 160, 380], look: [-70, 40, -190] },
        env: { skyTop: '#2e3138', skyBottom: '#7a5a44', sunDir: [0.25, 0.2, -0.5], sunColor: '#e08850', sunIntensity: 1.0, ambient: 0.45, fogColor: '#5f584c', fogDensity: 0.0016, haze: 0.85 },
        story: `<p>For <b>57 consecutive nights</b> from 7 September 1940, and on through May 1941, the Luftwaffe bombed London. The docks and the East End burned first and worst; on the night of <b>29 December 1940</b> — the "Second Great Fire of London" — incendiaries set the whole City alight, and a photographer on the Daily Mail's roof caught <b>St Paul's dome riding above the smoke</b>: the war's most famous image of defiance.</p>
<p>Some <b>20,000 Londoners were killed</b>, a million homes wrecked; families slept in their thousands on Underground platforms. Churchill's orders for the cathedral that night were simple: <i>St Paul's must be saved at all costs.</i> It was — the fires reached the churchyard and stopped.</p>`,
        context: `The V-1s and V-2s of 1944–45 added a final, futuristic terror. The Blitz flattened more of the City than the Great Fire had — and once again the catastrophe redrew the map: the bomb-sites became the Barbican, the tower estates, and eventually the glass City. London's rebuilders have always been its bombers' unintended partners.`,
      },
      {
        year: 1965, title: 'Austerity to Swinging', kicker: 'Postwar London · 1950s–60s',
        caption: 'Concrete towers on the bomb-sites; the last fog lifts.',
        transitTitle: 'Rebuilding, rationing, rock and roll…',
        camera: { pos: [900, 140, -450], look: [600, 30, -130] },
        env: { skyTop: '#7aa0c0', skyBottom: '#d8d0b8', sunDir: [0.45, 0.5, -0.4], sunColor: '#f4e8c4', sunIntensity: 2.1, ambient: 0.95, fogColor: '#c8ccc0', fogDensity: 0.0008, haze: 0.45 },
        story: `<p>The bomb-sites sprouted <b>council tower blocks</b> — the East End rebuilt vertically — while the <b>Great Smog of December 1952</b>, which killed thousands in five days, finally forced the Clean Air Act: the coal fog that had defined London for a century simply ended. The last tram ran in 1952; the red <b>double-decker</b> became the city's moving emblem.</p>
<p>By the mid-sixties the grey city had gone unexpectedly vivid: Carnaby Street, the Beatles at Abbey Road, the <b>Post Office Tower</b> (1965) rising like an exclamation mark over Fitzrovia — the tallest building in Britain, with a revolving restaurant.</p>`,
        context: `Meanwhile the port that built the city was quietly dying — container ships needed deep water and acres of quay, and by 1981 every central dock had closed, leaving eight square miles of dereliction downstream. Which is exactly where the next London would be built.`,
      },
      {
        year: 2012, major: true, title: 'The Glass Skyline', kicker: 'Millennium London · 1991–2012',
        caption: 'The docks reborn as a second Manhattan; a shard above the bridge.',
        transitTitle: 'Cranes over the river again…',
        camera: { pos: [-150, 150, 500], look: [250, 60, -50] },
        env: { skyTop: '#6fa0cc', skyBottom: '#dcd8c4', sunDir: [0.5, 0.55, -0.4], sunColor: '#fff2cc', sunIntensity: 2.3, ambient: 1.0, fogColor: '#ccd4d0', fogDensity: 0.0007, haze: 0.4 },
        story: `<p>The dead docks became <b>Canary Wharf</b>: One Canada Square (1991) planted a Manhattan skyline on the Isle of Dogs, and the banks followed. The old City answered with towers of its own — the <b>Gherkin</b> (2004) among the steeples — while the <b>London Eye</b> (2000) set a slow-turning wheel opposite Parliament, and <b>the Shard</b> (2012) rose 310 metres over Southwark, Western Europe's tallest building, straight above the borough where the Globe once stood.</p>
<p>In the summer of 2012 the Olympics opened in the East End — the same streets the Blitz had burned — and the city, nine million strong again, threw itself a party.</p>`,
        context: `Note what the skyline says: the medieval City and the upstart docks, rivals eight centuries apart, now mirror each other in glass down the same river. London's genius has never been planning; it is absorption — of money, people, catastrophe and reinvention, on repeat since 47 AD.`,
      },
      {
        year: 2026, title: 'London, Continuing', kicker: 'The present day',
        caption: 'Two thousand years, one bridge-crossing.',
        transitTitle: 'Toward today…',
        camera: { pos: [750, 170, 550], look: [-100, 40, -100] },
        env: { skyTop: '#5f9fd8', skyBottom: '#ecdfc0', sunDir: [0.55, 0.55, -0.4], sunColor: '#fff6d8', sunIntensity: 2.4, ambient: 1.05, fogColor: '#d8dcd4', fogDensity: 0.0006, haze: 0.3 },
        story: `<p>Look around: the Roman bridge-crossing still fixes the map. The wall's line still bounds the Square Mile. Wren's dome still holds the skyline by law — protected viewing corridors bend the towers around it. The Abbey still crowns kings; the Tower still keeps its ravens; the double-deckers still run down the Strand, over the spot where Saxons beached their boats.</p>
<p>A city that has burned to the ground twice, been bombed for months, buried its river's port and grown a new one — and at every turn simply resumed. Twenty centuries in, London remains what it was on day one: the place where the road crosses the river.</p>`,
        context: `<b>Extend this world:</b> London is the third city on this engine — one config file, like Kyiv's and Dnipro's. See the README to add the fourth.`,
      },
    ],
  };
}
