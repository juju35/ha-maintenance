// Maintenance's sidebar badge, loaded on every page: the items overdue, on the panel's sidebar item, in red, like
// Home Assistant's own notifications count. The count is read from the "Overdue" sensor (found by its `maintenance`
// attribute), which Home Assistant keeps up to date.
// The last value is kept by the browser, so the sidebar shows it at once.
var MT_COUNT_KEY = 'maintenance-count';
var MT_TONE_KEY = 'maintenance-badge-tone';
var MT_EVERY_MS = 15000;
// Red for the items overdue; amber kept for a later use.
var MT_BADGE_COLORS = {
  bad: 'var(--error-color, #db4437)',
  warn: 'var(--warning-color, #ffa600)',
};
// Dark text reads on the amber badge, white on the others.
var MT_BADGE_TEXT = { warn: 'rgba(0,0,0,.87)' };

function mtBadgeSaved() {
  try {
    var n = parseInt(localStorage.getItem(MT_COUNT_KEY), 10);
    var tone = localStorage.getItem(MT_TONE_KEY);
    return { count: Number.isFinite(n) && n > 0 ? n : 0, tone: tone in MT_BADGE_COLORS ? tone : 'warn' };
  } catch (_err) {
    return { count: 0, tone: 'warn' };
  }
}
window.__maintenanceBadge ??= mtBadgeSaved();

// The Maintenance item in Home Assistant's sidebar, or null until the sidebar is drawn. The recent sidebar gives
// each item the id `sidebar-panel-<path>` and sets its href as a property (not an attribute), so the id is the
// reliable hook; `[href]` and `[data-panel]` catch the older sidebars (an <a> wrapping a paper-icon-item).
function mtSidebarItem() {
  var ha = document.querySelector('home-assistant')?.shadowRoot;
  var sidebar = ha?.querySelector('home-assistant-main')?.shadowRoot?.querySelector('ha-sidebar')?.shadowRoot;
  if (!sidebar) return null;
  return (
    sidebar.querySelector('#sidebar-panel-maintenance') ||
    sidebar.querySelector('[href="/maintenance"]') ||
    sidebar.querySelector('[data-panel="maintenance"]')
  );
}

// One badge span, styled as Home Assistant's own sidebar badge (class `badge`, so the sidebar's CSS places it and
// shows or hides it by slot and expanded state) but in our tone instead of the accent colour.
function mtBadgeSpan(text, tone, slot, key) {
  var el = document.createElement('span');
  el.className = 'badge maintenance-badge';
  el.slot = slot;
  el.dataset.key = key;
  el.textContent = text;
  // The start badge (shown collapsed, over the icon) is placed by Home Assistant's `ha-svg-icon + .badge` rule — but a
  // custom panel's sidebar icon is an <ha-icon>, not a bare <ha-svg-icon>, so that rule does not match and the badge
  // would sit in the start slot and push the panel label to the right. Position it ourselves (over the icon, like
  // Home Assistant's own: top var(--ha-space-1), left 26px) so it never affects the row's layout; the end badge stays
  // in flow at the trailing edge. The host's expanded/collapsed opacity rules still show the right one by slot.
  var place = slot === 'start' ? 'position:absolute; top:var(--ha-space-1, 4px); left:26px; z-index:1; pointer-events:none; ' : '';
  el.style.cssText = `${place}display:inline-flex; justify-content:center; min-width:18px; height:18px; box-sizing:border-box; padding:0 5px; align-items:center; border-radius:9px; font-size:11px; font-weight:500; line-height:1; color:${MT_BADGE_TEXT[tone] || '#fff'}; background:${MT_BADGE_COLORS[tone]};`;
  return el;
}

