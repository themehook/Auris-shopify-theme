(function () {
  'use strict';

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function norm(v, inLo, inHi) {
    return clamp((v - inLo) / (inHi - inLo), 0, 1);
  }

  class ScrollRevealMedia {
    constructor(el) {
      this.el = el;
      this.sticky = el.querySelector('.srm-sticky');
      this.images = Array.from(el.querySelectorAll('.srm-img'));
      this.stage1 = el.querySelector('.srm-stage1-content');
      this.videoWrapper = el.querySelector('.srm-video-wrapper');
      this.stage2Content = el.querySelector('.srm-stage2-content');
      this.video = el.querySelector('video.srm-video');

      this.offsets = [];
      this.raf = null;
      this.lastProgress = -1;

      this._init();
    }

    _init() {
      // Reset inline transforms so measurement reflects CSS-only positions
      this.images.forEach(img => { img.style.transform = 'none'; });

      requestAnimationFrame(() => {
        this._calcOffsets();
        this._bindEvents();
        this._update();

        if (window.Shopify && window.Shopify.designMode) {
          this._applyProgress(0.45);
        }
      });
    }

    _calcOffsets() {
      // Measure where each image naturally sits (CSS spread positions),
      // then store the vector from that center to the sticky center.
      // At scroll=0 the full vector is applied → all images appear at center.
      // As scroll progresses the vector approaches 0 → images reach spread positions.
      this.images.forEach(img => { img.style.transform = 'none'; });

      const sr = this.sticky.getBoundingClientRect();
      const cx = sr.width / 2;
      const cy = sr.height / 2;

      this.offsets = this.images.map(img => {
        const r = img.getBoundingClientRect();
        const imgCx = r.left - sr.left + r.width / 2;
        const imgCy = r.top - sr.top + r.height / 2;
        return { x: cx - imgCx, y: cy - imgCy };
      });

      this.images.forEach(img => { img.style.transform = ''; });
    }

    _bindEvents() {
      window.addEventListener('scroll', () => this._scheduleUpdate(), { passive: true });
      window.addEventListener('resize', () => {
        this._calcOffsets();
        this.lastProgress = -1;
        this._scheduleUpdate();
      }, { passive: true });
    }

    _scheduleUpdate() {
      if (this.raf) return;
      this.raf = requestAnimationFrame(() => {
        this.raf = null;
        this._update();
      });
    }

    _getProgress() {
      const rect = this.el.getBoundingClientRect();
      const scrollable = this.el.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return 0;
      return clamp(-rect.top / scrollable, 0, 1);
    }

    _update() {
      const p = this._getProgress();
      if (Math.abs(p - this.lastProgress) < 0.0001) return;
      this.lastProgress = p;
      this._applyProgress(p);
    }

    _applyProgress(p) {
      // Timeline:
      // 0.00 – 0.48  Stage 1: images emerge from center, spread to edges, fade to nothing
      // 0.48 – 0.56  Gap: only background visible
      // 0.56 – 0.97  Stage 2: circle appears at center, slowly expands to full-screen
      // 0.97 – 1.00  Stage 2 held

      const s1 = easeInOut(norm(p, 0, 0.48));
      const s2 = easeInOut(norm(p, 0.56, 0.97));

      // ---- Images ----
      // Bell-curve opacity: 0 → peak at s1=0.5 → 0 at s1=1
      // Images spread from center to edge positions in sync with this arc.
      this.images.forEach((img, i) => {
        const off = this.offsets[i];
        if (!off) return;
        const tx = off.x * (1 - s1);
        const ty = off.y * (1 - s1);
        const scale = lerp(0.65, 1.04, s1);
        const alpha = Math.sin(s1 * Math.PI);
        img.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${scale.toFixed(3)})`;
        img.style.opacity = alpha.toFixed(3);
      });

      // ---- Stage 1 text: flashes in the center of the arc, gone before gap ----
      if (this.stage1) {
        // Visible from s1≈0.3 to s1≈0.75, tied to the image bell curve
        const alpha = clamp(s1 * 3.5, 0, 1) * clamp((1 - s1) * 4, 0, 1);
        const ty = lerp(14, 0, clamp(s1 * 3, 0, 1));
        this.stage1.style.opacity = alpha.toFixed(3);
        this.stage1.style.transform = `translateY(${ty.toFixed(2)}px)`;
      }

      // ---- Media wrapper: small circle → full-screen (slow, refined expansion) ----
      if (this.videoWrapper) {
        const scale = lerp(0.12, 1, s2);
        // Stay circular through 72% of the expansion, then collapse border-radius smoothly
        const radius = lerp(50, 0, easeInOut(norm(s2, 0.72, 1)));
        // Appear crisply at the start, then expand slowly
        const alpha = clamp(s2 * 4, 0, 1);

        this.videoWrapper.style.transform = `scale(${scale.toFixed(4)})`;
        this.videoWrapper.style.borderRadius = `${radius.toFixed(2)}%`;
        this.videoWrapper.style.opacity = alpha.toFixed(3);
        this.videoWrapper.style.pointerEvents = s2 > 0.92 ? 'auto' : 'none';
      }

      // ---- Video autoplay ----
      if (this.video) {
        if (s2 > 0.2 && this.video.paused) {
          this.video.play().catch(() => {});
        } else if (s2 <= 0.2 && !this.video.paused) {
          this.video.pause();
        }
      }

      // ---- Stage 2 content (fades in only once video is nearly full-screen) ----
      if (this.stage2Content) {
        const alpha2 = clamp((s2 - 0.72) / 0.28, 0, 1);
        const ty2 = lerp(18, 0, alpha2);
        this.stage2Content.style.opacity = alpha2.toFixed(3);
        this.stage2Content.style.transform = `translateY(${ty2.toFixed(2)}px)`;
      }
    }
  }

  function init() {
    document.querySelectorAll('.srm-section').forEach(el => new ScrollRevealMedia(el));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
