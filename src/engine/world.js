// Assembles a city config into a living scene and animates it through time.
import * as THREE from 'three';
import { buildTerrain, buildWater, buildSky } from './terrain.js';
import { buildStructure, generators, rng } from './buildings.js';
import { FireSystem, Birds, Boats, Crowds, Groves } from './effects.js';
import { easeOutBack, lerp } from './timeline.js';

export class World {
  constructor(cfg, timeline, onProgress) {
    this.cfg = cfg;
    this.timeline = timeline;
    this.scene = new THREE.Scene();
    this.clockT = 0;
    this._envA = {}; this._envB = {};
    this._color = new THREE.Color();
    this._buildAll(onProgress);
  }

  _buildAll(onProgress) {
    const cfg = this.cfg;
    const progress = (p, label) => onProgress && onProgress(p, label);

    // --- sky, light, fog ---
    const sky = buildSky();
    this.sky = sky;
    this.scene.add(sky.mesh);
    this.hemi = new THREE.HemisphereLight(0xbdd4e8, 0x54503c, 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2cc, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const S = cfg.terrain.size * 0.55;
    Object.assign(this.sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 10, far: 4000 });
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun, this.sun.target);
    this.scene.fog = new THREE.FogExp2(0xcfd8dc, 0.0007);
    progress(0.1, 'Raising the hills…');

    // --- terrain + water ---
    this.terrain = buildTerrain(cfg);
    this.scene.add(this.terrain);
    const water = buildWater(cfg);
    this.water = water;
    this.scene.add(water.mesh);
    progress(0.25, 'Filling the Dnipro…');

    // --- structures (each phase becomes a group animated by presence) ---
    this.animated = [];   // {group, from, to, rise, baseY, mode}
    for (const entry of cfg.structures) {
      for (const phase of entry.phases) {
        const g = buildStructure(entry, phase, cfg.terrain.heightAt);
        g.visible = false;
        this.scene.add(g);
        this.animated.push({
          group: g, from: phase.from, to: phase.to ?? 9999,
          rise: phase.rise, baseY: g.position.y,
          sinkDepth: phase.sinkDepth ?? 14,
        });
      }
    }
    progress(0.55, 'Building the churches…');

    // --- districts: scattered generic fabric per era phase ---
    for (const d of cfg.districts || []) {
      for (const phase of d.phases) {
        const g = this._buildDistrict(d, phase);
        g.visible = false;
        this.scene.add(g);
        this.animated.push({
          group: g, from: phase.from, to: phase.to ?? 9999,
          rise: phase.rise ?? 10, baseY: 0, isDistrict: true, sinkDepth: 8,
        });
      }
    }
    progress(0.8, 'Settling the districts…');

