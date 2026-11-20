"""Render the Maintenance card and panel with mock data and save the README screenshots.

Usage: python scripts/screenshots.py  (needs `pip install playwright pillow`, `playwright install chromium`, and ffmpeg
for the GIF). CHROMIUM_PATH=/path/to/chrome to use another browser. The clock is frozen so the dates stay the same.
A file is only rewritten when its decoded pixels change: an unchanged render leaves no diff to commit.
"""

import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "custom_components/maintenance/frontend"
OUT = ROOT / "screenshots"
NOW = "2026-11-20T18:00:00+01:00"
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")

THEMES = {
    "light": {
        "--primary-background-color": "#e8eaed",
        "--secondary-background-color": "#f1f2f4",
        "--card-background-color": "#ffffff",
        "--primary-text-color": "#212121",
        "--secondary-text-color": "#727272",
        "--divider-color": "rgba(0,0,0,.12)",
    },
    "dark": {
        "--primary-background-color": "#111111",
        "--secondary-background-color": "#262626",
        "--card-background-color": "#1c1c1c",
        "--primary-text-color": "#e1e1e1",
        "--secondary-text-color": "#9b9b9b",
        "--divider-color": "rgba(225,225,225,.12)",
    },
}
COMMON = {"--success-color": "#43a047", "--warning-color": "#ffa600", "--error-color": "#db4437"}