// The badge on the sidebar item: the number of active alerts, in the most serious severity's colour, like the
// notifications count; none when there is nothing active. On the recent sidebar (ha-list-item-button /
// ha-md-list-item) it mirrors Home Assistant's own badge — a span in the start slot (shown when the sidebar is
// collapsed, over the icon) and one in the end slot (shown when expanded) — so the sidebar's CSS handles the
// placement and the collapsed/expanded switch. On the older sidebar (an <a>) a single span is placed at the right.
// Redrawn when Home Assistant rebuilds its items; unchanged, it writes nothing (so the observer below does not loop).
function mtBadgeRedraw() {
  var item = mtSidebarItem();
  if (!item) return false;
  var count = window.__maintenanceBadge.count;
  var tone = window.__maintenanceBadge.tone;
  var spans = item.querySelectorAll(':scope > .maintenance-badge');
  if (!count) {
    for (var b of spans) b.remove();
    return true;
  }
  var text = count > 99 ? '99+' : String(count);
  var key = `${tone}:${text}`;
  if (item.localName === 'a') {
    var badge = spans[0];
    if (badge && badge.dataset.key === key) return true;
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'maintenance-badge';
      item.style.position = 'relative';
      item.appendChild(badge);
    }
    badge.dataset.key = key;
    badge.textContent = text;
    badge.style.cssText = `position:absolute; right:12px; top:50%; transform:translateY(-50%); min-width:18px; height:18px; box-sizing:border-box; padding:0 5px; display:inline-flex; align-items:center; justify-content:center; border-radius:9px; font-size:11px; font-weight:500; line-height:1; pointer-events:none; z-index:1; color:${MT_BADGE_TEXT[tone] || '#fff'}; background:${MT_BADGE_COLORS[tone]};`;
    return true;
  }
  if (spans.length === 2 && spans[0].dataset.key === key) return true;
  for (var old of spans) old.remove();
  // The start badge goes right after the icon, so the sidebar's `ha-svg-icon + .badge` rule places it over the icon.
  var icon = item.querySelector(':scope > ha-svg-icon[slot="start"]') || item.querySelector(':scope > ha-icon[slot="start"]');
  var start = mtBadgeSpan(text, tone, 'start', key);
  if (icon) item.insertBefore(start, icon.nextSibling);
  else item.appendChild(start);
  item.appendChild(mtBadgeSpan(text, tone, 'end', key));
  return true;
}

// Until the sidebar has drawn the item (it may come after this module): every 250 ms for 5 seconds
function mtBadgeRedrawSoon(tries = 20) {
  if (mtBadgeRedraw() || tries <= 1) return;
  setTimeout(() => mtBadgeRedrawSoon(tries - 1), 250);
}

// The sidebar rebuilds its items (opened, folded, panels changed): the badge is added again when it is dropped
function mtBadgeObserve() {
  var item = mtSidebarItem();
  var sidebar = item?.getRootNode();
  if (!sidebar) {
    setTimeout(mtBadgeObserve, 500);
    return;
  }
  if (sidebar.__maintenanceBadgeObserved) return;
  sidebar.__maintenanceBadgeObserved = true;
  new MutationObserver(() => {
    if (window.__maintenanceBadgeRaf) return;
    window.__maintenanceBadgeRaf = requestAnimationFrame(() => {
      window.__maintenanceBadgeRaf = 0;
      mtBadgeRedraw();
    });
  }).observe(sidebar, { childList: true, subtree: true });
}

// The count and the most serious severity: the badge drawn again when they change, kept for the next page
function mtSetBadge(count, tone) {
  count = Math.max(0, parseInt(count, 10) || 0);
  if (!(tone in MT_BADGE_COLORS)) tone = 'warn';
  if (window.__maintenanceBadge.count === count && window.__maintenanceBadge.tone === tone) return;
  window.__maintenanceBadge = { count: count, tone: tone };
  try {
    localStorage.setItem(MT_COUNT_KEY, String(count));
    localStorage.setItem(MT_TONE_KEY, tone);
  } catch (_err) {
    // drawn anyway, not kept
  }
  mtBadgeRedraw();
}

// The "Overdue" sensor: the one carrying the `maintenance` attribute; its state is the count.
function mtActiveState(hass) {
  var states = hass?.states;
  if (!states) return null;
  for (var id in states) {
    if (id.startsWith('sensor.') && states[id]?.attributes?.maintenance) return states[id];
  }
  return null;
}

// The items overdue, reported for the sidebar badge (always red)
function mtFollow() {
  var hass = document.querySelector('home-assistant')?.hass;
  if (!hass?.user?.is_admin || document.hidden) return;
  var st = mtActiveState(hass);
  if (!st) return;
  var count = parseInt(st.state, 10);
  mtSetBadge(Number.isFinite(count) ? count : 0, 'bad');
}

if (!window.__maintenanceBadge_init) {
  window.__maintenanceBadge_init = true;
  mtBadgeRedrawSoon();
  mtBadgeObserve();
  // The alerts read a few seconds after the page, once Home Assistant has drawn it, then every 15 seconds
  setTimeout(mtFollow, 3000);
  setInterval(mtFollow, MT_EVERY_MS);
}
