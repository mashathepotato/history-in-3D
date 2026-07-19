// DOM layer: year counter, timeline track, story panel, captions.
export class UI {
  constructor(timeline, cfg) {
    this.t = timeline;
    this.cfg = cfg;
    this.el = {
      year: document.getElementById('year-number'),
      suffix: document.getElementById('year-suffix'),
      era: document.getElementById('era-title'),
      story: document.getElementById('story'),
      storyKicker: document.getElementById('story-kicker'),
      storyTitle: document.getElementById('story-title'),
      storyBody: document.getElementById('story-body'),
      storyContext: document.getElementById('story-context'),
      track: document.getElementById('track'),
      fill: document.getElementById('track-fill'),
      ticks: document.getElementById('track-ticks'),
      handle: document.getElementById('track-handle'),
      labels: document.getElementById('track-labels'),
      caption: document.getElementById('transition-caption'),
      btnPlay: document.getElementById('btn-play'),
    };
    this._shownStop = -1;
    this._storyDismissed = false;
    this._captionTimer = null;
    this._buildTrack();
    this._bind();
  }

  _buildTrack() {
    const stops = this.t.stops;
    stops.forEach((s, i) => {
      const u = i / (stops.length - 1);
      const tick = document.createElement('div');
      tick.className = 'tick' + (s.major ? ' major' : '');
      tick.style.left = `${u * 100}%`;
      tick.title = `${Math.round(s.year)} — ${s.title}`;
      tick.addEventListener('click', (e) => { e.stopPropagation(); this.goTo(i); });
      this.el.ticks.appendChild(tick);
      if (s.major || i === 0 || i === stops.length - 1) {
        const lb = document.createElement('div');
        lb.className = 'tlabel';
        lb.style.left = `${u * 100}%`;
        lb.textContent = Math.round(s.year);
        this.el.labels.appendChild(lb);
      }
    });
    this._tickEls = [...this.el.ticks.children];
  }

  _bind() {
    document.getElementById('btn-prev').addEventListener('click', () => this.nav(-1));
    document.getElementById('btn-next').addEventListener('click', () => this.nav(1));
    this.el.btnPlay.addEventListener('click', () => {
      this.t.playing = !this.t.playing;
      if (this.t.playing && this.t.yearToU(this.t.year) > 0.99) this.t.target = this.t.minYear, this.t.year = this.t.minYear;
      this.el.btnPlay.classList.toggle('playing', this.t.playing);
      this.el.btnPlay.textContent = this.t.playing ? '❚❚' : '▶';
      if (this.onNavigate) this.onNavigate();
    });
    document.getElementById('story-close').addEventListener('click', () => {
      this._storyDismissed = true;
      this.el.story.classList.add('hidden');
    });
    // track scrubbing
    const scrub = (e) => {
      const r = this.el.track.getBoundingClientRect();
      this.t.scrubTo((e.clientX - r.left) / r.width);
      if (this.onNavigate) this.onNavigate();
    };
    let dragging = false;
    this.el.track.addEventListener('pointerdown', (e) => { dragging = true; scrub(e); this.el.track.setPointerCapture(e.pointerId); });
    this.el.track.addEventListener('pointermove', (e) => dragging && scrub(e));
    this.el.track.addEventListener('pointerup', () => { dragging = false; });
    // keyboard
    window.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowRight') this.nav(1);
      else if (e.code === 'ArrowLeft') this.nav(-1);
      else if (e.code === 'Space') {
        e.preventDefault();
        const i = this.t.atStop();
        if (i >= 0) {
          this._storyDismissed = !this.el.story.classList.contains('hidden');
          this.el.story.classList.toggle('hidden');
        }
      }
    });
    // wheel = time travel
    window.addEventListener('wheel', (e) => {
      if (e.target.closest('#story')) return;   // let the panel scroll
      this.t.scrubBy(e.deltaY * 0.00016);
      if (this.onNavigateSoft) this.onNavigateSoft();
    }, { passive: true });
  }

  nav(dir) {
    const i = this.t.nearestStopIndex(this.t.target);
    const cur = this.t.stops[i].year;
    // if not exactly at that stop, first arrow press snaps to it
    let idx = i;
    if (Math.abs(this.t.target - cur) > 1) idx = dir > 0 ? i : i + 1;
    this.goTo(idx + (Math.abs(this.t.target - cur) > 1 ? (dir > 0 ? 0 : -0) : dir));
  }

  goTo(i) {
    this.t.goToStop(i);
    this._storyDismissed = false;
    if (this.onNavigate) this.onNavigate();
    const s = this.t.stops[Math.max(0, Math.min(this.t.stops.length - 1, i))];
    if (s.caption) this.showCaption(s.caption);
  }

  showCaption(text) {
    clearTimeout(this._captionTimer);
    this.el.caption.textContent = text;
    this.el.caption.classList.remove('hidden');
    this._captionTimer = setTimeout(() => this.el.caption.classList.add('hidden'), 3400);
  }

  showStory(i) {
    const s = this.t.stops[i];
    if (!s.story) return;
    this.el.storyKicker.textContent = s.kicker || '';
    this.el.storyTitle.textContent = s.title;
    this.el.storyBody.innerHTML = s.story;
    if (s.context) {
      this.el.storyContext.innerHTML = s.context;
      this.el.storyContext.style.display = '';
    } else this.el.storyContext.style.display = 'none';
    this.el.story.classList.remove('hidden');
    this.el.story.scrollTop = 0;
  }

  update() {
    const t = this.t;
    const year = Math.round(t.year);
    this.el.year.textContent = Math.abs(year);
    this.el.suffix.textContent = year < 1000 ? 'AD' : '';
    const u = t.yearToU(t.year);
    this.el.fill.style.width = `${u * 100}%`;
    this.el.handle.style.left = `${u * 100}%`;
    this._tickEls.forEach((el, i) => {
      el.classList.toggle('passed', t.yearToU(t.stops[i].year) <= u + 0.001);
    });

    // era title + story panel visibility
    const stopIdx = t.atStop();
    if (stopIdx >= 0) {
      const s = t.stops[stopIdx];
      this.el.era.textContent = `${s.title}`;
      if (this._shownStop !== stopIdx && !this._storyDismissed) {
        this._shownStop = stopIdx;
        this.showStory(stopIdx);
      }
    } else {
      const seg = t.segment();
      this.el.era.textContent = t.stops[seg.i].transitTitle || '';
      if (this._shownStop !== -1) {
        this._shownStop = -1;
        this.el.story.classList.add('hidden');
        this._storyDismissed = false;
      }
    }
  }
}