# Material Design Icons paths used by the card and the panel (from @mdi/js).
ICONS = {
    "mdi:wrench-clock": "M10 6.2C10 4.3 8.8 2.6 7 2V5.7H4V2C2.2 2.6 1 4.3 1 6.2C1 8.1 2.2 9.8 4 10.4V21.4C4 21.8 4.2 22 4.5 22H6.5C6.8 22 7 21.8 7 21.5V10.5C8.8 9.9 10 8.2 10 6.2M16 8C16 8 15.9 8 16 8C12.1 8.1 9 11.2 9 15C9 18.9 12.1 22 16 22S23 18.9 23 15 19.9 8 16 8M16 20C13.2 20 11 17.8 11 15S13.2 10 16 10 21 12.2 21 15 18.8 20 16 20M15 11V16L18.6 18.2L19.4 17L16.5 15.3V11H15Z",
    "mdi:plus": "M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",
    "mdi:brush": "M20.71,4.63L19.37,3.29C19,2.9 18.35,2.9 17.96,3.29L9,12.25L11.75,15L20.71,6.04C21.1,5.65 21.1,5 20.71,4.63M7,14A3,3 0 0,0 4,17C4,18.31 2.84,19 2,19C2.92,20.22 4.5,21 6,21A4,4 0 0,0 10,17A3,3 0 0,0 7,14Z",
    "mdi:brush-variant": "M8 3C5.79 3 4 4.79 4 7V14C4 15.1 4.9 16 6 16H9V20C9 21.1 9.9 22 11 22H13C14.1 22 15 21.1 15 20V16H18C19.1 16 20 15.1 20 14V3H8M8 5H12V7H14V5H15V9H17V5H18V10H6V7C6 5.9 6.9 5 8 5M6 14V12H18V14H6Z",
    "mdi:air-filter": "M19,18.31V20A2,2 0 0,1 17,22H7A2,2 0 0,1 5,20V16.3C4.54,16.12 3.95,16 3,16A1,1 0 0,1 2,15A1,1 0 0,1 3,14C3.82,14 4.47,14.08 5,14.21V12.3C4.54,12.12 3.95,12 3,12A1,1 0 0,1 2,11A1,1 0 0,1 3,10C3.82,10 4.47,10.08 5,10.21V8.3C4.54,8.12 3.95,8 3,8A1,1 0 0,1 2,7A1,1 0 0,1 3,6C3.82,6 4.47,6.08 5,6.21V4A2,2 0 0,1 7,2H17A2,2 0 0,1 19,4V6.16C20.78,6.47 21.54,7.13 21.71,7.29C22.1,7.68 22.1,8.32 21.71,8.71C21.32,9.1 20.8,9.09 20.29,8.71V8.71C20.29,8.71 19.25,8 17,8C15.74,8 14.91,8.41 13.95,8.9C12.91,9.41 11.74,10 10,10C9.64,10 9.31,10 9,9.96V7.95C9.3,8 9.63,8 10,8C11.26,8 12.09,7.59 13.05,7.11C14.09,6.59 15.27,6 17,6V4H7V20H17V18C18.5,18 18.97,18.29 19,18.31M17,10C15.27,10 14.09,10.59 13.05,11.11C12.09,11.59 11.26,12 10,12C9.63,12 9.3,12 9,11.95V13.96C9.31,14 9.64,14 10,14C11.74,14 12.91,13.41 13.95,12.9C14.91,12.42 15.74,12 17,12C19.25,12 20.29,12.71 20.29,12.71V12.71C20.8,13.1 21.32,13.1 21.71,12.71C22.1,12.32 22.1,11.69 21.71,11.29C21.5,11.08 20.25,10 17,10M17,14C15.27,14 14.09,14.59 13.05,15.11C12.09,15.59 11.26,16 10,16C9.63,16 9.3,16 9,15.95V17.96C9.31,18 9.64,18 10,18C11.74,18 12.91,17.41 13.95,16.9C14.91,16.42 15.74,16 17,16C19.25,16 20.29,16.71 20.29,16.71V16.71C20.8,17.1 21.32,17.1 21.71,16.71C22.1,16.32 22.1,15.69 21.71,15.29C21.5,15.08 20.25,14 17,14Z",
    "mdi:water-outline": "M12,3.77L11.25,4.61C11.25,4.61 9.97,6.06 8.68,7.94C7.39,9.82 6,12.07 6,14.23A6,6 0 0,0 12,20.23A6,6 0 0,0 18,14.23C18,12.07 16.61,9.82 15.32,7.94C14.03,6.06 12.75,4.61 12.75,4.61L12,3.77M12,6.9C12.44,7.42 12.84,7.85 13.68,9.07C14.89,10.83 16,13.07 16,14.23C16,16.45 14.22,18.23 12,18.23C9.78,18.23 8,16.45 8,14.23C8,13.07 9.11,10.83 10.32,9.07C11.16,7.85 11.56,7.42 12,6.9Z",
    "mdi:smoke-detector": "M12,18A6,6 0 0,0 18,12C18,8.68 15.31,6 12,6C8.68,6 6,8.68 6,12A6,6 0 0,0 12,18M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H19M8,12A4,4 0 0,1 12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12Z",
    "mdi:water-boiler": "M8 2C6.89 2 6 2.89 6 4V16C6 17.11 6.89 18 8 18H9V20H6V22H9C10.11 22 11 21.11 11 20V18H13V20C13 21.11 13.89 22 15 22H18V20H15V18H16C17.11 18 18 17.11 18 16V4C18 2.89 17.11 2 16 2H8M12 4.97A2 2 0 0 1 14 6.97A2 2 0 0 1 12 8.97A2 2 0 0 1 10 6.97A2 2 0 0 1 12 4.97M10 14.5H14V16H10V14.5Z",
    "mdi:wrench": "M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.6,4.7C0.4,7.1 0.9,10.1 2.9,12.1C4.8,14 7.5,14.5 9.8,13.6L18.9,22.7C19.3,23.1 19.9,23.1 20.3,22.7L22.6,20.4C23.1,20 23.1,19.3 22.7,19Z",
    "mdi:check": "M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",
    "mdi:autorenew": "M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z",
    "mdi:leaf": "M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z",
    "mdi:robot-vacuum": "M12,2C14.65,2 17.19,3.06 19.07,4.93L17.65,6.35C16.15,4.85 14.12,4 12,4C9.88,4 7.84,4.84 6.35,6.35L4.93,4.93C6.81,3.06 9.35,2 12,2M3.66,6.5L5.11,7.94C4.39,9.17 4,10.57 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,10.57 19.61,9.17 18.88,7.94L20.34,6.5C21.42,8.12 22,10.04 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12C2,10.04 2.58,8.12 3.66,6.5M12,6A6,6 0 0,1 18,12C18,13.59 17.37,15.12 16.24,16.24L14.83,14.83C14.08,15.58 13.06,16 12,16C10.94,16 9.92,15.58 9.17,14.83L7.76,16.24C6.63,15.12 6,13.59 6,12A6,6 0 0,1 12,6M12,8A1,1 0 0,0 11,9A1,1 0 0,0 12,10A1,1 0 0,0 13,9A1,1 0 0,0 12,8Z",
    "mdi:air-purifier": "M11,9A4,4 0 0,1 15,13A4,4 0 0,1 11,17A4,4 0 0,1 7,13A4,4 0 0,1 11,9M11,11A2,2 0 0,0 9,13A2,2 0 0,0 11,15A2,2 0 0,0 13,13A2,2 0 0,0 11,11M7,4H14A4,4 0 0,1 18,8V9H16V8A2,2 0 0,0 14,6H7A2,2 0 0,0 5,8V20H16V18H18V22H3V8A4,4 0 0,1 7,4M16,11C18.5,11 18.5,9 21,9V11C18.5,11 18.5,13 16,13V11M16,15C18.5,15 18.5,13 21,13V15C18.5,15 18.5,17 16,17V15Z",
    "mdi:printer": "M18,3H6V7H18M19,12A1,1 0 0,1 18,11A1,1 0 0,1 19,10A1,1 0 0,1 20,11A1,1 0 0,1 19,12M16,19H8V14H16M19,8H5A3,3 0 0,0 2,11V17H6V21H18V17H22V11A3,3 0 0,0 19,8Z",
    "mdi:shield-home": "M11,13H13V16H16V11H18L12,6L6,11H8V16H11V13M12,1L21,5V11C21,16.55 17.16,21.74 12,23C6.84,21.74 3,16.55 3,11V5L12,1Z",
    "mdi:home": "M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z",
    "mdi:flower": "M3,13A9,9 0 0,0 12,22C12,17 7.97,13 3,13M12,5.5A2.5,2.5 0 0,1 14.5,8A2.5,2.5 0 0,1 12,10.5A2.5,2.5 0 0,1 9.5,8A2.5,2.5 0 0,1 12,5.5M5.6,10.25A2.5,2.5 0 0,0 8.1,12.75C8.63,12.75 9.12,12.58 9.5,12.31C9.5,12.37 9.5,12.43 9.5,12.5A2.5,2.5 0 0,0 12,15A2.5,2.5 0 0,0 14.5,12.5C14.5,12.43 14.5,12.37 14.5,12.31C14.88,12.58 15.37,12.75 15.9,12.75C17.28,12.75 18.4,11.63 18.4,10.25C18.4,9.25 17.81,8.4 16.97,8C17.81,7.6 18.4,6.74 18.4,5.75C18.4,4.37 17.28,3.25 15.9,3.25C15.37,3.25 14.88,3.41 14.5,3.69C14.5,3.63 14.5,3.56 14.5,3.5A2.5,2.5 0 0,0 12,1A2.5,2.5 0 0,0 9.5,3.5C9.5,3.56 9.5,3.63 9.5,3.69C9.12,3.41 8.63,3.25 8.1,3.25A2.5,2.5 0 0,0 5.6,5.75C5.6,6.74 6.19,7.6 7.03,8C6.19,8.4 5.6,9.25 5.6,10.25M12,22A9,9 0 0,0 21,13C16,13 12,17 12,22Z",
    "mdi:car": "M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z",
    "mdi:devices": "M3 6H21V4H3C1.9 4 1 4.9 1 6V18C1 19.1 1.9 20 3 20H7V18H3V6M13 12H9V13.78C8.39 14.33 8 15.11 8 16C8 16.89 8.39 17.67 9 18.22V20H13V18.22C13.61 17.67 14 16.88 14 16S13.61 14.33 13 13.78V12M11 17.5C10.17 17.5 9.5 16.83 9.5 16S10.17 14.5 11 14.5 12.5 15.17 12.5 16 11.83 17.5 11 17.5M22 8H16C15.5 8 15 8.5 15 9V19C15 19.5 15.5 20 16 20H22C22.5 20 23 19.5 23 19V9C23 8.5 22.5 8 22 8M21 18H17V10H21V18Z",
    "mdi:clipboard-check-outline": "M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3M7,7H17V5H19V19H5V5H7V7M7.5,13.5L9,12L11,14L15.5,9.5L17,11L11,17L7.5,13.5Z",
    "mdi:water": "M12,20A6,6 0 0,1 6,14C6,10 12,3.25 12,3.25C12,3.25 18,10 18,14A6,6 0 0,1 12,20Z",
}


