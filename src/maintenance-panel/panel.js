// ── End of the folded top bar ──
import { MAINTENANCE_PANEL_VERSION, MTP_BLANK, MTP_CATEGORIES, MTP_TABS, MTP_TONE, mtpDeviceIcon, mtpEsc, mtpFill, mtpSync } from "./core.js";
import { maintenancePanelFold } from "./fold.js";
import { MT_PANEL_I18N } from "./i18n/mt-panel-i18n.js";

export class MaintenancePanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = null;
    this._draft = {};
    this._filter = 'all';
    this._form = null;
    var tab = new URLSearchParams(location.search).get('tab');
    this._tab = MTP_TABS.includes(tab) ? tab : 'due';
    this.shadowRoot.addEventListener('click', (ev) => this._click(ev));
    this.shadowRoot.addEventListener('change', (ev) => this._change(ev));
    this.shadowRoot.addEventListener('input', (ev) => this._input(ev));
  }

  // Reloads when the integration's sensor changes (the sensor found is kept: no scan of every entity on each
  // update); redraws only when the theme or the language changes. Any other update just reaches the menu button.
  set hass(hass) {
    var first = !this._hass;
    this._hass = hass;
    if (!this._sensor || !hass.states[this._sensor]) {
      this._sensor = Object.keys(hass.states).find((k) => k.startsWith('sensor.') && hass.states[k]?.attributes?.maintenance);
    }
    var stamp = this._sensor ? hass.states[this._sensor].last_updated : '';
    var look = `${!!hass.themes?.darkMode}|${hass.locale?.language || hass.language}`;
    if (first || stamp !== this._stamp) {
      this._stamp = stamp;
      this._look = look;
      this._load();
    } else if (look !== this._look) {
      this._look = look;
      this._render();
    } else {
      var menu = this.shadowRoot.querySelector('ha-menu-button');
      if (menu) menu.hass = hass;
    }
  }

  set narrow(value) {
    this._narrow = value;
    this._render();
  }

  connectedCallback() {
    this._timer = setInterval(() => this._form || this._load(), 60000);
    if (this._hass && this._box) this._render();
  }

  disconnectedCallback() {
    clearInterval(this._timer);
    this._fold?.detach();
    this._fold = null;
    this._foldTop = null;
  }

  _t() {
    var raw = String(this._hass?.locale?.language || this._hass?.language || 'en');
    var lang = MT_PANEL_I18N[raw] ? raw : MT_PANEL_I18N[raw.split('-')[0]] ? raw.split('-')[0] : 'en';
    return Object.assign({}, MT_PANEL_I18N.en, MT_PANEL_I18N[lang]);
  }

  async _load() {
    if (!this._hass) return;
    try {
      this._data = await this._hass.callWS({ type: 'maintenance/state' });
      this._error = '';
    } catch (err) {
      this._error = err?.message || String(err);
    }
    this._render();
  }

  _options() {
    return Object.assign({}, this._data?.options || {}, this._draft);
  }

  _setTab(tab) {
    this._tab = tab;
    this._draft = {};
    this._form = null;
    this._filter = 'all';
    var url = new URL(location.href);
    url.searchParams.set('tab', tab);
    history.replaceState(history.state, '', url);
    this._render();
  }

  async _ws(message, done) {
    try {
      await this._hass.callWS(message);
      this._toast = done;
    } catch (err) {
      this._toast = `${this._t().error}: ${err?.message || err}`;
    }
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this._toast = '';
      this._render();
    }, 2500);
    await this._load();
  }

  _click(ev) {
    var el = ev.composedPath().find((n) => n?.dataset?.act);
    if (!el) return;
    var t = this._t();
    var act = el.dataset.act;
    if (act === 'tab') this._setTab(el.dataset.tab);
    else if (act === 'filter') {
      this._filter = el.dataset.filter;
      this._render();
    } else if (act === 'done') this._ws({ type: 'maintenance/done', item: el.dataset.item }, t.saved);
    else if (act === 'new') {
      this._form = Object.assign({}, MTP_BLANK);
      this._render();
    } else if (act === 'edit') {
      var task = (this._data?.tasks || []).find((x) => `task:${x.id}` === el.dataset.item);
      this._form = task ? Object.assign({}, task) : null;
      this._render();
    } else if (act === 'cancel') {
      this._form = null;
      this._render();
    } else if (act === 'save-task') {
      var form = this._form;
      if (!form?.name?.trim()) return;
      this._form = null;
      var payload = { name: form.name.trim(), every: Number(form.every) || 1, unit: form.unit, category: form.category };
      if (form.id) payload.id = form.id;
      if (form.last_done) payload.last_done = form.last_done;
      var icon = String(form.icon || '').trim();
      if (/^[a-z0-9-]+:[a-z0-9-]+$/.test(icon)) payload.icon = icon;
      this._ws({ type: 'maintenance/task', task: payload }, t.saved);
    } else if (act === 'delete') {
      var id = this._form?.id;
      this._form = null;
      if (id) this._ws({ type: 'maintenance/delete_task', task: id }, t.saved);
    } else if (act === 'remind') this._ws({ type: 'maintenance/remind' }, t.sent);
    else if (act === 'save') {
      var draft = this._draft;
      this._draft = {};
      this._ws({ type: 'maintenance/save', options: draft }, t.saved);
    }
  }

  _input(ev) {
    var field = ev.target?.dataset?.field;
    if (field && this._form) this._form[field] = ev.target.value;
  }

  _change(ev) {
    var el = ev.target;
    if (el?.dataset?.field && this._form) {
      this._form[el.dataset.field] = el.value;
      return;
    }
    if (el?.dataset?.track) {
      var ignored = new Set(this._options().ignored || []);
      if (el.checked) ignored.delete(el.dataset.track);
      else ignored.add(el.dataset.track);
      this._ws({ type: 'maintenance/save', options: { ignored: [...ignored] } }, this._t().saved);
      return;
    }
    var key = el?.dataset?.key;
    if (!key) return;
    this._draft[key] = el.type === 'number' ? Number(el.value) : el.value || null;
    this._render();
  }

  // An item's line: when it is due or how much is left, and how often.
  _line(item, t) {
    if (item.status === 'unavailable') return t.unavailable;
    var d = item.days_left;
    var when = d == null ? '' : d < 0 ? mtpFill(t.overdue_days, { n: -d }) : d === 0 ? t.due_today : d < 60 ? mtpFill(t.in_days, { n: d }) : mtpFill(t.in_months, { n: Math.round(d / 30) });
    if (item.state) return item.state === 'problem' ? t.attention : '';
    if (item.kind === 'task') return `${when} · ${mtpFill(t[`every_${item.unit}`] || t.every_days, { n: item.every })}`;
    var left = item.percent != null ? mtpFill(t.left_pct, { p: item.percent }) : '';
    var pace = d != null ? mtpFill(t.left_days, { n: d }) : item.hours != null ? mtpFill(t.left_hours, { n: item.hours }) : '';
    return item.value <= 0 ? t.empty : [left, pace].filter(Boolean).join(' · ');
  }

  /** The top bar folds on scroll into one bar with the tabs as icon pills (see maintenancePanelFold). */
  _attachFold() {
    this._fold?.detach();
    this._fold = maintenancePanelFold(this, {
      top: ".top",
      tabs: ".tabbar",
      tab: ".tab",
      key: (b) => b.dataset.tab,
      icons: { due: "mdi:clipboard-check-outline", calendar: "mdi:calendar-month-outline", history: "mdi:history", settings: "mdi:cog" },
      badge: ".cnt",
      name: ".top .title",
      sub: ".top .subtitle",
      icon: ".top .ico",
      status: ".top .pill",
      acts: ".top .round",
      accent: "#0d9488",
      mount: this._box,
      css: ":host([pf-folded]) .top, :host([pf-folded]) .tabbar { display:none !important; }",
      menu: () => ({ hass: this._hass, narrow: this._narrow, show: Boolean(this._narrow) }),
    });
  }

  _render() {
    if (!this._hass) return;
    var t = this._t();
    var d = this._data;
    var counts = d?.counts || {};
    var tone = counts.overdue ? 'bad' : counts.soon ? 'warn' : 'ok';
    var found = (d?.items || []).filter((i) => i.kind === 'consumable').length;
    var subtitle = d ? mtpFill(t.subtitle, { n: counts.tracked || 0, a: found, b: (d.tasks || []).length }) : '';
    var body = !d ? `<div class="empty">${mtpEsc(this._error || '…')}</div>` : this[`_${this._tab}`](d, t);
    var dark = !!this._hass.themes?.darkMode;
    var pill = counts.overdue
      ? mtpFill(t.overdue_n, { n: counts.overdue })
      : counts.soon
        ? mtpFill(t.soon_n, { n: counts.soon })
        : t.all_good;
    // The top bar hidden (option hide_header, as on the other ha-* panels): the tabs stay, with the menu button at
    // their left and the round button at their right.
    var mode = d?.options?.hide_header || 'off';
    var bare = mode === 'all' || (mode === 'non_admin' && this._hass.user?.is_admin === false);
    var menuButton = this._narrow ? '<ha-menu-button class="menu"></ha-menu-button>' : '';
    var add = `<button class="round" type="button" data-act="new" title="${mtpEsc(t.add_task)}" aria-label="${mtpEsc(t.add_task)}"><ha-icon icon="mdi:plus"></ha-icon></button>`;
    var html = `<style>${MaintenancePanel.styles()}</style>
      <div class="page tone-${tone}${dark ? ' night' : ''}${bare ? ' bare' : ''}">
        ${bare ? '' : `<header class="top">
          ${MaintenancePanel.scene(tone === 'bad')}
          <div class="ground"></div>
          <div class="bar">
            ${menuButton}
            <span class="ico"><ha-icon icon="mdi:wrench-clock"></ha-icon></span>
            <span class="htxt"><span class="trow"><span class="title">${mtpEsc(t.title)}</span>${d ? `<span class="pill">${mtpEsc(pill)}</span>` : ''}</span><span class="subtitle">${mtpEsc(subtitle)}</span></span>
            ${add}
          </div>
        </header>`}
        <div class="tabbar">${bare ? menuButton : ''}<nav class="tabs" role="tablist">${MTP_TABS.map((tab) => `<button type="button" role="tab" class="tab${tab === this._tab ? ' on' : ''}" aria-selected="${tab === this._tab}" data-act="tab" data-tab="${tab}">${mtpEsc(t[`tab_${tab}`])}</button>`).join('')}</nav>${bare ? `<span class="tb-side">${add}</span>` : ''}</div>
        <main class="wrap" data-key="tab-${this._tab}">${this._form ? this._editor(t) : ''}${body}</main>
        ${this._toast ? `<div class="toast">${mtpEsc(this._toast)}</div>` : ''}
      </div>`;
    if (html !== this._html) {
      this._html = html;
      var tpl = document.createElement('template');
      tpl.innerHTML = html;
      // Drawn into a box of its own: the folded top bar stays beside it, out of the diff
      if (!this._box) {
        this._box = document.createElement('div');
        this._box.className = 'mt-box';
        this.shadowRoot.append(this._box);
      }
      mtpSync(this._box, tpl.content, this.shadowRoot.activeElement);
    }
    // The top bar folds on scroll; set up again when the top bar comes back (option Hide the top bar)
    var top = this.shadowRoot.querySelector('.top');
    if (top !== this._foldTop) {
      this._foldTop = top;
      this._attachFold();
    }
    var menu = this.shadowRoot.querySelector('ha-menu-button');
    if (menu) {
      menu.hass = this._hass;
      menu.narrow = this._narrow;
    }
  }

  static scene(busy) {
    var holes = [];
    for (var x = 0; x < 8; x++) for (var y = 0; y < 3; y++) holes.push(`<circle cx="${30 + x * 26}" cy="${26 + y * 24}" r="2"/>`);
    return `<svg class="scene" viewBox="0 0 240 110" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <rect class="board" x="14" y="12" width="212" height="92" rx="8"/><g class="holes">${holes.join('')}</g>
      <g class="gear"><path d="M66 36l5 0 1 6 5 2 5-4 4 4-4 5 2 5 6 1 0 5-6 1-2 5 4 5-4 4-5-4-5 2-1 6-5 0-1-6-5-2-5 4-4-4 4-5-2-5-6-1 0-5 6-1 2-5-4-5 4-4 5 4 5-2z"/><circle class="hub" cx="68.5" cy="58.5" r="6"/></g>
      <g class="wrench${busy ? ' busy' : ''}"><path d="M134 30a11 11 0 0 0-10 15l-18 32a5 5 0 0 0 9 5l18-32a11 11 0 0 0 13-12l-6 4-6-4 0-6z"/></g>
      <g class="filter"><rect x="170" y="36" width="34" height="48" rx="5"/><path d="M175 47h24M175 58h24M175 69h24"/></g>
    </svg>`;
  }

  _row(item, t, todo) {
    var tone = MTP_TONE[item.status] || 'ok';
    var tag = item.kind === 'task' ? t.manual : item.device || item.source || '—';
    var actions = [
      item.kind === 'task' ? `<button class="btn ghost" type="button" data-act="edit" data-item="${mtpEsc(item.id)}">${mtpEsc(t.edit)}</button>` : '',
      todo ? `<button class="btn" type="button" data-act="done" data-item="${mtpEsc(item.id)}">${mtpEsc(t.done)}</button>` : '',
    ].join('');
    return `<div class="row r-${tone}" data-key="${mtpEsc(item.id)}"><span class="dot"><ha-icon icon="${mtpEsc(item.icon || 'mdi:wrench')}"></ha-icon></span>
      <span class="txt"><span class="nm">${mtpEsc(item.short || item.name)}</span><span class="sub">${mtpEsc(this._line(item, t))}</span></span>
      <span class="tag" title="${mtpEsc(item.source || '')}"><ha-icon icon="${mtpEsc(mtpDeviceIcon(item))}"></ha-icon><span class="tagt">${mtpEsc(tag)}</span></span><span class="acts">${actions}</span></div>`;
  }

  // What is up to date, by device (the manual tasks together): a card each, a compact line and a gauge per item.
  _devices(list, t) {
    var groups = new Map();
    for (var i of list) {
      // By device id: two devices with the same name stay apart.
      var key = i.kind === 'task' ? '\u0000tasks' : i.device_id || i.device || `\u0000${i.source || 'other'}`;
      if (!groups.has(key)) groups.set(key, { key, name: i.kind === 'task' ? t.f_tasks : i.device || i.source || t.cat_other, tag: i.kind === 'task' ? '' : i.source, icon: mtpDeviceIcon(i), items: [] });
      groups.get(key).items.push(i);
    }
    var gauge = (i) => (i.percent != null ? `<span class="gauge"><span style="width:${Math.max(2, Math.min(100, i.percent))}%"></span></span>` : '');
    var line = (i) => `<div class="cline" data-key="${mtpEsc(i.id)}"><span class="dot"><ha-icon icon="${mtpEsc(i.icon || 'mdi:wrench')}"></ha-icon></span>
      <span class="txt"><span class="nm">${mtpEsc(i.short || i.name)}</span><span class="sub">${mtpEsc(this._line(i, t))}</span>${gauge(i)}</span>
      ${i.kind === 'task' ? `<span class="acts"><button class="btn ghost" type="button" data-act="edit" data-item="${mtpEsc(i.id)}">${mtpEsc(t.edit)}</button></span>` : ''}</div>`;
    return `<div class="dgrid">${[...groups.values()].map((g) => `<section class="dcard" data-key="dev-${mtpEsc(g.key)}"><div class="dhead"><span class="dico"><ha-icon icon="${mtpEsc(g.icon)}"></ha-icon></span><span class="gname">${mtpEsc(g.name)}</span>
      ${g.tag && g.tag !== g.name ? `<span class="tag dtag">${mtpEsc(g.tag)}</span>` : ''}<span class="grow"></span><span class="gcount">${g.items.length}</span></div>${g.items.map(line).join('')}</section>`).join('')}</div>`;
  }

  _due(d, t) {
    var c = d.counts || {};
    var o = this._options();
    var tiles = [
      [c.overdue, t.c_overdue, c.overdue ? 'bad' : ''],
      [c.soon, `${t.c_soon} (${mtpFill(t.soon_hint, { d: o.soon_days ?? 14, p: o.soon_percent ?? 15 })})`, c.soon ? 'warn' : ''],
      [c.ok, t.c_ok, ''],
      [c.done_month, t.c_done_month, ''],
    ];
    var cats = MTP_CATEGORIES.filter((k) => (d.items || []).some((i) => i.category === k));
    var filters = ['all', 'consumables', 'tasks', ...cats];
    var label = (f) => t[`f_${f}`] || t[`cat_${f}`];
    var keep = (i) =>
      this._filter === 'all' ||
      (this._filter === 'consumables' ? i.kind === 'consumable' : this._filter === 'tasks' ? i.kind === 'task' : i.category === this._filter);
    var items = (d.items || []).filter(keep);
    var todo = items.filter((i) => i.status === 'overdue' || i.status === 'soon');
    var fine = items.filter((i) => i.status === 'ok');
    var gone = items.filter((i) => i.status === 'unavailable');
    var group = (title, list, isTodo) => (list.length ? `<h2>${mtpEsc(title)}</h2><div class="list">${list.map((i) => this._row(i, t, isTodo)).join('')}</div>` : '');
    return `<div class="tiles">${tiles.map(([n, k, cls]) => `<div class="tile${cls ? ` t-${cls}` : ''}"><span class="n">${mtpEsc(n ?? 0)}</span><span class="k">${mtpEsc(k)}</span></div>`).join('')}</div>
      <div class="chips">${filters.map((f) => `<button type="button" class="chip${f === this._filter ? ' on' : ''}" data-act="filter" data-filter="${f}">${mtpEsc(label(f))}</button>`).join('')}</div>
      ${items.length ? group(t.g_todo, todo, true) + (fine.length ? `<h2>${mtpEsc(t.g_ok)}</h2>${this._devices(fine, t)}` : '') + group(t.unavailable, gone, false) : `<div class="empty">${mtpEsc(t.nothing)}</div>`}`;
  }

  _editor(t) {
    var f = this._form;
    var opt = (value, text, current) => `<option value="${value}"${String(value) === String(current) ? ' selected' : ''}>${mtpEsc(text)}</option>`;
    return `<section class="card form editor" data-key="editor-${mtpEsc(f.id || 'new')}"><h2>${mtpEsc(f.id ? t.edit : t.add_task)}</h2>
      <div class="grid4">
        <label class="field wide"><span>${mtpEsc(t.f_name)}</span><input type="text" maxlength="80" data-field="name" value="${mtpEsc(f.name)}"></label>
        <label class="field"><span>${mtpEsc(t.f_every)}</span><input type="number" min="1" max="999" data-field="every" value="${mtpEsc(f.every)}"></label>
        <label class="field"><span>${mtpEsc(t.f_unit)}</span><select data-field="unit">${['days', 'weeks', 'months'].map((u) => opt(u, t[`u_${u}`], f.unit)).join('')}</select></label>
        <label class="field"><span>${mtpEsc(t.f_category)}</span><select data-field="category">${MTP_CATEGORIES.map((k) => opt(k, t[`cat_${k}`], f.category)).join('')}</select></label>
        <label class="field"><span>${mtpEsc(t.f_last)}</span><input type="date" data-field="last_done" value="${mtpEsc(f.last_done || '')}"></label>
        <label class="field"><span>${mtpEsc(t.f_icon)}</span><input type="text" maxlength="60" placeholder="mdi:wrench" data-field="icon" value="${mtpEsc(f.icon || '')}"></label>
      </div>
      <div class="actions">${f.id ? `<button class="btn danger" type="button" data-act="delete">${mtpEsc(t.delete)}</button>` : ''}<span class="grow"></span>
        <button class="btn ghost" type="button" data-act="cancel">${mtpEsc(t.cancel)}</button>
        <button class="btn primary" type="button" data-act="save-task">${mtpEsc(t.save)}</button></div></section>`;
  }

  _calendar(d, t) {
    var lang = this._hass.locale?.language || 'en';
    var today = new Date(Date.now());
    var dated = (d.items || []).filter((i) => i.days_left != null && i.days_left <= 30).sort((a, b) => a.days_left - b.days_left);
    var week = dated.filter((i) => i.days_left >= 0 && i.days_left <= 7).length;
    var marks = dated
      .map((i) => {
        var at = Math.max(0, Math.min(30, i.days_left)) / 30;
        return `<span class="mark m-${MTP_TONE[i.status]}" style="left:${(at * 100).toFixed(2)}%" title="${mtpEsc(i.name)}"></span>`;
      })
      .join('');
    var day = (n) => {
      var when = new Date(today.getTime() + Math.max(0, n) * 86400000);
      try {
        return when.toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' });
      } catch (_err) {
        return when.toDateString();
      }
    };
    var tiles = [
      [d.counts?.overdue, t.c_overdue, d.counts?.overdue ? 'bad' : ''],
      [week, t.cal_list, week ? 'warn' : ''],
      [dated.length, t.cal_next30, ''],
    ];
    return `<div class="tiles t3">${tiles.map(([n, k, cls]) => `<div class="tile${cls ? ` t-${cls}` : ''}"><span class="n">${mtpEsc(n ?? 0)}</span><span class="k">${mtpEsc(k)}</span></div>`).join('')}</div>
      <section class="card"><h2>${mtpEsc(t.cal_next30)}</h2>
        <div class="line"><span class="track"></span>${marks}</div>
        <div class="scale"><span>${mtpEsc(t.today)}</span><span>+15</span><span>+30</span></div></section>
      <h2>${mtpEsc(t.cal_list)}</h2>
      ${dated.length ? `<div class="list">${dated.map((i) => `<div class="row r-${MTP_TONE[i.status]}"><span class="date">${mtpEsc(day(i.days_left))}</span><span class="dot"><ha-icon icon="${mtpEsc(i.icon || 'mdi:wrench')}"></ha-icon></span><span class="txt"><span class="nm">${mtpEsc(i.name)}</span><span class="sub">${mtpEsc(this._line(i, t))}</span></span><span class="acts"><button class="btn" type="button" data-act="done" data-item="${mtpEsc(i.id)}">${mtpEsc(t.done)}</button></span></div>`).join('')}</div>` : `<div class="empty">${mtpEsc(t.no_due)}</div>`}`;
  }

  _history(d, t) {
    var lang = this._hass.locale?.language || 'en';
    var rows = (d.history || []).map((h) => {
      var when;
      try {
        when = new Date(h.time).toLocaleString(lang, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch (_err) {
        when = h.time;
      }
      return `<div class="row r-ok"><span class="dot"><ha-icon icon="${h.kind === 'task' ? 'mdi:check' : 'mdi:autorenew'}"></ha-icon></span>
        <span class="txt"><span class="nm">${mtpEsc(h.name)}</span><span class="sub">${mtpEsc([when, h.by ? mtpFill(t.h_by, { who: h.by }) : ''].filter(Boolean).join(' · '))}</span></span>
        <span class="tag">${mtpEsc(h.kind === 'task' ? t.f_tasks : t.f_consumables)}</span></div>`;
    });
    return rows.length ? `<div class="list">${rows.join('')}</div>` : `<div class="empty">${mtpEsc(t.h_empty)}</div>`;
  }

  _settings(d, t) {
    var o = this._options();
    var dirty = Object.keys(this._draft).length > 0;
    var found = (d.found || [])
      .map((f) => `<label class="check"><input type="checkbox" data-track="${mtpEsc(f.entity_id)}"${f.ignored ? '' : ' checked'}><span class="txt"><span class="nm">${mtpEsc(f.name)}</span><span class="sub">${mtpEsc([f.source, t[`cat_${f.category}`]].filter(Boolean).join(' · '))}</span></span></label>`)
      .join('');
    return `<div class="cols"><section class="col"><h2>${mtpEsc(t.s_thresholds)}</h2><div class="card form">
        <label class="field"><span>${mtpEsc(t.s_soon_days)}</span><input type="number" min="0" max="365" data-key="soon_days" value="${mtpEsc(o.soon_days ?? 14)}"></label>
        <label class="field"><span>${mtpEsc(t.s_soon_percent)}</span><input type="number" min="0" max="100" data-key="soon_percent" value="${mtpEsc(o.soon_percent ?? 15)}"></label>
        <h2>${mtpEsc(t.s_reminders)}</h2>
        <label class="field"><span>${mtpEsc(t.s_time)}</span><input type="time" data-key="reminder_time" value="${mtpEsc(o.reminder_time || '09:00')}"></label>
        <label class="field"><span>${mtpEsc(t.s_service)}</span><select data-key="notify_service"><option value="">${mtpEsc(t.s_none)}</option>${(d.services || []).map((s) => `<option value="${mtpEsc(s)}"${s === o.notify_service ? ' selected' : ''}>${mtpEsc(s)}</option>`).join('')}</select></label>
        <h2>${mtpEsc(t.s_panel)}</h2>
        <label class="field"><span>${mtpEsc(t.settings_hide_header)}</span><select data-key="hide_header">${['off', 'all', 'non_admin'].map((v) => `<option value="${v}"${v === (o.hide_header || 'off') ? ' selected' : ''}>${mtpEsc(t[`hide_header_${v}`])}</option>`).join('')}</select><small class="hint">${mtpEsc(t.settings_hide_header_hint)}</small></label>
        <div class="actions"><button class="btn ghost" type="button" data-act="remind"${o.notify_service ? '' : ' disabled'}>${mtpEsc(t.remind_now)}</button><span class="grow"></span>
          <button class="btn primary" type="button" data-act="save"${dirty ? '' : ' disabled'}>${mtpEsc(t.save)}</button></div>
      </div></section>
      <section class="col"><h2>${mtpEsc(t.s_found)}</h2><div class="card"><p class="text">${mtpEsc(t.s_found_text)}</p>${found || `<div class="empty">${mtpEsc(t.nothing)}</div>`}
        <p class="muted">Maintenance ${mtpEsc(d.version || MAINTENANCE_PANEL_VERSION)}</p></div></section></div>`;
  }

  static styles() {
    return `
      :host { display: block; --ok: var(--success-color, #43a047); --warn: var(--warning-color, #f59e0b); --bad: var(--error-color, #db4437);
              --idle: var(--secondary-text-color, #727272); --accent: #0d9488; }
      .page { min-height: 100vh; background: var(--primary-background-color); color: var(--primary-text-color); }
      .page.tone-ok { --c: var(--accent); } .page.tone-warn { --c: var(--warn); } .page.tone-bad { --c: var(--bad); }
      .top { position: relative; height: 90px; overflow: hidden; background: linear-gradient(#ccfbf1, #f0fdfa); }
      .night .top { background: linear-gradient(#0c2626, #153838); }
      .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: #5eead4; } .night .ground { background: #2c6b66; }
      /* The illustration at the right, just left of the round button, as on the other ha-* panels. */
      .scene { position: absolute; right: 76px; bottom: 6px; height: 84px; width: auto; max-width: 40%; }
      @media (max-width: 700px) { .scene { opacity: .35; } }
      .board { fill: #fdf6e3; stroke: #e7d8b1; stroke-width: 2; } .holes circle { fill: #d6c49a; }
      .night .board { fill: #2b3a3a; stroke: #3f5656; } .night .holes circle { fill: #4f6a6a; }
      .gear path { fill: #5eead4; } .gear .hub { fill: #fdf6e3; } .night .gear path { fill: #2dd4bf; } .night .gear .hub { fill: #2b3a3a; }
      .wrench path { fill: #94a3b8; } .night .wrench path { fill: #cbd5e1; } .tone-bad .wrench path { fill: #ef4444; }
      .filter rect { fill: #fff; stroke: #5eead4; stroke-width: 2; } .filter path { stroke: #99f6e4; stroke-width: 2; }
      .tone-warn .filter rect, .tone-bad .filter rect { stroke: #f59e0b; } .tone-warn .filter path, .tone-bad .filter path { stroke: #fcd34d; }
      .night .filter rect { fill: #e6ebf3; }
      .gear { transform-box: fill-box; transform-origin: 50% 50%; animation: mtp-spin 12s linear infinite; }
      .wrench { transform-box: fill-box; transform-origin: 80% 15%; } .wrench.busy { animation: mtp-turn 1.5s ease-in-out infinite; }
      @keyframes mtp-spin { to { transform: rotate(360deg); } }
      @keyframes mtp-turn { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-24deg); } }
      @media (prefers-reduced-motion: reduce) { .gear, .wrench.busy { animation: none; } }
      .bar { position: absolute; left: 24px; right: 24px; top: 0; bottom: 6px; display: flex; align-items: center; gap: 12px; }
      .menu { color: #1f2937; } .night .menu { color: #f3f4f6; }
      .ico { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: var(--c); --mdc-icon-size: 22px;
             background: color-mix(in srgb, var(--c) 18%, #fff); }
      .night .ico { background: color-mix(in srgb, var(--c) 30%, #153838); }
      .htxt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .trow { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .title { font-size: 20px; font-weight: 700; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .subtitle { font-size: 13px; color: #4b5563; }
      .night .title { color: #f3f4f6; } .night .subtitle { color: #cbd5e1; }
      .pill { flex: none; white-space: nowrap; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 999px; color: color-mix(in srgb, var(--c) 70%, #111); background: color-mix(in srgb, var(--c) 16%, #fff); }
      .round { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: var(--c); --mdc-icon-size: 20px;
               border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); background: rgba(255,255,255,.6); }
      .night .round { background: rgba(0,0,0,.25); }
      .round:focus-visible, .tab:focus-visible, .btn:focus-visible, .chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
      .tabbar { display: flex; align-items: center; gap: 8px; padding: 0 24px; border-bottom: 1px solid var(--divider-color, rgba(127,127,127,.2)); background: var(--card-background-color, #fff); }
      .bare .tabbar { padding: 0 12px 0 16px; } .bare .tabbar .menu { color: var(--primary-text-color); }
      .tabs { flex: 1; min-width: 0; display: flex; gap: 24px; overflow-x: auto; }
      .tb-side { flex: none; display: flex; align-items: center; } .tb-side .round { width: 36px; height: 36px; --c: var(--accent); background: transparent; }
      .hint { font-size: 12px; font-weight: 400; color: var(--secondary-text-color); }
      .tab { font: inherit; font-size: 14px; font-weight: 600; background: none; border: 0; padding: 14px 0; cursor: pointer; white-space: nowrap;
             color: var(--secondary-text-color); border-bottom: 3px solid transparent; }
      .tab.on { color: var(--primary-text-color); border-bottom-color: var(--accent); }
      .wrap { max-width: 1180px; margin: 0 auto; padding: 20px 24px 40px; display: flex; flex-direction: column; gap: 14px; }
      h2 { margin: 6px 0 0; font-size: 13px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--secondary-text-color); }
      .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; } .tiles.t3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      @media (max-width: 700px) { .tiles, .tiles.t3 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      .tile, .card { background: var(--card-background-color, #fff); border-radius: 14px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.08)); }
      .tile { padding: 14px; display: flex; flex-direction: column; gap: 4px; }
      .tile .n { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; } .tile .k { font-size: 13px; color: var(--secondary-text-color); }
      .tile.t-bad .n { color: var(--bad); } .tile.t-warn .n { color: color-mix(in srgb, var(--warn) 80%, var(--primary-text-color)); }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .chip { font: inherit; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 999px; cursor: pointer; color: var(--primary-text-color);
              border: 1px solid var(--divider-color, rgba(127,127,127,.35)); background: var(--card-background-color, #fff); }
      .chip.on { color: #0f766e; border-color: #5eead4; background: #ccfbf1; } .night .chip.on { color: #99f6e4; background: #134e4a; border-color: #2c6b66; }
      .dico { flex: none; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; --mdc-icon-size: 18px;
              color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, transparent); }
      .row .tag { display: inline-flex; align-items: center; gap: 5px; flex: 0 1 auto; min-width: 0; max-width: 40%; } .row .tag ha-icon { flex: none; --mdc-icon-size: 14px; }
      .tagt { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      @media (max-width: 520px) { .row .tagt { display: none; } .row .tag { padding: 3px 6px; } }
      .dgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(340px, 100%), 1fr)); gap: 12px; align-items: start; }
      .dcard { background: var(--card-background-color, #fff); border-radius: 14px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.08)); overflow: hidden; }
      .dhead { display: flex; align-items: center; gap: 8px; padding: 10px 14px; font-size: 14px; font-weight: 700; border-bottom: 1px solid var(--divider-color, rgba(127,127,127,.18)); }
      .gname { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .dhead .grow { flex: 1; }
      .dhead .dtag { min-width: 0; flex: 0 1 auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .gcount { font-size: 12px; font-weight: 600; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; }
      .cline { --c: var(--ok); display: flex; align-items: center; gap: 12px; padding: 8px 14px; }
      .cline + .cline { border-top: 1px solid var(--divider-color, rgba(127,127,127,.12)); }
      .cline .dot { width: 30px; height: 30px; --mdc-icon-size: 16px; } .cline .sub { color: var(--secondary-text-color); } .cline .acts { min-width: 0; }
      .gauge { display: block; height: 4px; border-radius: 2px; margin-top: 5px; background: color-mix(in srgb, var(--c) 18%, transparent); overflow: hidden; }
      .gauge > span { display: block; height: 100%; border-radius: 2px; background: var(--c); }
      .list { display: flex; flex-direction: column; gap: 6px; }
      .row { --c: var(--ok); display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 14px;
             background: var(--card-background-color, #fff); box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.06)); }
      .row.r-bad { --c: var(--bad); background: color-mix(in srgb, var(--bad) 8%, var(--card-background-color, #fff)); } .row.r-warn { --c: var(--warn); }
      .row.r-idle { --c: var(--idle); } .row.r-idle .dot, .row.r-idle .txt { opacity: .6; }
      .dot { flex: none; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: var(--c); --mdc-icon-size: 18px;
             background: color-mix(in srgb, var(--c) 16%, transparent); }
      .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .nm { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub { font-size: 12px; color: color-mix(in srgb, var(--c) 70%, var(--primary-text-color)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .r-ok .sub, .check .sub { color: var(--secondary-text-color); }
      .tag { flex: none; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; color: var(--secondary-text-color);
             background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent); }
      .acts { flex: none; display: flex; gap: 6px; justify-content: flex-end; min-width: 64px; }
      .date { flex: none; width: 110px; font-size: 13px; font-weight: 600; color: var(--secondary-text-color); }
      .btn { font: inherit; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 999px; cursor: pointer; color: var(--primary-text-color);
             background: transparent; border: 1px solid var(--divider-color, rgba(127,127,127,.35)); }
      .btn:hover { background: color-mix(in srgb, var(--secondary-text-color) 10%, transparent); }
      .btn.ghost { border-color: transparent; color: var(--secondary-text-color); }
      .btn.primary { color: color-mix(in srgb, var(--accent) 75%, var(--primary-text-color)); border-color: color-mix(in srgb, var(--accent) 60%, transparent); }
      .btn.danger { color: color-mix(in srgb, var(--bad) 75%, var(--primary-text-color)); border-color: color-mix(in srgb, var(--bad) 55%, transparent); }
      .btn[disabled] { opacity: .45; cursor: default; }
      .card { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
      .cols { display: flex; flex-wrap: wrap; gap: 20px; } .col { flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
      .form { gap: 14px; } .grid4 { display: grid; grid-template-columns: 2fr repeat(5, minmax(0, 1fr)); gap: 12px; }
      @media (max-width: 860px) { .grid4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } .field.wide { grid-column: 1 / -1; } }
      .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: var(--secondary-text-color); }
      .field input, .field select { font: inherit; font-size: 14px; padding: 8px 10px; border-radius: 10px; color: var(--primary-text-color);
             background: transparent; border: 1px solid var(--divider-color, rgba(127,127,127,.35)); color-scheme: light dark; }
      .editor { border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); }
      .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; } .grow { flex: 1; }
      .check { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-top: 1px solid var(--divider-color, rgba(127,127,127,.15)); cursor: pointer; }
      .check input { width: 18px; height: 18px; accent-color: var(--accent); }
      .text { margin: 0; font-size: 13px; color: var(--secondary-text-color); } .muted { margin: 4px 0 0; font-size: 12px; color: var(--secondary-text-color); }
      .line { position: relative; height: 26px; margin: 6px 6px 0; }
      .track { position: absolute; left: 0; right: 0; top: 11px; height: 4px; border-radius: 2px; background: var(--divider-color, rgba(127,127,127,.25)); }
      .mark { position: absolute; top: 5px; width: 16px; height: 16px; margin-left: -8px; border-radius: 50%; border: 2px solid var(--card-background-color, #fff); }
      .m-bad { background: var(--bad); } .m-warn { background: var(--warn); } .m-ok { background: var(--accent); }
      .scale { display: flex; justify-content: space-between; font-size: 12px; color: var(--secondary-text-color); }
      .empty { padding: 16px; color: var(--secondary-text-color); font-size: 13px; }
      .toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); padding: 10px 18px; border-radius: 999px; font-size: 13px;
               background: var(--primary-text-color); color: var(--primary-background-color); box-shadow: 0 6px 20px rgba(0,0,0,.2); }
    `;
  }
}

if (!customElements.get('maintenance-panel')) customElements.define('maintenance-panel', MaintenancePanel);
