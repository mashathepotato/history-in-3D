// Camera rig: follows each era's vantage point, lets the user look around
// freely (drag), walk away (WASD), and scroll to travel through time.
// When the user walks off the rails, time-travel keeps them in place —
// you stand still while the city changes around you.
import * as THREE from 'three';
import { lerp, clamp01 } from './timeline.js';

export class CameraRig {
  constructor(camera, canvas, timeline, heightAt) {
    this.camera = camera;
    this.canvas = canvas;
    this.timeline = timeline;
    this.heightAt = heightAt;

    this.yaw = 0;            // user look offset
    this.pitch = 0;
    this.freeMode = false;   // detached from the rails by walking
    this.freePos = new THREE.Vector3();
    this.baseYaw = 0;        // yaw of the rail vantage (look dir)
    this.basePitch = 0;

    this.keys = new Set();
    this._drag = null;
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();

    this._bind();
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      this._drag = { x: e.clientX, y: e.clientY };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (!this._drag) return;
      const dx = e.clientX - this._drag.x;
      const dy = e.clientY - this._drag.y;
      this._drag = { x: e.clientX, y: e.clientY };
      this.yaw += dx * 0.0032;
      this.pitch += dy * 0.0028;
      this.pitch = Math.max(-1.2, Math.min(1.25, this.pitch));
    });
    const endDrag = () => { this._drag = null; };
    c.addEventListener('pointerup', endDrag);
    c.addEventListener('pointercancel', endDrag);

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  // Called by main when era navigation happens: fly back to the rails.
  reattach() {
    this.freeMode = false;
    // ease look offset back toward neutral so the era's framing lands
    this._easeBackOffsets = true;
  }

  // Street-view: glide down to eye level at `pos`, facing `look` (optional).
  dropTo(pos, look, instant = false) {
    this.freeMode = true;
    this.freePos.set(pos[0], pos[1], pos[2]);
    if (instant) this.camera.position.copy(this.freePos);
    if (look) {
      const dx = look[0] - pos[0], dy = look[1] - pos[1], dz = look[2] - pos[2];
      this.baseYaw = Math.atan2(dx, dz);
      this.basePitch = Math.atan2(dy, Math.hypot(dx, dz));
      this.yaw = 0;
      this.pitch = 0;
    }
  }

  update(dt, stops, seg) {
    const t = this.timeline;
    // --- rail vantage: interpolate camera pos/look between era stops ---
    const a = stops[seg.i], b = stops[seg.next];
    const f = seg.f;
    const ease = f * f * (3 - 2 * f);
    this._pos.set(
      lerp(a.camera.pos[0], b.camera.pos[0], ease),
      lerp(a.camera.pos[1], b.camera.pos[1], ease),
      lerp(a.camera.pos[2], b.camera.pos[2], ease),
    );
    this._look.set(
      lerp(a.camera.look[0], b.camera.look[0], ease),
      lerp(a.camera.look[1], b.camera.look[1], ease),
      lerp(a.camera.look[2], b.camera.look[2], ease),
    );

    // --- WASD walking (detaches from rails) ---
    const moveSpeed = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) ? 90 : 32;
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const move = new THREE.Vector3();
    if (this.keys.has('KeyW')) move.add(fwd);
    if (this.keys.has('KeyS')) move.sub(fwd);
    if (this.keys.has('KeyA')) move.add(right);
    if (this.keys.has('KeyD')) move.sub(right);
    if (this.keys.has('KeyQ')) move.y -= 1;
    if (this.keys.has('KeyE')) move.y += 1;
    if (move.lengthSq() > 0) {
      if (!this.freeMode) {
        this.freeMode = true;
        this.freePos.copy(this.camera.position);
      }
      move.normalize().multiplyScalar(moveSpeed * dt);
      this.freePos.add(move);
    }

    if (this.freeMode) {
      // stay above terrain
      const minY = this.heightAt(this.freePos.x, this.freePos.z) + 2.2;
      if (this.freePos.y < minY) this.freePos.y = minY;
      // long jumps (street-view drops) glide; close control stays tight
      const glide = this.camera.position.distanceTo(this.freePos) > 25 ? 2.2 : 10;
      this.camera.position.lerp(this.freePos, Math.min(1, dt * glide));
      // in free mode the user's yaw/pitch is absolute
      const dir = new THREE.Vector3(
        Math.sin(this.baseYaw + this.yaw) * Math.cos(this.basePitch + this.pitch),
        Math.sin(this.basePitch + this.pitch),
        Math.cos(this.baseYaw + this.yaw) * Math.cos(this.basePitch + this.pitch),
      );
      this.camera.lookAt(this.camera.position.clone().add(dir));
    } else {
      if (this._easeBackOffsets) {
        this.yaw = lerp(this.yaw, 0, Math.min(1, dt * 3));
        this.pitch = lerp(this.pitch, 0, Math.min(1, dt * 3));
        if (Math.abs(this.yaw) < 0.01 && Math.abs(this.pitch) < 0.01) this._easeBackOffsets = false;
      }
      // rails: smooth-follow the vantage, apply look offsets around the base direction
      this.camera.position.lerp(this._pos, Math.min(1, dt * 4));
      const baseDir = this._look.clone().sub(this._pos);
      this.baseYaw = Math.atan2(baseDir.x, baseDir.z);
      const flat = Math.hypot(baseDir.x, baseDir.z);
      this.basePitch = Math.atan2(baseDir.y, flat);
      const yaw = this.baseYaw + this.yaw;
      const pitch = Math.max(-1.3, Math.min(1.3, this.basePitch + this.pitch));
      const dir = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        Math.cos(yaw) * Math.cos(pitch),
      );
      this.camera.lookAt(this.camera.position.clone().add(dir));
      // keep freePos synced so walking starts from here
      this.freePos.copy(this.camera.position);
    }
  }
}
