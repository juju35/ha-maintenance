export var MTP_TABS = ['due', 'calendar', 'history', 'settings'];
export var MTP_CATEGORIES = ['vacuum', 'purifier', 'printer', 'safety', 'home', 'garden', 'vehicle', 'other'];
// A device's icon, from its category (the manual tasks get their own).
export var MTP_DEVICE_ICONS = { vacuum: 'mdi:robot-vacuum', purifier: 'mdi:air-purifier', printer: 'mdi:printer', safety: 'mdi:shield-home', home: 'mdi:home', garden: 'mdi:flower', vehicle: 'mdi:car', other: 'mdi:devices', task: 'mdi:clipboard-check-outline' };
export var mtpDeviceIcon = (item) => MTP_DEVICE_ICONS[item.kind === 'task' ? 'task' : item.category] || MTP_DEVICE_ICONS.other;
export var MTP_TONE = { overdue: 'bad', soon: 'warn', ok: 'ok', unavailable: 'idle' };
export var MTP_BLANK = { name: '', every: 1, unit: 'months', category: 'home' };

export var mtpEsc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export var mtpFill = (text, values) => String(text).replace(/\{(\w+)\}/g, (m, k) => (values[k] == null ? m : values[k]));

// The panel is patched in place, never rebuilt: kept nodes keep their focus, typed text, hover and running
// animations, so a Home Assistant update cannot steal the field being edited nor swallow a click. Children with a
// `data-key` are matched by key, the others by position; form fields not being edited take their new value.
// Same approach as the card's (a repo-local copy, the two files are loaded separately).
// jscpd:ignore-start
export var mtpSetAttrs = (cur, next) => {
  for (var { name } of [...cur.attributes]) if (!next.hasAttribute(name)) cur.removeAttribute(name);
  for (var { name: n, value } of next.attributes) if (cur.getAttribute(n) !== value) cur.setAttribute(n, value);
};
export var mtpKeyOf = (n) => (n.nodeType === 1 ? n.getAttribute('data-key') : null);
export var mtpSync = (cur, next, active) => {
  var old = [...cur.childNodes];
  var keyed = new Map();
  for (var o of old) if (mtpKeyOf(o) !== null && !keyed.has(mtpKeyOf(o))) keyed.set(mtpKeyOf(o), o);
  var taken = new Set();
  var wanted = [...next.childNodes];
  wanted.forEach((n, i) => {
    var k = mtpKeyOf(n);
    var o = k !== null ? keyed.get(k) : old[i];
    if (!o || o.nodeType !== n.nodeType || o.nodeName !== n.nodeName || taken.has(o) || (k === null && mtpKeyOf(o) !== null)) o = null;
    var at = cur.childNodes[i] ?? null;
    if (!o) {
      cur.insertBefore(n, at);
      return;
    }
    taken.add(o);
    if (o !== at) cur.insertBefore(o, at);
    if (n.nodeType !== 1) {
      if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue;
      return;
    }
    mtpSetAttrs(o, n);
    mtpSync(o, n, active);
    if (o === active) return;
    if (o.localName === 'input') {
      if (o.type === 'checkbox') o.checked = n.hasAttribute('checked');
      else if (o.value !== (n.getAttribute('value') ?? '')) o.value = n.getAttribute('value') ?? '';
    } else if (o.localName === 'select') {
      var chosen = n.querySelector('option[selected]') || n.querySelector('option');
      if (chosen && o.value !== chosen.value) o.value = chosen.value;
    }
  });
  while (cur.childNodes.length > wanted.length) cur.removeChild(cur.lastChild);
};
// jscpd:ignore-end