def _consumable(entity_id, name, icon, category, source, status, percent=None, hours=None, days=None, device=None):
    short = name.split(" — ")[0]
    return {
        "id": entity_id, "kind": "consumable", "name": name, "short": short, "device": device, "icon": icon,
        "category": category, "source": source,
        "status": status, "percent": percent, "hours": hours, "days_left": days, "value": percent if percent is not None else hours,
        "can_reset": True,
    }  # fmt: skip


def _task(task_id, name, icon, category, status, days, every, unit):
    return {
        "id": f"task:{task_id}", "kind": "task", "name": name, "icon": icon, "category": category, "source": "",
        "status": status, "days_left": days, "every": every, "unit": unit, "percent": None, "hours": None,
    }  # fmt: skip


ITEMS = [
    _task("t1", "Descale the water heater", "mdi:water-boiler", "home", "overdue", -5, 12, "months"),
    {
        **_consumable("binary_sensor.vacuum_dirty_water", "Dirty water tank — Vacuum", "mdi:water", "vacuum", "Roborock", "overdue", device="Robot vacuum"),
        "state": "problem", "can_reset": False, "value": None,
    },
    _consumable("sensor.purifier_filter_life", "Purifier filter — Living room", "mdi:air-filter", "purifier", "HomeKit", "soon", 12, days=18, device="Living room purifier"),
    _consumable("sensor.printer_black_ink", "Black cartridge — Printer", "mdi:water-outline", "printer", "IPP", "soon", 9, device="Office printer"),
    _task("t2", "Test the smoke detectors", "mdi:smoke-detector", "safety", "soon", 3, 1, "months"),
    _consumable("sensor.vacuum_main_brush_left", "Main brush — Vacuum", "mdi:brush", "vacuum", "Roborock", "ok", 62, 186, 120, device="Robot vacuum"),
    _consumable("sensor.vacuum_filter_left", "Filter — Vacuum", "mdi:air-filter", "vacuum", "Roborock", "ok", 48, 72, 70, device="Robot vacuum"),
    _consumable("sensor.bedroom_purifier_filter", "Purifier filter — Bedroom", "mdi:air-filter", "purifier", "HomeKit", "ok", 71, device="Bedroom purifier"),
    _task("t3", "Boiler and ventilation service", "mdi:wrench", "home", "ok", 214, 12, "months"),
    _task("t4", "Clean the gutters", "mdi:leaf", "garden", "ok", 96, 6, "months"),
    _consumable("sensor.vacuum_mop_left", "Mop — Vacuum", "mdi:water", "vacuum", "Roborock", "unavailable", device="Robot vacuum"),
]  # fmt: skip
CALM = [
    {**i, "status": "ok", "days_left": abs(i["days_left"]) + 20 if i["days_left"] is not None else None}
    for i in ITEMS[5:]
    if i["status"] != "unavailable"
]


