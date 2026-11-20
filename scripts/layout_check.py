"""Layout regression check: the card and the panel must not rebuild their DOM (nor change height) on hass updates.

Mounts the card and the panel in Chromium with a Lit-like `ha-card` (its own shadow DOM and border are drawn one
frame after it is created, like a Lit element's first update, so a re-created <ha-card> shows as a height change),
then pushes hass updates: some changing only an unrelated entity, some changing the card's own sensor. Records the
card's height on every animation frame and counts the shadow-DOM nodes added or removed.

Expected: unrelated updates make no DOM mutation at all; relevant updates patch in place (no node removed when the
items stay the same) and the height never moves. Exit code 1 otherwise.

Usage: python scripts/layout_check.py  (needs `pip install playwright`, `playwright install chromium`;
CHROMIUM_PATH=/path/to/chrome to use another browser). --report prints the numbers without failing.
"""

import copy
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "custom_components/maintenance/frontend"

# A Lit-like ha-card: upgraded at once, but its shadow content (and the border that gives it its height) comes one
# frame later, with an `updateComplete` promise, as Home Assistant's own element does.
STUBS = """
customElements.define("ha-icon", class extends HTMLElement {
  connectedCallback() { if (this.shadowRoot) return; this.attachShadow({ mode: "open" }).innerHTML =
    "<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}</style>"; }
});
customElements.define("ha-card", class extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" });
    this.updateComplete = new Promise((r) => requestAnimationFrame(() => {
      this.shadowRoot.innerHTML = "<style>:host{display:block;border:2px solid #ccc;border-radius:12px;overflow:hidden}</style><slot></slot>";
      r(true); })); }
});
customElements.define("ha-menu-button", class extends HTMLElement {});
"""

ITEMS = [
    {"id": "task:t1", "kind": "task", "name": "Descale the water heater", "icon": "mdi:water-boiler", "category": "home",
     "source": "", "status": "overdue", "days_left": -5, "every": 12, "unit": "months", "percent": None, "hours": None},
    {"id": "sensor.purifier_filter", "kind": "consumable", "name": "Purifier filter", "icon": "mdi:air-filter",
     "category": "purifier", "source": "HomeKit", "status": "soon", "percent": 12, "hours": None, "days_left": 18},
    {"id": "sensor.vacuum_brush", "kind": "consumable", "name": "Main brush", "icon": "mdi:brush",
     "category": "vacuum", "source": "Roborock", "status": "ok", "percent": 62, "hours": 186, "days_left": 120},
]  # fmt: skip


def counts(items):
    out = {s: sum(i["status"] == s for i in items) for s in ("overdue", "soon", "ok")}
    return {**out, "tracked": len(items), "done_month": 2}


def overdue_state(items, stamp):
    return {
        "entity_id": "sensor.maintenance_overdue",
        "state": str(counts(items)["overdue"]),
        "attributes": {"maintenance": True, "counts": counts(items), "items": items},
        "last_updated": stamp,
    }


def updates():
    """20 hass updates: even ones change an unrelated entity, odd ones change the card's own sensor."""
    out = []
    items = copy.deepcopy(ITEMS)
    for n in range(20):
        if n % 2:
            items = copy.deepcopy(items)
            items[2]["hours"] = 186 - n
            items[2]["percent"] = 62 - n // 2
            out.append({"own": True, "items": items, "stamp": f"2026-11-20T10:00:{n:02d}+00:00"})
        else:
            out.append({"own": False, "value": str(20 + n)})
    return out


