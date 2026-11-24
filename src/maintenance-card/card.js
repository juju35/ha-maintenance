import { pickerDefine } from "./card-picker.js";
import { MT_CARD_I18N } from "./i18n/mt-card-i18n.js";

export var MT_DEFAULTS = { rows: 5, illustration_theme: 'auto' };
export var MT_TONES = { overdue: 'bad', soon: 'warn', ok: 'ok', unavailable: 'idle' };

export var mtEsc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export var mtLang = (hass, config) => {
  var raw = String(config?.language || hass?.locale?.language || hass?.language || 'en');
  if (MT_CARD_I18N[raw]) return raw;
  var base = raw.split('-')[0];
  return MT_CARD_I18N[base] ? base : 'en';
};
export var mtFill = (text, values) => String(text).replace(/\{(\w+)\}/g, (m, k) => (values[k] == null ? m : values[k]));
// The "Overdue" sensor: the one carrying the `maintenance` attribute.
export var mtFind = (hass) => Object.keys(hass?.states || {}).find((id) => id.startsWith('sensor.') && hass.states[id]?.attributes?.maintenance);
// When it is due, in words: "Overdue by 5 d", "In 3 d", "In 7 months".
export var mtWhen = (item, t) => {
  var d = item.days_left;
  if (d == null) return '';
  if (d < 0) return mtFill(t.overdue_days, { n: -d });
  if (d === 0) return t.due_today;
  return d < 60 ? mtFill(t.in_days, { n: d }) : mtFill(t.in_months, { n: Math.round(d / 30) });
};
// The line under an item's name.
export var mtDetail = (item, t) => {
  if (item.status === 'unavailable') return t.unavailable;
  if (item.kind === 'task') {
    var every = mtFill(t[`every_${item.unit}`] || t.every_days, { n: item.every });
    return [mtWhen(item, t), every].filter(Boolean).join(' · ');
  }
  // A tank or a liquid only says whether it needs seeing to.
  if (item.state) return item.state === 'problem' ? t.attention : '';
  if (item.status === 'overdue' && !item.percent) return t.empty;
  var parts = [];
  if (item.percent != null) parts.push(mtFill(t.left_pct, { p: item.percent }));
  if (item.days_left != null) parts.push(mtFill(t.left_days, { n: item.days_left }));
  else if (item.hours != null) parts.push(mtFill(t.left_hours, { n: item.hours }));
  return parts.join(' · ');
};

// Patches the shadow DOM in place from the new markup: kept nodes keep their running animations, loaded icons and
// sizes, so a state update never rebuilds the card (a rebuilt <ha-card> has no height until its first update, and
// the dashboard jumped). Children with a `data-key` are matched by key, the others by position.
export var mtPatchAttrs = (cur, next) => {
  for (var { name } of [...cur.attributes]) if (!next.hasAttribute(name)) cur.removeAttribute(name);
  for (var { name: n, value } of next.attributes) if (cur.getAttribute(n) !== value) cur.setAttribute(n, value);
};
export var mtKey = (n) => (n.nodeType === 1 ? n.getAttribute('data-key') : null);
export var mtPatch = (cur, next) => {
  var old = [...cur.childNodes];
  var byKey = new Map();
  for (var o of old) if (mtKey(o) !== null && !byKey.has(mtKey(o))) byKey.set(mtKey(o), o);
  var used = new Set();
  var fresh = [...next.childNodes];
  fresh.forEach((n, i) => {
    var k = mtKey(n);
    var o = k !== null ? byKey.get(k) : old[i];
    if (!o || o.nodeType !== n.nodeType || o.nodeName !== n.nodeName || used.has(o) || (k === null && mtKey(o) !== null)) o = null;
    var ref = cur.childNodes[i] ?? null;
    if (!o) {
      cur.insertBefore(n, ref);
      return;
    }
    used.add(o);
    if (o !== ref) cur.insertBefore(o, ref);
    if (n.nodeType === 1) {
      mtPatchAttrs(o, n);
      mtPatch(o, n);
    } else if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue;
  });
  while (cur.childNodes.length > fresh.length) cur.removeChild(cur.lastChild);
};
export var mtMorph = (root, html) => {
  var tpl = document.createElement('template');
  tpl.innerHTML = html;
  mtPatch(root, tpl.content);
};