def counts(items):
    out = {s: sum(i["status"] == s for i in items) for s in ("overdue", "soon", "ok", "unavailable")}
    return {**out, "tracked": len(items), "done_month": 5}


PANEL_STATE = {
    "version": "0.1.0",
    "items": ITEMS,
    "counts": counts(ITEMS),
    "tasks": [
        {"id": "t1", "name": "Descale the water heater", "every": 12, "unit": "months", "category": "home", "last_done": "2025-11-15"},
        {"id": "t2", "name": "Test the smoke detectors", "every": 1, "unit": "months", "category": "safety", "last_done": "2026-10-23"},
        {"id": "t3", "name": "Boiler and ventilation service", "every": 12, "unit": "months", "category": "home", "last_done": "2026-06-22"},
        {"id": "t4", "name": "Clean the gutters", "every": 6, "unit": "months", "category": "garden", "last_done": "2026-08-24"},
    ],
    "history": [
        {"time": "2026-11-18T09:12:00+01:00", "item": "sensor.vacuum_side_brush_left", "name": "Side brush — Vacuum", "kind": "consumable", "by": "Alex"},
        {"time": "2026-11-12T18:40:00+01:00", "item": "task:t5", "name": "Clean the fridge water filter", "kind": "task", "by": "Sam"},
        {"time": "2026-11-05T10:03:00+01:00", "item": "sensor.printer_color_ink", "name": "Colour cartridge — Printer", "kind": "consumable", "by": "Alex"},
        {"time": "2026-10-23T08:30:00+02:00", "item": "task:t2", "name": "Test the smoke detectors", "kind": "task", "by": "Alex"},
    ],
    "found": [
        {"entity_id": i["id"], "name": i["name"], "category": i["category"], "source": i["source"], "ignored": False}
        for i in ITEMS if i["kind"] == "consumable"
    ] + [{"entity_id": "sensor.vacuum_sensor_dirty_left", "name": "Sensors — Vacuum", "category": "vacuum", "source": "Roborock", "ignored": True}],
    "services": ["notify_hub.send", "notify.mobile_app_phone"],
    "options": {"soon_days": 14, "soon_percent": 15, "reminder_time": "09:00", "notify_service": "notify_hub.send"},
}  # fmt: skip

