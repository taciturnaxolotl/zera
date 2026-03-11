class RelativeTimeElement extends HTMLElement {
  static get observedAttributes() {
    return ['datetime', 'threshold', 'prefix', 'format'];
  }

  connectedCallback() {
    this.update();
  }

  disconnectedCallback() {
    this.stopTimer();
  }

  attributeChangedCallback() {
    this.update();
  }

  scheduleUpdate(ms) {
    this.stopTimer();
    this.timer = setTimeout(() => this.update(), ms);
  }

  stopTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  get datetime() {
    return this.getAttribute('datetime') || '';
  }

  get threshold() {
    return this.getAttribute('threshold') || 'P14D';
  }

  get prefix() {
    return this.getAttribute('prefix') || 'on';
  }

  get format() {
    return this.getAttribute('format') || 'relative';
  }

  parseThreshold(iso) {
    const match = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const days = parseInt(match[1] || 0, 10);
    const hours = parseInt(match[2] || 0, 10);
    const minutes = parseInt(match[3] || 0, 10);
    const seconds = parseInt(match[4] || 0, 10);
    return ((days * 24 + hours) * 60 + minutes) * 60 * 1000 + seconds * 1000;
  }

  update() {
    const datetime = this.datetime;
    if (!datetime) return;

    const date = new Date(datetime);
    if (isNaN(date.getTime())) return;

    const now = Date.now();
    const diff = now - date.getTime();
    const absDiff = Math.abs(diff);
    const thresholdMs = this.parseThreshold(this.threshold);

    if (this.format === 'datetime' || absDiff > thresholdMs) {
      this.textContent = this.formatDatetime(date);
      this.scheduleUpdate(3600000);
    } else {
      this.textContent = this.formatRelative(diff);
      const delay = this.getNextUpdateDelay(absDiff);
      if (delay !== null) this.scheduleUpdate(delay);
    }
  }

  getNextUpdateDelay(absDiff) {
    const seconds = Math.floor(absDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return 1000;
    } else if (minutes < 60) {
      return 60000;
    } else if (hours < 24) {
      return 60000 * 5;
    } else if (days < 7) {
      return 3600000;
    } else if (days < 30) {
      return 3600000 * 6;
    } else {
      return null;
    }
  }

  getRtf() {
    if (!this._rtf || this._rtfLang !== navigator.language) {
      this._rtfLang = navigator.language;
      this._rtf = new Intl.RelativeTimeFormat(navigator.language, {
        numeric: 'auto',
        style: 'long'
      });
    }
    return this._rtf;
  }

  formatRelative(diff) {
    const rtf = this.getRtf();

    const absDiff = Math.abs(diff);
    const sign = diff > 0 ? -1 : 1;
    const seconds = Math.floor(absDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const date = new Date(Date.now() - diff);
    const now = new Date();
    const months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    const years = Math.floor(Math.abs(months) / 12) * sign;

    if (seconds < 60) {
      return rtf.format(sign * seconds, 'second');
    } else if (minutes < 60) {
      return rtf.format(sign * minutes, 'minute');
    } else if (hours < 24) {
      return rtf.format(sign * hours, 'hour');
    } else if (days < 30) {
      return rtf.format(sign * days, 'day');
    } else if (Math.abs(months) < 12) {
      return rtf.format(months, 'month');
    } else {
      return rtf.format(years, 'year');
    }
  }

  formatDatetime(date) {
    const now = new Date();
    const sameYear = date.getFullYear() === now.getFullYear();
    
    const options = {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' })
    };

    const prefix = this.prefix;
    const formatted = new Intl.DateTimeFormat(navigator.language, options).format(date);
    return prefix ? `${prefix} ${formatted}` : formatted;
  }
}

customElements.define('relative-time', RelativeTimeElement);