SCRIPT = """
async ([kind, items, steps]) => {
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  let states = { 'sensor.maintenance_overdue': %STATE%, 'sensor.outdoor_temperature': { state: '20', attributes: {} } };
  const mk = () => ({ states, themes: { darkMode: false }, locale: { language: 'en' }, language: 'en', user: { is_admin: true },
                      callWS: async () => window.PANEL_STATE, callService: async () => {} });
  let el;
  if (kind === 'card') {
    el = document.createElement('maintenance-card'); el.setConfig({}); el.hass = mk();
  } else {
    el = document.createElement('maintenance-panel'); el.hass = mk();
  }
  document.getElementById('root').append(el);
  for (let i = 0; i < 6; i++) await frame();
  await new Promise((r) => setTimeout(r, 50));
  const root = el.shadowRoot;
  const heights = [];
  let measuring = true;
  const tick = () => { heights.push(el.getBoundingClientRect().height); if (measuring) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const result = { unrelated: { added: 0, removed: 0, attrs: 0, text: 0 }, own: { added: 0, removed: 0, attrs: 0, text: 0 } };
  let bucket = result.unrelated;
  const mo = new MutationObserver((list) => { for (const m of list) {
    if (m.type === 'childList') { bucket.added += m.addedNodes.length; bucket.removed += m.removedNodes.length; }
    else if (m.type === 'attributes') bucket.attrs += 1; else bucket.text += 1; } });
  mo.observe(root, { childList: true, subtree: true, attributes: true, characterData: true });
  for (const step of steps) {
    bucket = step.own ? result.own : result.unrelated;
    states = Object.assign({}, states);
    if (step.own) states['sensor.maintenance_overdue'] = Object.assign({}, states['sensor.maintenance_overdue'],
      { attributes: { maintenance: true, counts: window.mtCounts(step.items), items: step.items }, last_updated: step.stamp });
    else states['sensor.outdoor_temperature'] = { state: step.value, attributes: {} };
    el.hass = mk();
    await frame(); await new Promise((r) => setTimeout(r, 20));
    mo.takeRecords().forEach(() => {});
  }
  await frame(); await frame();
  measuring = false; mo.disconnect();
  const hs = heights;
  result.heights = { min: Math.min(...hs), max: Math.max(...hs), frames: hs.length,
                     changes: hs.filter((h, i) => i && h !== hs[i - 1]).length };
  return result;
}
"""


def run(kind):
    initial = overdue_state(ITEMS, "2026-11-20T10:00:00+00:00")
    panel_state = {
        "version": "0", "items": ITEMS, "counts": counts(ITEMS), "tasks": [], "history": [], "found": [],
        "services": [], "options": {"soon_days": 14, "soon_percent": 15},
    }  # fmt: skip
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        page = browser.new_page(viewport={"width": 1100 if kind == "panel" else 420, "height": 900})
        page.set_content(
            "<!doctype html><html><body style='margin:0;font-family:sans-serif'><div id='root'></div></body></html>"
        )
        page.add_script_tag(content=STUBS)
        page.add_script_tag(
            content=f"window.PANEL_STATE = {json.dumps(panel_state)};"
            "window.mtCounts = (items) => { const o = {}; for (const s of ['overdue','soon','ok']) "
            "o[s] = items.filter((i) => i.status === s).length; return Object.assign(o, { tracked: items.length, done_month: 2 }); };"
        )
        page.add_script_tag(content=(FRONTEND / f"maintenance-{kind}.js").read_text())
        result = page.evaluate(SCRIPT.replace("%STATE%", json.dumps(initial)), [kind, ITEMS, updates()])
        browser.close()
    return result


def main():
    report_only = "--report" in sys.argv
    failures = []
    for kind in ("card", "panel"):
        r = run(kind)
        print(kind, json.dumps(r))
        if any(r["unrelated"].values()):
            failures.append(f"{kind}: unrelated hass updates mutated the DOM {r['unrelated']}")
        if r["own"]["removed"]:
            failures.append(f"{kind}: relevant updates replaced {r['own']['removed']} nodes instead of patching them")
        if r["heights"]["changes"]:
            failures.append(f"{kind}: the height changed {r['heights']['changes']} times {r['heights']}")
    for f in failures:
        print("FAIL", f)
    if failures and not report_only:
        sys.exit(1)


if __name__ == "__main__":
    main()