# Card shots: (file stem, items) — something overdue, then all up to date.
CARD_SHOTS = [("card", ITEMS), ("card-ok", CALM)]
PANEL_SHOTS = ["due", "calendar", "history", "settings"]


HA_CARD = """
// Every animation, the ones inside shadow roots too (document.getAnimations() leaves those out).
window.nhAnimations = (root = document) => [...root.getAnimations(),
  ...[...root.querySelectorAll("*")].filter((e) => e.shadowRoot).flatMap((e) => nhAnimations(e.shadowRoot))];
customElements.define("ha-icon", class extends HTMLElement {
  connectedCallback() { const d = (window.MT_ICONS || {})[this.getAttribute("icon")] || "";
    this.attachShadow({ mode: "open" }).innerHTML = `<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}svg{width:100%;height:100%;fill:currentColor}</style><svg viewBox="0 0 24 24"><path d="${d}"/></svg>`; }
});
customElements.define("ha-card", class extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }).innerHTML =
    "<style>:host{display:block;background:var(--card-background-color);border-radius:12px;" +
    "box-shadow:0 1px 3px rgba(0,0,0,.12);overflow:hidden}</style><slot></slot>"; }
});
"""


def page_html(theme, width):
    css = ";".join(f"{k}:{v}" for k, v in {**THEMES[theme], **COMMON}.items())
    return (
        f"<!doctype html><html><head><style>html,body{{margin:0;background:var(--primary-background-color);"
        f"font-family:Roboto,sans-serif;{css}}}#root{{width:{width}px;padding:16px;box-sizing:content-box}}</style>"
        f"</head><body><div id='root'></div><script>window.MT_ICONS = {json.dumps(ICONS)};{HA_CARD}</script></body></html>"
    )


def hass(theme, items=None):
    states = {}
    if items is not None:
        states["sensor.maintenance_overdue"] = {
            "state": str(counts(items)["overdue"]),
            "attributes": {"maintenance": True, "counts": counts(items), "items": items},
            "last_updated": NOW,
        }
    return {"states": states, "themes": {"darkMode": theme == "dark"}, "locale": {"language": "en"}, "language": "en"}


def save(src: Path, dest: Path):
    """Keep the old file when its pixels are the same."""
    if dest.exists() and dest.suffix == ".png":
        with Image.open(src) as a, Image.open(dest) as b:
            if a.size == b.size and not ImageChops.difference(a.convert("RGBA"), b.convert("RGBA")).getbbox(
                alpha_only=False
            ):
                return
    shutil.copyfile(src, dest)
    print("wrote", dest.relative_to(ROOT))