export class MaintenanceCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement('maintenance-card-editor');
  }

  static getStubConfig() {
    return {};
  }

  setConfig(config) {
    this._config = Object.assign({}, MT_DEFAULTS, config || {});
    if (this._hass) this._render();
  }

  // Only the card's own sensor, the theme and the language matter: any other update returns at once, without
  // scanning every entity (the sensor found is kept) nor touching the DOM. State objects are immutable in Home
  // Assistant, so an unchanged sensor is the same object.
  set hass(hass) {
    this._hass = hass;
    var id = this._config?.entity || (this._found && hass.states[this._found] ? this._found : (this._found = mtFind(hass)));
    var st = id ? hass.states[id] : undefined;
    var sig = [st, hass.themes?.darkMode, hass.locale?.language, hass.language, this._config];
    if (this._sig && sig.every((v, i) => v === this._sig[i])) return;
    this._sig = sig;
    this._render();
  }

  getCardSize() {
    return 2 + Math.min(Number(this._config?.rows) || 5, 10);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  _night() {
    var theme = this._config.illustration_theme;
    if (theme === 'day') return false;
    if (theme === 'night') return true;
    return !!this._hass?.themes?.darkMode;
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('click', (ev) => this._click(ev));
    }
    var lang = mtLang(this._hass, this._config);
    var t = Object.assign({}, MT_CARD_I18N.en, MT_CARD_I18N[lang]);
    var id = this._config.entity || mtFind(this._hass);
    var a = id ? this._hass.states[id]?.attributes : undefined;
    var tone = 'ok';
    var subtitle = '';
    var pill = '';
    var body;
    if (!a?.maintenance) {
      tone = 'idle';
      body = `<div class="empty">${mtEsc(t.not_found)}</div>`;
    } else {
      var counts = a.counts || {};
      var items = a.items || [];
      var overdue = Number(counts.overdue) || 0;
      tone = overdue ? 'bad' : counts.soon ? 'warn' : 'ok';
      var next = items.find((i) => i.status === 'overdue' || i.status === 'soon') || items.find((i) => i.status === 'ok');
      subtitle = [mtFill(t.tracked_n, { n: counts.tracked || 0 }), overdue ? mtFill(t.overdue_n, { n: overdue }) : '']
        .filter(Boolean)
        .join(' · ');
      if (!overdue && next) subtitle = mtFill(t.next, { name: next.name, when: mtWhen(next, t) || mtDetail(next, t) });
      var soon = Number(counts.soon) || 0;
      pill = overdue ? mtFill(t.overdue_n, { n: overdue }) : soon ? mtFill(t.soon_n, { n: soon }) : t.all_good;
      var rows = items.slice(0, Math.max(1, Number(this._config.rows) || 5));
      body = rows.length
        ? `<div class="list">${rows
            .map((i) => {
              var tn = MT_TONES[i.status] || 'ok';
              var done = i.status === 'overdue' || i.status === 'soon' ? `<button class="btn" type="button" data-done="${mtEsc(i.id)}">${mtEsc(t.done)}</button>` : '';
              return `<div class="row r-${tn}" data-key="${mtEsc(i.id)}"><span class="dot"><ha-icon icon="${mtEsc(i.icon || 'mdi:wrench')}"></ha-icon></span>
                <span class="txt"><span class="nm">${mtEsc(i.name)}</span><span class="sub">${mtEsc(mtDetail(i, t))}</span></span>
                <span class="chip">${mtEsc(i.source || t.manual)}</span>${done}</div>`;
            })
            .join('')}</div>`
        : `<div class="empty">${mtEsc(t.nothing)}</div>`;
    }
    var html = `<style>${MaintenanceCard.styles()}</style>
      <ha-card class="tone-${tone}${this._night() ? ' night' : ''}">
        <div class="banner">
          ${MaintenanceCard.scene(tone === 'bad')}
          <div class="ground"></div>
          <div class="head">
            <span class="ico"><ha-icon icon="mdi:wrench-clock"></ha-icon></span>
            <span class="htxt"><span class="title">${mtEsc(this._config.title || t.title)}</span>${subtitle ? `<span class="subtitle">${mtEsc(subtitle)}</span>` : ''}</span>
            ${pill ? `<span class="pill">${mtEsc(pill)}</span>` : ''}
          </div>
        </div>
        <div class="body">${body}</div>
      </ha-card>`;
    if (html === this._html) return;
    this._html = html;
    mtMorph(this.shadowRoot, html);
  }

  // The header's scene: a pegboard with a gear turning and a wrench (at work when something is overdue), a filter.
  static scene(busy) {
    return `<svg class="scene" viewBox="0 0 200 90" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <rect class="board" x="30" y="14" width="150" height="70" rx="6"/>
      <g class="holes">${[0, 1, 2, 3, 4, 5]
        .map((x) => [0, 1, 2].map((y) => `<circle cx="${44 + x * 24}" cy="${26 + y * 22}" r="1.6"/>`).join(''))
        .join('')}</g>
      <g class="gear"><path d="M74 33l4 0 1 5 4 2 4-3 3 3-3 4 2 4 5 1 0 4-5 1-2 4 3 4-3 3-4-3-4 2-1 5-4 0-1-5-4-2-4 3-3-3 3-4-2-4-5-1 0-4 5-1 2-4-3-4 3-3 4 3 4-2z"/><circle class="hub" cx="76" cy="50" r="5"/></g>
      <g class="wrench${busy ? ' busy' : ''}"><path d="M118 28a9 9 0 0 0-8 12l-14 26a4 4 0 0 0 7 4l14-26a9 9 0 0 0 11-10l-5 3-5-3 0-5z"/></g>
      <g class="filter"><rect x="140" y="34" width="26" height="36" rx="4"/><path d="M144 42h18M144 50h18M144 58h18"/></g>
    </svg>`;
  }

  async _click(ev) {
    var btn = ev.composedPath().find((n) => n?.dataset?.done);
    if (!btn) return;
    btn.disabled = true;
    try {
      await this._hass.callService('maintenance', 'done', { item: btn.dataset.done });
    } catch (_err) {
      btn.disabled = false;
    }
  }

  static styles() {
    return `
      :host { --mt-ok: var(--success-color, #43a047); --mt-warn: var(--warning-color, #f59e0b); --mt-bad: var(--error-color, #db4437);
              --mt-idle: var(--secondary-text-color, #727272); --mt-accent: #0d9488; }
      ha-card { overflow: hidden; container-type: inline-size; }
      ha-card.tone-ok { --c: var(--mt-accent); } ha-card.tone-warn { --c: var(--mt-warn); } ha-card.tone-bad { --c: var(--mt-bad); }
      ha-card.tone-idle { --c: var(--mt-idle); }
      .banner { position: relative; height: 90px; overflow: hidden; background: linear-gradient(#ccfbf1, #f0fdfa); }
      .night .banner { background: linear-gradient(#0c2626, #153838); }
      .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: #5eead4; }
      .night .ground { background: #2c6b66; }
      .scene { position: absolute; right: 14px; bottom: 6px; height: 44px; width: auto; max-width: 40%; }
      .board { fill: #fdf6e3; stroke: #e7d8b1; stroke-width: 2; } .holes circle { fill: #d6c49a; }
      .night .board { fill: #2b3a3a; stroke: #3f5656; } .night .holes circle { fill: #4f6a6a; }
      .gear path { fill: #5eead4; } .gear .hub { fill: #fdf6e3; } .night .gear path { fill: #2dd4bf; } .night .gear .hub { fill: #2b3a3a; }
      .wrench path { fill: #94a3b8; } .night .wrench path { fill: #cbd5e1; } .tone-bad .wrench path { fill: #ef4444; }
      .filter rect { fill: #fff; stroke: #5eead4; stroke-width: 2; } .filter path { stroke: #99f6e4; stroke-width: 2; }
      .tone-warn .filter rect, .tone-bad .filter rect { stroke: #f59e0b; } .tone-warn .filter path, .tone-bad .filter path { stroke: #fcd34d; }
      .night .filter rect { fill: #e6ebf3; }
      .gear { transform-box: fill-box; transform-origin: 50% 50%; animation: mt-spin 12s linear infinite; }
      .wrench { transform-box: fill-box; transform-origin: 80% 15%; }
      .wrench.busy { animation: mt-turn 1.5s ease-in-out infinite; }
      @keyframes mt-spin { to { transform: rotate(360deg); } }
      @keyframes mt-turn { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-24deg); } }
      @media (prefers-reduced-motion: reduce) { .gear, .wrench.busy { animation: none; } }
      .head { position: absolute; left: 16px; right: 16px; top: 16px; display: flex; align-items: flex-start; gap: 12px; }
      .ico { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
             background: color-mix(in srgb, var(--c) 18%, #fff); color: var(--c); --mdc-icon-size: 22px; }
      .night .ico { background: color-mix(in srgb, var(--c) 30%, #153838); }
      .htxt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .title { font-size: 16px; font-weight: 700; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .subtitle { font-size: 13px; color: #4b5563; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .night .title { color: #f3f4f6; } .night .subtitle { color: #cbd5e1; }
      .pill { flex: none; margin: 6px 0 0 auto; white-space: nowrap; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
              color: color-mix(in srgb, var(--c) 70%, #111); background: color-mix(in srgb, var(--c) 16%, #fff); }
      .night .pill { color: color-mix(in srgb, var(--c) 45%, #fff); background: color-mix(in srgb, var(--c) 25%, #153838); }
      .body { padding: 12px 16px 16px; }
      .list { display: flex; flex-direction: column; gap: 6px; }
      .row { --c: var(--mt-ok); display: flex; align-items: center; gap: 10px; min-width: 0; padding: 8px 10px; border-radius: 12px;
             background: var(--secondary-background-color, rgba(127,127,127,.08)); }
      .row.r-bad { --c: var(--mt-bad); background: color-mix(in srgb, var(--mt-bad) 9%, var(--secondary-background-color, transparent)); }
      .row.r-warn { --c: var(--mt-warn); }
      /* An unavailable consumable: kept in the list, greyed out. */
      .row.r-idle { --c: var(--mt-idle); } .row.r-idle .dot, .row.r-idle .txt { opacity: .6; }
      .dot { flex: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; --mdc-icon-size: 17px;
             background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
      .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .nm { font-size: 14px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub { font-size: 12px; font-variant-numeric: tabular-nums; color: color-mix(in srgb, var(--c) 70%, var(--primary-text-color)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .r-ok .sub { color: var(--secondary-text-color); }
      .chip { flex: none; max-width: 28%; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
              color: var(--secondary-text-color); background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent); }
      .btn { flex: none; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; padding: 5px 12px; border-radius: 999px;
             color: var(--primary-text-color); background: transparent; border: 1px solid var(--divider-color, rgba(127,127,127,.35)); }
      .btn:hover { background: color-mix(in srgb, var(--secondary-text-color) 10%, transparent); }
      .btn:focus-visible { outline: 2px solid var(--mt-accent); outline-offset: 2px; }
      .btn[disabled] { opacity: .5; cursor: default; }
      .empty { padding: 10px 2px; font-size: 13px; color: var(--secondary-text-color); }
      /* Narrow cards (~300 px): the source chip gives its room to the name and the Done button. */
      @container (max-width: 340px) { .chip { display: none; } }
    `;
  }
}

