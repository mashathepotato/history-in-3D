// Time itself. Holds the continuous "year" value, eases it toward targets,
// and maps year <-> normalized track position (stops are evenly spaced so
// every era transition feels like the same length of walk).
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeOutBack = (t) => {
  const c = 1.2;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
export const lerp = (a, b, t) => a + (b - a) * t;

export class Timeline {
  constructor(stops) {
    this.stops = stops;                       // sorted era keyframes
    this.year = stops[0].year;
    this.target = stops[0].year;
    this.velocity = 0;
    this.playing = false;
    this.onArrive = null;                     // fired when settled on a stop
    this._arrived = true;
  }

  get minYear() { return this.stops[0].year; }
  get maxYear() { return this.stops[this.stops.length - 1].year; }

  // ---- year <-> track parameter u in [0,1], stops evenly spaced ----
  yearToU(year) {
    const s = this.stops;
    if (year <= s[0].year) return 0;
    if (year >= s[s.length - 1].year) return 1;
    for (let i = 0; i < s.length - 1; i++) {
      if (year <= s[i + 1].year) {
        const f = (year - s[i].year) / (s[i + 1].year - s[i].year);
        return (i + f) / (s.length - 1);
      }
    }
    return 1;
  }
  uToYear(u) {
    const s = this.stops;
    const f = clamp01(u) * (s.length - 1);
    const i = Math.min(Math.floor(f), s.length - 2);
    return lerp(s[i].year, s[i + 1].year, f - i);
  }

  // index of nearest stop at/below year, and blend to next
  segment(year = this.year) {
    const s = this.stops;
    for (let i = s.length - 1; i >= 0; i--) {
      if (year >= s[i].year) {
        const next = Math.min(i + 1, s.length - 1);
        const span = s[next].year - s[i].year || 1;
        return { i, next, f: clamp01((year - s[i].year) / span) };
      }
    }
    return { i: 0, next: 0, f: 0 };
  }

  nearestStopIndex(year = this.year) {
    let best = 0, bestD = Infinity;
    this.stops.forEach((s, i) => {
      const d = Math.abs(this.yearToU(s.year) - this.yearToU(year));
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  // Are we "at" a stop (settled close enough to read its story)?
  atStop() {
    const i = this.nearestStopIndex(this.target);
    return Math.abs(this.target - this.stops[i].year) < 0.5 &&
           Math.abs(this.year - this.target) < (this.stops[i].year >= 1900 ? 1.5 : 6) ? i : -1;
  }

  goToStop(i) {
    const idx = Math.max(0, Math.min(this.stops.length - 1, i));
    this.target = this.stops[idx].year;
    this.playing = false;
    this._arrived = false;
  }

  next() { this.goToStop(this.nearestNavIndex() + 1); }
  prev() { this.goToStop(this.nearestNavIndex() - 1); }
  nearestNavIndex() {
    // for arrow navigation: if we're between stops, snap direction sensibly
    const i = this.nearestStopIndex(this.target);
    return i;
  }

  scrubBy(du) {
    const u = clamp01(this.yearToU(this.target) + du);
    this.target = this.uToYear(u);
    this.playing = false;
    this._arrived = false;
  }
  scrubTo(u) {
    this.target = this.uToYear(clamp01(u));
    this.playing = false;
    this._arrived = false;
  }

  update(dt) {
    if (this.playing) {
      const u = this.yearToU(this.year) + dt * 0.055;   // full journey ~18s... per unit
      if (u >= 1) { this.playing = false; this.target = this.maxYear; }
      else this.target = this.uToYear(u);
    }
    // critically-damped-ish spring in u-space so every era takes similar time
    const uNow = this.yearToU(this.year);
    const uTarget = this.yearToU(this.target);
    const diff = uTarget - uNow;
    const speed = this.playing ? 20 : 3.2;
    const step = diff * Math.min(1, dt * speed);
    const uNext = Math.abs(diff) < 0.00004 ? uTarget : uNow + step;
    this.year = this.uToYear(uNext);
    if (!this._arrived && Math.abs(uTarget - uNext) < 0.002 && !this.playing) {
      this._arrived = true;
      if (this.onArrive) this.onArrive(this.atStop());
    }
  }

  // presence of a structure phase at current year: 0 = absent, 1 = fully there.
  // Buildings rise as year crosses `from` and fall as it crosses `to`.
  presence(from, to, riseSpan, fallSpan) {
    const rise = riseSpan ?? Math.max(4, (to - from) * 0.04);
    const fall = fallSpan ?? Math.max(2, rise * 0.5);
    const inP = smoothstep(from - rise, from, this.year);
    const outP = 1 - smoothstep(to, to + fall, this.year);
    return clamp01(Math.min(inP, outP));
  }
}