    // --- effects ---
    const heightAt = cfg.terrain.heightAt;
    this.fires = new FireSystem(cfg.effects?.fires || []);
    this.scene.add(this.fires.group);
    this.birds = new Birds(cfg.effects?.birdCenter || [0, 0, 0], cfg.effects?.birdRadius || 250);
    this.scene.add(this.birds.group);
    this.boats = new Boats(cfg.effects?.boats || [], cfg.terrain.waterLevel ?? 2);
    this.scene.add(this.boats.group);
    this.crowds = new Crowds(cfg.effects?.crowds || [], heightAt);
    this.scene.add(this.crowds.group);
    this.groves = new Groves(cfg.effects?.groves || [], heightAt);
    this.scene.add(this.groves.group);
    progress(1, 'Opening the gates…');
  }

  _buildDistrict(d, phase) {
    const g = new THREE.Group();
    const r = rng(d.seed ?? 42);
    const heightAt = this.cfg.terrain.heightAt;
    const styles = Array.isArray(phase.style) ? phase.style : [phase.style];
    for (let i = 0; i < phase.count; i++) {
      const ang = r() * Math.PI * 2;
      const rr = Math.sqrt(r());
      const x = d.area[0] + Math.cos(ang) * rr * d.area[2];
      const z = d.area[1] + Math.sin(ang) * rr * d.area[3];
      const y = heightAt(x, z);
      if (y < (this.cfg.terrain.waterLevel ?? 2) + 1) continue;
      const style = styles[Math.floor(r() * styles.length)];
      const gen = generators[style.gen || style];
      if (!gen) continue;
      const params = { ...(style.params || {}) };
      if (style.vary) {
        for (const [k, [lo, hi]] of Object.entries(style.vary)) params[k] = lo + r() * (hi - lo);
        if (params.floors) params.floors = Math.round(params.floors);
      }
      const b = gen(params);
      b.position.set(x, y, z);
      b.rotation.y = d.gridAngle != null ? d.gridAngle + (r() > 0.5 ? Math.PI / 2 : 0) : r() * Math.PI * 2;
      g.add(b);
    }
    return g;
  }

  // env keyframe interpolation between adjacent stops
  _lerpEnv(a, b, f) {
    const setColor = (uniform, ka, kb) => {
      this._color.set(ka).lerp(new THREE.Color(kb), f);
      uniform.value ? uniform.value.copy?.(this._color) : null;
    };
    const e = (k, d) => lerp(a[k] ?? d, b[k] ?? d, f);
    setColor(this.sky.uniforms.uTop, a.skyTop, b.skyTop);
    setColor(this.sky.uniforms.uBottom, a.skyBottom, b.skyBottom);
    setColor(this.sky.uniforms.uSunColor, a.sunColor ?? '#fff2cc', b.sunColor ?? '#fff2cc');
    this.sky.uniforms.uHaze.value = e('haze', 0.4);
    const sa = a.sunDir ?? [0.5, 0.6, -0.6], sb = b.sunDir ?? [0.5, 0.6, -0.6];
    this.sky.uniforms.uSunDir.value.set(lerp(sa[0], sb[0], f), lerp(sa[1], sb[1], f), lerp(sa[2], sb[2], f)).normalize();
    this.sun.position.copy(this.sky.uniforms.uSunDir.value).multiplyScalar(1500);
    this.sun.color.set(a.sunColor ?? '#fff2cc').lerp(new THREE.Color(b.sunColor ?? '#fff2cc'), f);
    this.sun.intensity = e('sunIntensity', 2.2);
    this.hemi.intensity = e('ambient', 0.9);
    this._color.set(a.fogColor ?? '#cfd8dc').lerp(new THREE.Color(b.fogColor ?? '#cfd8dc'), f);
    this.scene.fog.color.copy(this._color);
    this.scene.fog.density = e('fogDensity', 0.0007);
    this._color.set(a.waterColor ?? this.cfg.terrain.waterDeep ?? '#22506b')
      .lerp(new THREE.Color(b.waterColor ?? this.cfg.terrain.waterDeep ?? '#22506b'), f);
    this.water.uniforms.uDeep.value.copy(this._color);
    this.water.uniforms.uSky.value.copy(this.sky.uniforms.uBottom.value);
  }

  update(dt) {
    this.clockT += dt;
    const t = this.timeline;
    const seg = t.segment();
    const stops = t.stops;

    // env
    const f = seg.f * seg.f * (3 - 2 * seg.f);
    this._lerpEnv(stops[seg.i].env, stops[seg.next].env, f);

    // structures presence
    for (const a of this.animated) {
      const p = t.presence(a.from, a.to, a.rise);
      const vis = p > 0.003;
      if (a.group.visible !== vis) a.group.visible = vis;
      if (!vis) continue;
      const s = a.isDistrict ? p : easeOutBack(p);
      a.group.scale.y = Math.max(0.002, s);
      // sink a little while emerging/dying so bases don't float
      const sink = (1 - p) * (t.year > a.to ? a.sinkDepth : 2);
      a.group.position.y = a.baseY - sink;
    }

    // effects
    this.fires.update(this.clockT, t.year, Math.min(1, dt * 2));
    this.birds.update(this.clockT);
    this.boats.update(this.clockT, t.year, dt);
    this.crowds.update(t.year);
    this.groves.update(t.year);
    this.water.uniforms.uTime.value = this.clockT;

    return seg;
  }
}
