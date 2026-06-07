if (!customElements.get('countdown-timer-evergreen')) {
  class HookthemeCountdownEvergreen extends HTMLElement {
    connectedCallback() {
      this.container = this.querySelector('.countdown-block__inner');
      if (!this.container) return;

      const durationMs = parseInt(this.getAttribute('data-duration-ms'), 10);
      const blockId = this.getAttribute('data-block-id');

      if (!durationMs || durationMs <= 0) return;

      const storageKey = `countdown-evergreen-${blockId}-${durationMs}`;
      let endTime = sessionStorage.getItem(storageKey);

      if (!endTime || parseInt(endTime, 10) <= Date.now()) {
        endTime = Date.now() + durationMs;
        sessionStorage.setItem(storageKey, endTime);
      } else {
        endTime = parseInt(endTime, 10);
      }

      this.endTime = endTime;
      this.runCountdown();
    }

    runCountdown() {
      const tick = () => {
        const timeDistance = this.endTime - Date.now();

        if (timeDistance <= 0) {
          this.renderTime(0, 0, 0, 0);
          clearInterval(this.interval);
          return;
        }

        const second = 1000;
        const minute = second * 60;
        const hour = minute * 60;
        const day = hour * 24;

        const days = Math.floor(timeDistance / day);
        const hours = Math.floor((timeDistance % day) / hour);
        const minutes = Math.floor((timeDistance % hour) / minute);
        const seconds = Math.floor((timeDistance % minute) / second);

        this.renderTime(days, hours, minutes, seconds);
      };

      tick();
      this.interval = setInterval(tick, 1000);
    }

    renderTime(days, hours, minutes, seconds) {
      const innerClasses = this.getAttribute('data-inner-classes') || '';
      const innerStyle = this.getAttribute('data-inner-style') || '';
      const labelDays = this.getAttribute('data-label-days') || 'Days';
      const labelHours = this.getAttribute('data-label-hours') || 'Hrs';
      const labelMinutes = this.getAttribute('data-label-minutes') || 'Min';
      const labelSeconds = this.getAttribute('data-label-seconds') || 'Sec';

      const pad = (n) => (n < 10 ? '0' + n : String(n));

      const item = (value, cssClass, label) =>
        `<div class="countdown__item ${cssClass}"><span class="countdown__number">${pad(value)}</span><span class="countdown__text">${label}</span></div>`;

      this.container.className = `countdown-block__inner ${innerClasses}`.trim();
      this.container.setAttribute('style', innerStyle);
      this.container.innerHTML =
        item(days, 'Days', labelDays) +
        item(hours, 'Hrs', labelHours) +
        item(minutes, 'Min', labelMinutes) +
        item(seconds, 'Sec', labelSeconds);
    }

    disconnectedCallback() {
      if (this.interval) clearInterval(this.interval);
    }
  }

  customElements.define('countdown-timer-evergreen', HookthemeCountdownEvergreen);
}
