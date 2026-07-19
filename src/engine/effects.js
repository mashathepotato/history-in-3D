// Ambient life & drama: fire, smoke, birds, river boats, crowds, trees.
// Everything is year-gated by the config and faded in/out by the engine.
import * as THREE from 'three';
import { mat, rng } from './buildings.js';

// ---------- fire + smoke (shader points) ----------
export class FireSystem {
  constructor(sites) {
    // sites: [{pos:[x,y,z], radius, from, to}]
    this.sites = sites;
    this.group = new THREE.Group();
    this.systems = [];
    for (const site of sites) {
      const nFire = 60, nSmoke = 40;
      const makePoints = (n, isSmoke) => {
        const g = new THREE.BufferGeometry();
        const p = new Float32Array(n * 3);
        const seedArr = new Float32Array(n);
        const r = rng(1234 + Math.round(site.pos[0]));
        for (let i = 0; i < n; i++) {
          p[i * 3] = (r() - 0.5) * site.radius;
          p[i * 3 + 1] = 0;
          p[i * 3 + 2] = (r() - 0.5) * site.radius;
          seedArr[i] = r();
        }
        g.setAttribute('position', new THREE.BufferAttribute(p, 3));
        g.setAttribute('aSeed', new THREE.BufferAttribute(seedArr, 1));
        const uniforms = {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uSmoke: { value: isSmoke ? 1 : 0 },
          uHeight: { value: isSmoke ? site.radius * 3.2 : site.radius * 0.9 },
        };
        const material = new THREE.ShaderMaterial({
          uniforms, transparent: true, depthWrite: false,
          blending: isSmoke ? THREE.NormalBlending : THREE.AdditiveBlending,
          vertexShader: /* glsl */`
            attribute float aSeed;
            uniform float uTime;
            uniform float uHeight;
            uniform float uSmoke;
            varying float vLife;
            varying float vSeed;
            void main() {
              float life = fract(uTime * (0.25 + aSeed * 0.35) + aSeed * 7.0);
              vLife = life;
              vSeed = aSeed;
              vec3 p = position;
              p.y += life * uHeight;
              p.x += sin(life * 9.0 + aSeed * 40.0) * (0.5 + uSmoke * 2.5) * life;
              p.z += cos(life * 7.0 + aSeed * 31.0) * (0.5 + uSmoke * 2.5) * life;
              vec4 mv = modelViewMatrix * vec4(p, 1.0);
              float size = uSmoke > 0.5 ? (8.0 + life * 34.0) : (9.0 * (1.0 - life) + 2.5);
              gl_PointSize = size * (300.0 / -mv.z);
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: /* glsl */`
            uniform float uIntensity;
            uniform float uSmoke;
            varying float vLife;
            varying float vSeed;
            void main() {
              float d = length(gl_PointCoord - 0.5);
              if (d > 0.5) discard;
              float soft = smoothstep(0.5, 0.1, d);
              if (uSmoke > 0.5) {
                float a = soft * (1.0 - vLife) * 0.45 * uIntensity;
                gl_FragColor = vec4(vec3(0.16, 0.15, 0.14), a);
              } else {
                vec3 c = mix(vec3(1.0, 0.85, 0.3), vec3(0.9, 0.25, 0.05), vLife);
                gl_FragColor = vec4(c, soft * (1.0 - vLife) * uIntensity);
              }
            }`,
        });
        const pts = new THREE.Points(g, material);
        pts.position.set(...site.pos);
        pts.frustumCulled = false;
        return { pts, uniforms };
      };
      const fire = makePoints(nFire, false);
      const smoke = makePoints(nSmoke, true);
      this.group.add(fire.pts, smoke.pts);
      this.systems.push({ site, fire, smoke });
    }
  }
  update(t, year, fade) {
    for (const s of this.systems) {
      const active = year >= s.site.from && year <= s.site.to ? 1 : 0;
      const target = active * (s.site.intensity ?? 1);
      // smokeOnly sites (factory chimneys) never show flames
      const fireTarget = s.site.smokeOnly ? 0 : target;
      s.fire.uniforms.uTime.value = t;
      s.smoke.uniforms.uTime.value = t * 0.5;
      s.fire.uniforms.uIntensity.value += (fireTarget - s.fire.uniforms.uIntensity.value) * fade;
      s.smoke.uniforms.uIntensity.value += (target - s.smoke.uniforms.uIntensity.value) * fade;
      s.fire.pts.visible = s.fire.uniforms.uIntensity.value > 0.02;
      s.smoke.pts.visible = s.smoke.uniforms.uIntensity.value > 0.02;
    }
  }
}

// ---------- birds: a few flocks of gliding chevrons ----------
export class Birds {
  constructor(center, radius, count = 14) {
    this.group = new THREE.Group();
    this.center = center;
    this.radius = radius;
    this.birds = [];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -1.4, 0, 0.5, 0, 0, 0, 0, 0.12, -0.9,
      0, 0.12, -0.9, 0, 0, 0, 1.4, 0, 0.5,
    ]), 3));
    geo.computeVertexNormals();
    const material = mat(0x2a2d33);
    const r = rng(99);
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, material);
      m.scale.setScalar(1.6 + r() * 1.2);
      this.group.add(m);
      this.birds.push({ m, phase: r() * Math.PI * 2, alt: 60 + r() * 70, rad: radius * (0.35 + r() * 0.65), speed: 0.06 + r() * 0.05 });
    }
  }
  update(t) {
    for (const b of this.birds) {
      const a = t * b.speed + b.phase;
      b.m.position.set(
        this.center[0] + Math.cos(a) * b.rad,
        b.alt + Math.sin(t * 1.3 + b.phase) * 4,
        this.center[2] + Math.sin(a) * b.rad,
      );
      b.m.rotation.y = -a - Math.PI / 2;
      b.m.rotation.z = Math.sin(t * 6 + b.phase) * 0.25; // wingbeat-ish tilt
    }
  }
}

// ---------- boats drifting along the river ----------
export class Boats {
  constructor(defs, waterY) {
    // defs: [{from,to,style:'longship'|'sail'|'barge', path:[[x,z],...], speed}]
    this.group = new THREE.Group();
    this.items = [];
    for (const d of defs) {
      const curve = new THREE.CatmullRomCurve3(d.path.map(([x, z]) => new THREE.Vector3(x, waterY + 0.4, z)));
      const boat = this._makeBoat(d.style);
      this.group.add(boat);
      this.items.push({ d, curve, boat, offset: Math.random() });
    }
  }
  _makeBoat(style) {
    const g = new THREE.Group();
    const hullMat = mat(0x5c4326);
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.6, 14, 6), hullMat);
    hull.rotation.z = Math.PI / 2;
    hull.scale.y = 0.5;
    hull.castShadow = true;
    g.add(hull);
    if (style === 'sail' || style === 'longship') {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 9), hullMat);
      mast.position.y = 4.5;
      g.add(mast);
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), mat(style === 'longship' ? 0xa44a3a : 0xe8e0cc));
      sail.material.side = THREE.DoubleSide;
      sail.position.y = 5.5;
      g.add(sail);
    }
    if (style === 'barge') {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(8, 1.4, 2.6), mat(0x777f88)));
      g.children[g.children.length - 1].position.y = 1;
    }
    return g;
  }
  update(t, year, fade) {
    for (const it of this.items) {
      const active = year >= it.d.from && year <= it.d.to;
      it.boat.visible = active;
      if (!active) continue;
      const u = ((t * (it.d.speed || 0.008)) + it.offset) % 1;
      const p = it.curve.getPointAt(u);
      const tan = it.curve.getTangentAt(u);
      it.boat.position.copy(p);
      it.boat.position.y += Math.sin(t * 1.8 + it.offset * 9) * 0.25;
      it.boat.rotation.y = Math.atan2(tan.x, tan.z) + Math.PI / 2;
    }
  }
}

// ---------- traffic: era-gated vehicles following the road network ----------
export class Traffic {
  constructor(defs, heightAt) {
    // defs: [{from,to,path,type:'cart'|'tram'|'car'|'bus',count,speed,offset,colors}]
    this.group = new THREE.Group();
    this.items = [];
    for (const d of defs) {
      const pts = d.path.map(([x, z]) => {
        // lateral lane offset applied along the path normal is approximated
        // by a simple perpendicular shift of each control point
        return new THREE.Vector3(x, 0, z);
      });
      if (d.offset) {
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
          const dx = b.x - a.x, dz = b.z - a.z;
          const l = Math.hypot(dx, dz) || 1;
          pts[i].x += (-dz / l) * d.offset;
          pts[i].z += (dx / l) * d.offset;
        }
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const r = rng(d.seed || 17);
      for (let i = 0; i < (d.count || 1); i++) {
        const v = this._vehicle(d.type, r);
        this.group.add(v);
        this.items.push({ d, curve, v, u0: (i + r() * 0.5) / (d.count || 1) });
      }
    }
    this.heightAt = heightAt;
  }

  _vehicle(type, r) {
    const g = new THREE.Group();
    if (type === 'cart') {
      const wood = mat(0x6b4f2e);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 2.6), wood);
      bed.position.y = 0.9; bed.castShadow = true;
      g.add(bed);
      const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 10);
      for (const [wx, wz] of [[-0.8, 0.7], [0.8, 0.7], [-0.8, -0.7], [0.8, -0.7]]) {
        const wh = new THREE.Mesh(wheelGeo, wood);
        wh.rotation.z = Math.PI / 2;
        wh.position.set(wx, 0.5, wz);
        g.add(wh);
      }
      // horse: body + neck + head, honest low-poly
      const hide = mat([0x5a4030, 0x3a2e24, 0x7a6248][Math.floor(r() * 3)]);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1.8), hide);
      body.position.set(0, 1.25, 2.9); body.castShadow = true;
      g.add(body);
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.5), hide);
      neck.position.set(0, 1.9, 3.6); neck.rotation.x = 0.4;
      g.add(neck);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.8), hide);
      head.position.set(0, 2.25, 3.95);
      g.add(head);
      for (const [lx, lz] of [[-0.3, 2.2], [0.3, 2.2], [-0.3, 3.5], [0.3, 3.5]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.16), hide);
        leg.position.set(lx, 0.45, lz);
        g.add(leg);
      }
    } else if (type === 'tram') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.6, 8.5), mat(0xc8901f, { flat: false }));
      body.position.y = 1.9; body.castShadow = true;
      g.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 8.7), mat(0x7a2f22));
      roof.position.y = 3.35;
      g.add(roof);
      const winMat = mat(0x2c3a48, { flat: false, rough: 0.3 });
      for (const side of [1.17, -1.17]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 7.6), winMat);
        win.position.set(side, 2.4, 0);
        g.add(win);
      }
      const panto = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), mat(0x333333));
      panto.position.y = 4.2; panto.rotation.z = 0.3;
      g.add(panto);
    } else if (type === 'bus') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 9), mat(0x3f6d5a, { flat: false }));
      body.position.y = 1.8; body.castShadow = true;
      g.add(body);
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.9, 7.6), mat(0x2c3a48, { flat: false, rough: 0.3 }));
      win.position.y = 2.5;
      g.add(win);
    } else { // car
      const colors = [0xa8352a, 0x36486a, 0xd8d4c8, 0x3a3d40, 0x7c8288, 0x8a7332];
      const paint = mat(colors[Math.floor(r() * colors.length)], { flat: false, rough: 0.4, metal: 0.3 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.6, 4.2), paint);
      body.position.y = 0.75; body.castShadow = true;
      g.add(body);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.1), mat(0x2c3a48, { flat: false, rough: 0.3 }));
      cabin.position.set(0, 1.3, -0.2);
      g.add(cabin);
      const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 8);
      const rubber = mat(0x1e2022);
      for (const [wx, wz] of [[-0.95, 1.3], [0.95, 1.3], [-0.95, -1.3], [0.95, -1.3]]) {
        const wh = new THREE.Mesh(wheelGeo, rubber);
        wh.rotation.z = Math.PI / 2;
        wh.position.set(wx, 0.36, wz);
        g.add(wh);
      }
    }
    return g;
  }

  update(t, year) {
    for (const it of this.items) {
      const active = year >= it.d.from && year <= (it.d.to ?? 9999);
      it.v.visible = active;
      if (!active) continue;
      const speed = it.d.speed || 0.01;
      const u = ((t * speed) + it.u0) % 1;
      const p = it.curve.getPointAt(u);
      const tan = it.curve.getTangentAt(u);
      it.v.position.set(p.x, this.heightAt(p.x, p.z) + 0.55, p.z);
      it.v.rotation.y = Math.atan2(tan.x, tan.z) + Math.PI;
    }
  }
}

// ---------- crowds: instanced little people ----------
export class Crowds {
  constructor(defs, heightAt) {
    // defs: [{from,to,area:[x,z,rx,rz], count, colors, seed}]
    this.group = new THREE.Group();
    this.items = [];
    const bodyGeo = new THREE.ConeGeometry(0.42, 1.5, 6);
    const headGeo = new THREE.SphereGeometry(0.24, 6, 5);
    for (const d of defs) {
      const r = rng(d.seed || 5);
      const colors = d.colors || ['#8a5a3a', '#6a6a72', '#a0846a', '#54617a', '#7a4a4a'];
      const body = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ flatShading: true }), d.count);
      const head = new THREE.InstancedMesh(headGeo, mat(0xd9b48f, { flat: false }), d.count);
      const m4 = new THREE.Matrix4();
      const col = new THREE.Color();
      for (let i = 0; i < d.count; i++) {
        const ang = r() * Math.PI * 2;
        const rr = Math.sqrt(r());
        const x = d.area[0] + Math.cos(ang) * rr * d.area[2];
        const z = d.area[1] + Math.sin(ang) * rr * d.area[3];
        const y = d.inWater ? (d.waterY ?? 2) - 0.4 : heightAt(x, z);
        m4.makeRotationY(r() * Math.PI * 2);
        m4.setPosition(x, y + 0.75, z);
        body.setMatrixAt(i, m4);
        col.set(colors[Math.floor(r() * colors.length)]);
        body.setColorAt(i, col);
        m4.setPosition(x, y + 1.72, z);
        head.setMatrixAt(i, m4);
      }
      body.castShadow = true;
      this.group.add(body, head);
      this.items.push({ d, body, head });
    }
  }
  update(year) {
    for (const it of this.items) {
      const active = year >= it.d.from && year <= it.d.to;
      it.body.visible = it.head.visible = active;
    }
  }
}

// ---------- trees: instanced, per-era groves ----------
export class Groves {
  constructor(defs, heightAt, isBlocked = null) {
    // defs: [{from,to,area:[x,z,rx,rz], count, kind:'oak'|'poplar'|'pine'|'chestnut', seed}]
    this.group = new THREE.Group();
    this.items = [];
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 3.4, 5);
    const oakGeo = new THREE.IcosahedronGeometry(2.6, 0);
    const poplarGeo = new THREE.ConeGeometry(1.6, 8.5, 6);
    const pineGeo = new THREE.ConeGeometry(2.2, 6, 6);
    const trunkMat = mat(0x5c4630);
    const kinds = {
      oak: { crown: oakGeo, color: 0x4d6b35, crownY: 4.6, s: [1, 1.5] },
      chestnut: { crown: oakGeo, color: 0x3f6d3a, crownY: 4.8, s: [1.2, 1.8] },
      poplar: { crown: poplarGeo, color: 0x53744a, crownY: 6.4, s: [0.9, 1.3] },
      pine: { crown: pineGeo, color: 0x39543b, crownY: 5.4, s: [0.9, 1.4] },
    };
    for (const d of defs) {
      const kind = kinds[d.kind || 'oak'];
      const r = rng(d.seed || 11);
      const trunk = new THREE.InstancedMesh(trunkGeo, trunkMat, d.count);
      const crown = new THREE.InstancedMesh(kind.crown, mat(kind.color), d.count);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const v = new THREE.Vector3();
      for (let i = 0; i < d.count; i++) {
        const ang = r() * Math.PI * 2;
        const rr = Math.sqrt(r());
        const x = d.area[0] + Math.cos(ang) * rr * d.area[2];
        const z = d.area[1] + Math.sin(ang) * rr * d.area[3];
        const y = heightAt(x, z);
        if (y < 2.6 || (isBlocked && isBlocked(x, z))) { // no trees in the river or on roads
          m4.makeScale(0.001, 0.001, 0.001);
          trunk.setMatrixAt(i, m4); crown.setMatrixAt(i, m4);
          continue;
        }
        const s = kind.s[0] + r() * (kind.s[1] - kind.s[0]);
        e.set(0, r() * Math.PI * 2, 0);
        q.setFromEuler(e);
        m4.compose(v.set(x, y + 1.7 * s, z), q, new THREE.Vector3(s, s, s));
        trunk.setMatrixAt(i, m4);
        m4.compose(v.set(x, y + kind.crownY * s, z), q, new THREE.Vector3(s, s, s));
        crown.setMatrixAt(i, m4);
      }
      trunk.castShadow = crown.castShadow = true;
      this.group.add(trunk, crown);
      this.items.push({ d, trunk, crown });
    }
  }
  update(year) {
    for (const it of this.items) {
      const active = year >= (it.d.from ?? -9999) && year <= (it.d.to ?? 9999);
      it.trunk.visible = it.crown.visible = active;
    }
  }
}
