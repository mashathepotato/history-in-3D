// Procedural building generators.
// Every generator returns a THREE.Group whose origin sits at ground level (y=0).
// Generators are city-agnostic: a city config picks a generator + params per structure phase.
import * as THREE from 'three';

// ---------- shared material / texture caches ----------
const matCache = new Map();
const texCache = new Map();

export function mat(color, opts = {}) {
  const key = `${color}|${opts.flat !== false}|${opts.metal || 0}|${opts.rough ?? 0.9}|${opts.emissive || 0}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({
      color,
      flatShading: opts.flat !== false,
      metalness: opts.metal || 0,
      roughness: opts.rough ?? 0.9,
      emissive: opts.emissive ? new THREE.Color(color).multiplyScalar(opts.emissive) : 0x000000,
    }));
  }
  return matCache.get(key);
}

const GOLD = () => mat(0xd8a520, { metal: 0.85, rough: 0.35, flat: false, emissive: 0.12 });
const SILVER = () => mat(0xc8ccd4, { metal: 0.9, rough: 0.3, flat: false });

// Facade textures drawn on canvas: cheap detail (windows, stripes, arches).
function facadeTexture(style, base, accent) {
  const key = `${style}|${base}|${accent}`;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  g.fillStyle = accent;
  if (style === 'plinthite') {
    // opus mixtum: thin brick bands in mortar
    for (let y = 8; y < 256; y += 26) g.fillRect(0, y, 256, 7);
  } else if (style === 'windows') {
    for (let y = 20; y < 236; y += 56)
      for (let x = 16; x < 240; x += 44) g.fillRect(x, y, 20, 34);
  } else if (style === 'arches') {
    for (let x = 14; x < 240; x += 62) {
      g.beginPath();
      g.moveTo(x, 220); g.lineTo(x, 110);
      g.arc(x + 19, 110, 19, Math.PI, 0);
      g.lineTo(x + 38, 220); g.closePath(); g.fill();
    }
  } else if (style === 'panelka') {
    for (let y = 6; y < 250; y += 24)
      for (let x = 6; x < 250; x += 26) g.fillRect(x, y, 14, 12);
  } else if (style === 'glass') {
    for (let y = 0; y < 256; y += 18) { g.fillRect(0, y, 256, 2); }
    for (let x = 0; x < 256; x += 32) { g.fillRect(x, 0, 2, 256); }
  } else if (style === 'logs') {
    for (let y = 0; y < 256; y += 22) { g.fillRect(0, y, 256, 3); }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

export function facadeMat(style, base, accent, repeat = [1, 1]) {
  const key = `fm|${style}|${base}|${accent}|${repeat}`;
  if (!matCache.has(key)) {
    const t = facadeTexture(style, base, accent).clone();
    t.needsUpdate = true;
    t.repeat.set(repeat[0], repeat[1]);
    matCache.set(key, new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
  }
  return matCache.get(key);
}

// deterministic rng so cities look identical every load
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function cyl(rTop, rBot, h, material, x = 0, y = 0, z = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// ---------- domes ----------
// Profiles as lathe curves; style drives the silhouette of a cupola.
function domeGeo(style, r) {
  const pts = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    let x, y;
    if (style === 'helmet') {          // early Byzantine/Rus: shallow pointed hemisphere
      x = r * Math.cos(t * Math.PI * 0.5) * (1 - 0.06 * t);
      y = r * Math.sin(t * Math.PI * 0.5) * 1.15;
    } else if (style === 'pear') {     // Ukrainian baroque
      const bulge = Math.sin(t * Math.PI) * 0.32;
      x = r * (Math.cos(t * Math.PI * 0.5) + bulge) * (1 - t * 0.25);
      y = r * t * 2.1;
    } else if (style === 'onion') {
      const bulge = Math.sin(t * Math.PI) * 0.42;
      x = r * (Math.cos(t * Math.PI * 0.55) + bulge) * (1 - t * 0.3);
      y = r * t * 1.9;
    } else if (style === 'tent') {     // wooden shatro
      x = r * (1 - t);
      y = r * t * 2.6;
    } else {                            // 'flat' classical dome
      x = r * Math.cos(t * Math.PI * 0.5);
      y = r * Math.sin(t * Math.PI * 0.5) * 0.8;
    }
    pts.push(new THREE.Vector2(Math.max(x, 0.001), y));
  }
  return new THREE.LatheGeometry(pts, 16);
}

function cross(size, material) {
  const g = new THREE.Group();
  g.add(box(size * 0.12, size, size * 0.12, material));
  g.add(box(size * 0.6, size * 0.12, size * 0.12, material, 0, size * 0.62));
  return g;
}

// drum + cupola + cross — the basic unit of an East Slavic church
export function cupola(r, drumH, style, domeColor, drumMaterial, withCross = true) {
  const g = new THREE.Group();
  const domeMat = domeColor === 'gold' ? GOLD()
    : mat(domeColor, { flat: false, rough: 0.55, metal: 0.25 });
  const drum = cyl(r, r, drumH, drumMaterial, 0, 0, 0, 14);
  g.add(drum);
  const dome = new THREE.Mesh(domeGeo(style, r * 1.06), domeMat);
  dome.position.y = drumH;
  dome.castShadow = true;
  g.add(dome);
  if (withCross) {
    const cr = cross(r * 0.9, GOLD());
    cr.position.y = drumH + r * (style === 'pear' ? 2.2 : style === 'onion' ? 2.0 : 1.25);
    g.add(cr);
  }
  g.userData.topY = drumH + r * 2.4;
  return g;
}

// ---------- generators ----------
export const generators = {

  // Semi-dugout of the earliest settlements: earth mound walls, thatched roof.
  dugout(p = {}) {
    const g = new THREE.Group();
    const s = p.size || 3.4;
    const wall = mat(0x6b5b3f);
    g.add(box(s, 1.0, s, wall));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(s * 0.85, s * 0.6, 4), mat(0x8a7648));
    roof.position.y = 1.0 + s * 0.3;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    g.add(roof);
    return g;
  },

  // Log hut with gable roof — the standard dwelling for a millennium.
  hut(p = {}) {
    const g = new THREE.Group();
    const w = p.w || 5, d = p.d || 4, h = p.h || 2.6;
    const logMat = facadeMat('logs', p.wall || '#7a5c38', '#4c3a24', [1, 1]);
    g.add(box(w, h, d, logMat));
    const roofH = p.roofH || h * 0.75;
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.02, d * 0.78, roofH, 4, 1), mat(p.roof || 0xa08a55));
    roof.scale.x = w / d;
    roof.rotation.y = Math.PI / 4;
    roof.position.y = h + roofH / 2;
    roof.castShadow = true;
    g.add(roof);
    return g;
  },

  // Brick/stone townhouse, 19th-century street fabric.
  townhouse(p = {}) {
    const g = new THREE.Group();
    const w = p.w || 12, d = p.d || 10, floors = p.floors || 3;
    const h = floors * 3.4;
    const f = facadeMat('windows', p.wall || '#c9b190', '#3a3a45', [Math.max(1, Math.round(w / 8)), floors * 0.55]);
    g.add(box(w, h, d, f));
    g.add(box(w * 1.04, 0.5, d * 1.04, mat(0x8a7a60), 0, h));
    const roof = box(w, 1.6, d, mat(p.roofColor || 0x5f6b52), 0, h + 0.5);
    roof.scale.set(0.94, 1, 0.94);
    g.add(roof);
    return g;
  },

  // Stalinist ceremonial block (postwar Khreshchatyk).
  stalinka(p = {}) {
    const g = new THREE.Group();
    const w = p.w || 30, d = p.d || 16, floors = p.floors || 7;
    const h = floors * 3.6;
    const f = facadeMat('windows', p.wall || '#d8c8a8', '#33343f', [Math.round(w / 7), floors * 0.6]);
    g.add(box(w, h, d, f));
    g.add(box(w * 1.05, 1, d * 1.05, mat(0xcbbc9c), 0, h));      // cornice
    g.add(box(w * 0.5, 3.6, d * 0.7, facadeMat('arches', '#d8c8a8', '#8a7f68', [3, 1]), 0, h + 1)); // attic tier
    return g;
  },

  // Prefab concrete slab housing.
  panelka(p = {}) {
    const g = new THREE.Group();
    const w = p.w || 26, d = p.d || 12, floors = p.floors || 9;
    const h = floors * 2.9;
    const f = facadeMat('panelka', p.wall || '#b9b4ac', '#454d58', [Math.round(w / 9), floors * 0.45]);
    g.add(box(w, h, d, f));
    return g;
  },

  glassTower(p = {}) {
    const g = new THREE.Group();
    const w = p.w || 18, d = p.d || 18, h = p.h || 80;
    const f = facadeMat('glass', p.tint || '#4a6f8a', '#1d2b38', [2, h / 18]);
    f.metalness = 0.4; f.roughness = 0.25;
    g.add(box(w, h, d, f));
    g.add(box(w * 0.3, 4, d * 0.3, mat(0x333a44), 0, h));
    return g;
  },

  // Wooden palisade ring/wall with sharpened stakes, on a path of [x,z] points.
  palisade(p = {}) {
    const g = new THREE.Group();
    const path = p.path || [];
    const hMat = mat(0x6d5433);
    const stake = new THREE.CylinderGeometry(0.35, 0.45, p.h || 4.5, 5);
    const cone = new THREE.ConeGeometry(0.38, 0.9, 5);
    const count = [];
    for (let i = 0; i < path.length - 1; i++) {
      const [x1, z1] = path[i], [x2, z2] = path[i + 1];
      const len = Math.hypot(x2 - x1, z2 - z1);
      const n = Math.max(1, Math.round(len / 0.8));
      for (let j = 0; j < n; j++) count.push([x1 + (x2 - x1) * j / n, z1 + (z2 - z1) * j / n]);
    }
    const inst = new THREE.InstancedMesh(stake, hMat, count.length);
    const tip = new THREE.InstancedMesh(cone, hMat, count.length);
    const m4 = new THREE.Matrix4();
    count.forEach(([x, z], i) => {
      m4.setPosition(x, (p.h || 4.5) / 2, z); inst.setMatrixAt(i, m4);
      m4.setPosition(x, (p.h || 4.5) + 0.4, z); tip.setMatrixAt(i, m4);
    });
    inst.castShadow = tip.castShadow = true;
    g.add(inst, tip);
    return g;
  },

  // Earthen rampart topped with wooden wall — the defenses of medieval Rus.
  rampart(p = {}) {
    const g = new THREE.Group();
    const path = p.path || [];
    const earthH = p.earthH || 10, wallH = p.wallH || 5;
    for (let i = 0; i < path.length - 1; i++) {
      const [x1, z1] = path[i], [x2, z2] = path[i + 1];
      const len = Math.hypot(x2 - x1, z2 - z1);
      const ang = Math.atan2(x2 - x1, z2 - z1);
      const seg = new THREE.Group();
      const earth = new THREE.Mesh(new THREE.CylinderGeometry(0.01, earthH * 0.9, earthH, 4, 1), mat(0x5d6b3c));
      earth.scale.z = len / (earthH * 0.9) / 2 * 2.2;
      earth.rotation.y = Math.PI / 4;
      // simpler: use a box profile
      seg.add(box(earthH * 1.6, earthH, len, mat(0x5d6b3c)));
      seg.add(box(2.2, wallH, len, facadeMat('logs', '#6d5433', '#48371f', [1, 1]), 0, earthH));
      seg.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
      seg.rotation.y = ang;
      seg.children.forEach(c => { c.castShadow = c.receiveShadow = true; });
      g.add(seg);
      // corner tower at each joint
      if (p.towers !== false) {
        const t = new THREE.Group();
        t.add(cyl(3, 3.4, wallH + 4, facadeMat('logs', '#6d5433', '#48371f', [2, 2]), 0, earthH, 0, 8));
        const roof = new THREE.Mesh(new THREE.ConeGeometry(4, 4, 8), mat(0x4c3a24));
        roof.position.y = earthH + wallH + 6;
        roof.castShadow = true;
        t.add(roof);
        t.position.set(x1, 0, z1);
        g.add(t);
      }
    }
    return g;
  },

  // Wooden pagan idol (Perun on the hill before 988).
  idol(p = {}) {
    const g = new THREE.Group();
    const wood = mat(0x5c4326);
    g.add(cyl(0.7, 0.9, p.h || 6, wood, 0, 0, 0, 8));
    const head = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.8, 1.6, 8), mat(0x8a8d94, { metal: 0.6, rough: 0.4 }));
    head.position.y = (p.h || 6) + 0.8;
    head.castShadow = true;
    g.add(head);
    // ring of small fires handled by effects; add stone ring
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      g.add(box(0.8, 0.6, 0.8, mat(0x777777), Math.cos(a) * 3.4, 0, Math.sin(a) * 3.4));
    }
    return g;
  },

  // Cross-domed masonry church of Kyivan Rus / its later baroque re-dressing.
  // params: w,d,h; domes: array of {x,z,r,drumH} (relative, in units of w/d halves)
  // domeStyle, domeColor ('gold'|hex), wallStyle ('plinthite'|'baroque'), apses count
  church(p = {}) {
    const g = new THREE.Group();
    const w = p.w || 24, d = p.d || 30, h = p.h || 14;
    const wallMaterial = p.wallStyle === 'plinthite'
      ? facadeMat('plinthite', p.wall || '#c9b8a4', '#a45a48', [Math.max(1, w / 10), Math.max(1, h / 10)])
      : facadeMat('arches', p.wall || '#f2ede0', p.accent || '#cfc7b2', [Math.max(1, Math.round(w / 9)), 1]);
    // main body
    g.add(box(w, h, d, wallMaterial));
    // side galleries (Sophia's stepped massing)
    if (p.galleries) {
      g.add(box(w * 1.45, h * 0.55, d * 1.08, wallMaterial));
      g.add(box(w * 1.2, h * 0.78, d * 1.04, wallMaterial));
    }
    // apses on +z end
    const apses = p.apses ?? 3;
    for (let i = 0; i < apses; i++) {
      const off = (i - (apses - 1) / 2) * (w / Math.max(apses, 1)) * 0.8;
      const r = w / (apses * 2.4);
      const ap = cyl(r, r, h * 0.7, wallMaterial, off, 0, d / 2, 10);
      g.add(ap);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), wallMaterial);
      cap.position.set(off, h * 0.7, d / 2);
      cap.castShadow = true;
      g.add(cap);
    }
    // domes
    const domes = p.domes || [{ x: 0, z: 0, r: w * 0.16, drumH: h * 0.5 }];
    const drumMaterial = wallMaterial;
    for (const dm of domes) {
      const c = cupola(dm.r, dm.drumH || h * 0.4, p.domeStyle || 'helmet', p.domeColor || 'gold', drumMaterial);
      c.position.set(dm.x, h, dm.z);
      g.add(c);
    }
    return g;
  },

  // Fortified gate: passage through the rampart, church above (the Golden Gate).
  gate(p = {}) {
    const g = new THREE.Group();
    const wallMaterial = p.wallStyle === 'plinthite'
      ? facadeMat('plinthite', '#c9b8a4', '#a45a48', [2, 2])
      : facadeMat('logs', '#6d5433', '#48371f', [2, 2]);
    const W = p.w || 16, H = p.h || 16, D = p.d || 12;
    // two piers + lintel = archway
    g.add(box(W * 0.32, H, D, wallMaterial, -W * 0.34));
    g.add(box(W * 0.32, H, D, wallMaterial, W * 0.34));
    g.add(box(W, H * 0.35, D, wallMaterial, 0, H * 0.65));
    // crenellation
    for (let i = -2; i <= 2; i++) g.add(box(W * 0.12, 1.6, D * 0.9, wallMaterial, i * W * 0.2, H));
    if (p.chapel) {
      const ch = box(W * 0.55, 6, D * 0.6, wallMaterial, 0, H + 1);
      g.add(ch);
      const c = cupola(2.2, 2, p.domeStyle || 'helmet', 'gold', wallMaterial);
      c.position.y = H + 7;
      g.add(c);
    }
    return g;
  },

  // Multi-tier bell tower (Lavra's Great Bell Tower, Sophia's baroque campanile).
  bellTower(p = {}) {
    const g = new THREE.Group();
    const tiers = p.tiers || 3;
    const baseW = p.w || 14;
    let y = 0;
    for (let i = 0; i < tiers; i++) {
      const tw = baseW * (1 - i * 0.22);
      const th = (p.h || 34) / tiers;
      const f = facadeMat('arches', p.wall || '#f2ede0', p.accent || '#cbc2a8', [2, 1]);
      if (p.round && i > 0) g.add(cyl(tw / 2, tw / 2, th, f, 0, y, 0, 12));
      else g.add(box(tw, th, tw, f, 0, y));
      y += th;
    }
    const c = cupola(baseW * 0.22, 3, p.domeStyle || 'pear', 'gold', mat(0xf2ede0));
    c.position.y = y;
    g.add(c);
    return g;
  },

  // Wooden castle keep (Lithuanian-era Zamkova Hora).
  woodCastle(p = {}) {
    const g = new THREE.Group();
    const logs = facadeMat('logs', '#71583a', '#4a3822', [3, 2]);
    g.add(box(20, 10, 26, logs));
    const keep = box(9, 16, 9, logs, -3, 0, -4);
    g.add(keep);
    const kr = new THREE.Mesh(new THREE.ConeGeometry(7, 7, 4), mat(0x463521));
    kr.rotation.y = Math.PI / 4; kr.position.set(-3, 19.5, -4); kr.castShadow = true;
    g.add(kr);
    for (const [tx, tz] of [[-11, -14], [11, -14], [-11, 14], [11, 14]]) {
      g.add(cyl(3, 3.5, 13, logs, tx, 0, tz, 8));
      const r = new THREE.Mesh(new THREE.ConeGeometry(4, 4.5, 8), mat(0x463521));
      r.position.set(tx, 15.2, tz); r.castShadow = true;
      g.add(r);
    }
    return g;
  },

  // Neoclassical block, optional portico (university, palaces).
  classical(p = {}) {
    const g = new THREE.Group();
    const w = p.w || 46, d = p.d || 22, floors = p.floors || 3;
    const h = floors * 4.4;
    const f = facadeMat('windows', p.wall || '#b03a2e', p.frame || '#2c2620', [Math.round(w / 8), floors * 0.6]);
    g.add(box(w, h, d, f));
    g.add(box(w * 1.03, 1, d * 1.03, mat(p.trim || 0xd9cdb8), 0, h));
    if (p.portico !== false) {
      const cols = p.cols || 6;
      for (let i = 0; i < cols; i++) {
        const x = (i - (cols - 1) / 2) * (w * 0.5 / cols);
        g.add(cyl(0.7, 0.8, h * 0.9, mat(p.colColor || 0xcfc4ae, { flat: false }), x, 0, -d / 2 - 2.4, 10));
      }
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.02, w * 0.32, 4, 3, 1), mat(p.trim || 0xd9cdb8));
      ped.rotation.z = Math.PI / 2; ped.rotation.x = Math.PI / 2;
      // triangle pediment via cone with 3 sides, rotated to face front
      ped.position.set(0, h + 2, -d / 2 - 1.4);
      ped.scale.set(1, 1, 0.4);
      ped.castShadow = true;
      g.add(ped);
    }
    if (p.dome) {
      const c = cupola(w * 0.12, 4, 'flat', p.domeColor || '#3f5747', f);
      c.position.y = h;
      g.add(c);
    }
    return g;
  },

  // The Motherland monument: shield & sword figure in stainless steel on a pedestal museum.
  motherland(p = {}) {
    const g = new THREE.Group();
    const s = SILVER();
    // pedestal (museum building)
    g.add(cyl(11, 13, 40, facadeMat('windows', '#8f8f96', '#3a3d44', [6, 4])));
    const fig = new THREE.Group();
    fig.add(cyl(3.4, 5.2, 36, s, 0, 0, 0, 10));                  // robe
    fig.add(cyl(2.6, 3.0, 10, s, 0, 34, 0, 10));                 // torso
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.9, 12, 10), s);
    head.position.y = 47; head.castShadow = true;
    fig.add(head);
    // right arm raising sword
    const armR = cyl(1.1, 1.3, 14, s, 5.5, 34, 0, 8);
    armR.rotation.z = -0.6;
    fig.add(armR);
    const sword = box(1.1, 22, 0.5, s, 10.4, 42, 0);
    sword.rotation.z = -0.12;
    fig.add(sword);
    // left arm with shield
    const armL = cyl(1.1, 1.3, 12, s, -5, 35, 0, 8);
    armL.rotation.z = 0.7;
    fig.add(armL);
    const shield = box(9, 12, 0.8, s, -8.5, 36, 1);
    fig.add(shield);
    // emblem on shield: trident (post-2023) or blank
    if (p.trident) {
      const gold = GOLD();
      shield.add(box(0.9, 5, 0.4, gold, 0, -1, 0.6));
      shield.add(box(0.7, 3.6, 0.4, gold, -1.6, -0.6, 0.6));
      shield.add(box(0.7, 3.6, 0.4, gold, 1.6, -0.6, 0.6));
    }
    fig.position.y = 40;
    g.add(fig);
    return g;
  },

  // Victory column (Independence Monument on the Maidan).
  column(p = {}) {
    const g = new THREE.Group();
    const marble = mat(0xf5f0e6, { flat: false, rough: 0.5 });
    g.add(box(10, 4, 10, marble));
    g.add(cyl(1.6, 2.0, p.h || 42, marble, 0, 4, 0, 14));
    g.add(cyl(2.6, 2.2, 2, marble, 0, 4 + (p.h || 42), 0, 14));
    if (p.figure !== false) {
      const fig = new THREE.Group();
      const gold = GOLD();
      fig.add(cyl(0.9, 1.6, 6, gold, 0, 0, 0, 8));
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), gold);
      head.position.y = 7; fig.add(head);
      const arms = box(6.5, 0.5, 0.5, gold, 0, 5.6);   // outstretched guelder-rose branch arms
      fig.add(arms);
      fig.position.y = 6 + (p.h || 42);
      g.add(fig);
    }
    return g;
  },

  // Blue-over-yellow flag on a pole.
  flag(p = {}) {
    const g = new THREE.Group();
    const h = p.h || 14;
    g.add(cyl(0.14, 0.2, h, mat(0xcfd4da, { metal: 0.5, rough: 0.4, flat: false })));
    const blue = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.6), mat(0x0057b7, { flat: false }));
    const yellow = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.6), mat(0xffd700, { flat: false }));
    blue.material.side = yellow.material.side = THREE.DoubleSide;
    blue.position.set(2.6, h - 0.9, 0);
    yellow.position.set(2.6, h - 2.5, 0);
    g.add(blue, yellow);
    return g;
  },

  // Anti-tank hedgehogs scattered over an area (2022 street defenses).
  hedgehogs(p = {}) {
    const g = new THREE.Group();
    const r = rng(p.seed || 3);
    const steel = mat(0x4a4f57, { metal: 0.6, rough: 0.5 });
    const beam = new THREE.BoxGeometry(0.35, 4.2, 0.35);
    const n = p.n || 8;
    for (let i = 0; i < n; i++) {
      const x = (r() - 0.5) * (p.spread || 40), z = (r() - 0.5) * (p.spread || 40);
      const h = new THREE.Group();
      for (let j = 0; j < 3; j++) {
        const b = new THREE.Mesh(beam, steel);
        b.castShadow = true;
        b.rotation.set([0.9, -0.9, 0][j], (j * Math.PI * 2) / 3 + r(), [0, 0, 0.9][j]);
        h.add(b);
      }
      h.position.set(x, 1.2, z);
      g.add(h);
    }
    return g;
  },

  // Simple arched road bridge across the river.
  bridge(p = {}) {
    const g = new THREE.Group();
    const len = p.len || 400, w = p.w || 14;
    const steel = mat(p.color || 0x5a6470, { metal: 0.5, rough: 0.5 });
    g.add(box(len, 2.5, w, steel, 0, p.deckY || 14));
    const piers = Math.max(2, Math.round(len / 90));
    for (let i = 0; i <= piers; i++) {
      const x = -len / 2 + (len / piers) * i;
      g.add(box(5, p.deckY || 14, w * 0.7, mat(0x788089), x, 0));
    }
    if (p.arches) {
      for (let i = 0; i < piers; i++) {
        const x = -len / 2 + (len / piers) * (i + 0.5);
        const arch = new THREE.Mesh(new THREE.TorusGeometry(len / piers / 2.3, 1.2, 8, 20, Math.PI), steel);
        arch.position.set(x, (p.deckY || 14) + 1, 0);
        arch.castShadow = true;
        g.add(arch);
      }
    }
    return g;
  },

  // Rubble mound for destroyed structures.
  ruin(p = {}) {
    const g = new THREE.Group();
    const r = rng(p.seed || 7);
    const m = mat(p.color || 0x9a8f80);
    const n = p.n || 14;
    const spread = p.spread || 10;
    for (let i = 0; i < n; i++) {
      const s = 1 + r() * (p.maxSize || 4);
      const b = box(s, s * (0.4 + r() * 0.8), s, m, (r() - 0.5) * spread, 0, (r() - 0.5) * spread);
      b.rotation.set(r() * 0.4, r() * Math.PI, r() * 0.4);
      g.add(b);
    }
    if (p.wallStub) {
      g.add(box(p.wallStub[0], p.wallStub[1], 2, facadeMat('plinthite', '#c9b8a4', '#a45a48', [2, 1])));
    }
    return g;
  },

  // Small wooden church with tent roof.
  woodChurch(p = {}) {
    const g = new THREE.Group();
    const logs = facadeMat('logs', '#71583a', '#4a3822', [2, 2]);
    const w = p.w || 8;
    g.add(box(w, 6, w * 1.4, logs));
    const c = cupola(w * 0.22, 4, 'tent', p.domeColor || '#5a4a30', logs);
    c.position.y = 6;
    g.add(c);
    return g;
  },

  // Ferris-wheel-free generic modern-ish stadium bowl (for present-day skyline depth).
  stadium(p = {}) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(p.r || 60, (p.r || 60) * 1.08, 18, 24, 1, true), mat(0xd8d8dc, { flat: false }));
    ring.position.y = 9;
    ring.castShadow = true;
    g.add(ring);
    return g;
  },
};

// Build one structure phase from config. Returns Group at world position.
export function buildStructure(entry, phase, terrainHeightAt) {
  const gen = generators[phase.build];
  if (!gen) { console.warn(`Unknown generator: ${phase.build}`); return new THREE.Group(); }
  const g = gen(phase.params || {});
  const [x, z] = entry.pos;
  const y = phase.y ?? (terrainHeightAt ? terrainHeightAt(x, z) : 0);
  g.position.set(x, y, z);
  if (entry.rotY) g.rotation.y = entry.rotY;
  if (phase.scale) g.scale.setScalar(phase.scale);
  return g;
}