def shoot_card(page, tmp, stem, recent, theme):
    page.set_content(page_html(theme, 460))
    page.add_script_tag(content=(FRONTEND / "maintenance-card.js").read_text())
    page.evaluate(
        """([h]) => { const c = document.createElement('maintenance-card'); c.setConfig({}); c.hass = h;
             document.getElementById('root').append(c); nhAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }); }""",
        [hass(theme, recent)],
    )
    name = f"{stem}{'-dark' if theme == 'dark' else ''}.png"
    page.locator("#root").screenshot(path=tmp / name, animations="disabled")
    save(tmp / name, OUT / name)


def shoot_panel(page, tmp, tab, theme):
    page.set_content(page_html(theme, 1100))
    page.add_script_tag(content=(FRONTEND / "maintenance-panel.js").read_text())
    page.evaluate(
        """async ([h, data, tab]) => { h.callWS = async () => data; const p = document.createElement('maintenance-panel'); p._tab = tab;
             document.getElementById('root').style.padding = '0'; document.getElementById('root').append(p);
             p.hass = h; await new Promise((r) => setTimeout(r, 50)); nhAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }); }""",
        [hass(theme), PANEL_STATE, tab],
    )
    page.add_style_tag(content="maintenance-panel{display:block} #root{min-height:0}")
    page.evaluate("document.querySelector('maintenance-panel').shadowRoot.querySelector('.page').style.minHeight = '0'")
    name = f"panel-{tab}{'-dark' if theme == 'dark' else ''}.png"
    page.locator("#root").screenshot(path=tmp / name, animations="disabled")
    save(tmp / name, OUT / name)


def gif_overdue(page, tmp):
    """The wrench at work while something is overdue."""
    if not shutil.which(FFMPEG):
        print("ffmpeg missing: GIF skipped")
        return
    page.set_content(page_html("light", 460))
    page.add_script_tag(content=(FRONTEND / "maintenance-card.js").read_text())
    page.evaluate(
        """([h]) => { const c = document.createElement('maintenance-card'); c.setConfig({}); c.hass = h;
             document.getElementById('root').append(c); }""",
        [hass("light", ITEMS[:4])],
    )
    frames = tmp / "frames"
    frames.mkdir()
    for i in range(15):
        page.evaluate(
            """async (t) => { nhAnimations().forEach((a) => { a.pause(); a.currentTime = t; });
                 await new Promise((r) => setTimeout(r, 30)); }""",
            i * 100,
        )
        page.locator("#root").screenshot(path=frames / f"{i:03d}.png")
    gif = tmp / "card-overdue.gif"
    subprocess.run(
        [FFMPEG, "-loglevel", "error", "-y", "-framerate", "10", "-i", str(frames / "%03d.png"),
         "-vf", "split[a][b];[a]palettegen=reserve_transparent=0[p];[b][p]paletteuse=dither=none", "-loop", "0", str(gif)],
        check=True,
    )  # fmt: skip
    dest = OUT / gif.name
    if not dest.exists() or _gif_frames(gif) != _gif_frames(dest):
        shutil.copyfile(gif, dest)
        print("wrote", dest.relative_to(ROOT))


def _gif_frames(path):
    with Image.open(path) as im:
        out = []
        for i in range(getattr(im, "n_frames", 1)):
            im.seek(i)
            out.append(im.convert("RGBA").tobytes())
        return out


def main():
    OUT.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as tmpdir, sync_playwright() as pw:
        tmp = Path(tmpdir)
        browser = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        page = browser.new_page(viewport={"width": 1200, "height": 900}, device_scale_factor=2)
        page.clock.set_fixed_time(NOW)
        page.goto("about:blank")
        for theme in THEMES:
            for stem, recent in CARD_SHOTS:
                shoot_card(page, tmp, stem, recent, theme)
            for tab in PANEL_SHOTS:
                shoot_panel(page, tmp, tab, theme)
        gif_overdue(page, tmp)
        browser.close()
    print(json.dumps(sorted(p.name for p in OUT.iterdir())))


if __name__ == "__main__":
    main()