export class MaintenanceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  set hass(hass) {
    var first = !this._hass;
    this._hass = hass;
    if (first) this._render();
    else if (this._form) this._form.hass = hass;
  }

  _t() {
    return Object.assign({}, MT_CARD_I18N.en, MT_CARD_I18N[mtLang(this._hass, this._config)]);
  }

  // The form is built once; a hass update only hands it the new hass (the schema is not rebuilt each time).
  _render() {
    if (!this._hass || !this._config) return;
    var t = this._t();
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => this._t()[`ed_${s.name}`] || s.name;
      this._form.addEventListener('value-changed', (ev) => {
        var value = Object.assign({}, ev.detail.value);
        for (var key of Object.keys(value)) if (value[key] === '' || value[key] == null || value[key] === MT_DEFAULTS[key]) delete value[key];
        this._config = Object.assign({ type: this._config.type }, value);
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = Object.assign({}, MT_DEFAULTS, this._config);
    this._form.schema = [
      { name: 'entity', selector: { entity: { domain: 'sensor', integration: 'maintenance' } } },
      { name: 'title', selector: { text: {} } },
      { name: 'rows', selector: { number: { min: 1, max: 10, mode: 'box' } } },
      {
        name: 'illustration_theme',
        selector: { select: { mode: 'dropdown', options: ['auto', 'day', 'night'].map((v) => ({ value: v, label: t[`th_${v}`] })) } },
      },
      { name: 'language', selector: { select: { mode: 'dropdown', options: Object.keys(MT_CARD_I18N).map((l) => ({ value: l, label: l })) } } },
    ];
  }
}

if (!customElements.get('maintenance-card')) pickerDefine('maintenance-card', MaintenanceCard);
if (!customElements.get('maintenance-card-editor')) pickerDefine('maintenance-card-editor', MaintenanceCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'maintenance-card')) {
  var mtT = Object.assign({}, MT_CARD_I18N.en, MT_CARD_I18N[mtLang(document.querySelector('home-assistant')?.hass, {})]);
  window.customCards.push({ type: 'maintenance-card', name: mtT.card_name, description: mtT.card_desc, preview: true });
}
