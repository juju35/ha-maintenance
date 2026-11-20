"""The maintenance tracker: consumables found among the device sensors, manual tasks, their due dates and history.

Consumables are found by themselves: a numeric sensor whose name says what it is (filter, brush, ink, toner, mop…)
and whose unit says how much is left (a percentage, or a time left such as Roborock's brush hours). One sample a day
gives how fast it wears, hence an estimated number of days left. Marking it done presses the device's own reset
button when it has one (Roborock, Xiaomi…), and keeps a line in the history.

Manual tasks repeat every N days, weeks or months from the last time they were done.
"""

from __future__ import annotations

import logging
import re
import uuid
from collections.abc import Callable
from datetime import date, datetime, time, timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, UnitOfTime
from homeassistant.core import CALLBACK_TYPE, CoreState, Event, HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import (
    async_track_state_change_event,
    async_track_time_change,
    async_track_time_interval,
)
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    CONF_IGNORED,
    CONF_NOTIFY_SERVICE,
    CONF_REMINDER_TIME,
    CONF_SOON_DAYS,
    CONF_SOON_PERCENT,
    DEFAULT_REMINDER_TIME,
    DEFAULT_SOON_DAYS,
    DEFAULT_SOON_PERCENT,
    DOMAIN,
    EVENT_DONE,
    KIND_CONSUMABLE,
    KIND_TASK,
    MAX_HISTORY,
    MAX_SAMPLES,
    MIN_SAMPLE_DAYS,
    STATUS_OK,
    STATUS_OVERDUE,
    STATUS_SOON,
    STATUSES,
    STORAGE_VERSION,
)
from .strings import text

_LOGGER = logging.getLogger(__name__)
SAVE_DELAY = 10

# What a consumable sensor is called, its category when the device does not tell, its icon and, for a time left,
# its usual lifetime in hours (to show a percentage).
CONSUMABLES: tuple[tuple[str, str, str, float | None], ...] = (
    ("main_brush", "vacuum", "mdi:brush", 300),
    ("side_brush", "vacuum", "mdi:brush-variant", 200),
    ("brush", "vacuum", "mdi:brush", 300),
    ("mop", "vacuum", "mdi:water", 180),
    ("dust_bag", "vacuum", "mdi:delete-variant", None),
    ("sensor_dirty", "vacuum", "mdi:eye-outline", 30),
    ("sensor", "vacuum", "mdi:eye-outline", 30),
    ("toner", "printer", "mdi:printer-3d-nozzle", None),
    ("ink", "printer", "mdi:water-outline", None),
    ("cartridge", "printer", "mdi:water-outline", None),
    ("drum", "printer", "mdi:printer", None),
    ("filter", "home", "mdi:air-filter", 150),
)
_STRONG = ("filter", "brush", "mop", "toner", "ink", "cartridge", "drum", "dust_bag", "sensor_dirty")
_LEFT = ("left", "remaining", "life", "lifespan", "level", "time", "usage", "consumable")
_NEVER = (
    "battery", "signal", "humidity", "temperature", "rssi", "pm2", "pm10", "voc", "co2", "water_level", "moisture",
    "illuminance", "noise",
)  # fmt: skip
_TIME_UNITS = {
    UnitOfTime.SECONDS: 1 / 3600,
    UnitOfTime.MINUTES: 1 / 60,
    UnitOfTime.HOURS: 1.0,
    UnitOfTime.DAYS: 24.0,
}
_WORD = re.compile(r"[^a-z0-9]+")
_SUFFIX = re.compile(
    r"\s+(time left|remaining time|remaining|life left|life level|life|level|left|usage)$", re.IGNORECASE
)


def parse_time(value: str | None, default: str) -> time:
    for raw in (value, default):
        try:
            hour, minute = str(raw).split(":")[:2]
            return time(int(hour), int(minute))
        except (TypeError, ValueError):
            continue
    return time(9, 0)


def add_interval(start: date, every: int, unit: str) -> date:
    """start + every days, weeks or months (the day clamped to the month's last)."""
    if unit == "days":
        return start + timedelta(days=every)
    if unit == "weeks":
        return start + timedelta(weeks=every)
    month = start.month - 1 + every
    year, month = start.year + month // 12, month % 12 + 1
    for day in range(start.day, 27, -1):
        try:
            return date(year, month, day)
        except ValueError:
            continue
    return date(year, month, min(start.day, 28))


def _words(*parts: str | None) -> str:
    return "_" + "_".join(_WORD.sub("_", (p or "").lower()).strip("_") for p in parts if p) + "_"


class MaintenanceTracker:
    """Everything the entities, the panel and the card show."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, f"{DOMAIN}.{entry.entry_id}")
        self._data: dict[str, Any] = {"tasks": [], "history": [], "samples": {}, "notified": {}}
        self._found: dict[str, dict[str, Any]] = {}
        self._listeners: list[CALLBACK_TYPE] = []
        self._unsubs: list[Callable[[], None]] = []
        self._unsub_states: Callable[[], None] | None = None

    # ── Life cycle ──────────────────────────────────────────────────────────

    async def async_load(self) -> None:
        stored = await self._store.async_load()
        if stored:
            for key in self._data:
                self._data[key] = stored.get(key, self._data[key])
        self._unsubs.append(async_track_time_interval(self.hass, self._async_hourly, timedelta(hours=1)))
        self._schedule_reminder()
        if self.hass.state is CoreState.running:
            self.async_discover()
        else:
            self._unsubs.append(
                self.hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, lambda _e: self.async_discover())
            )

    async def async_unload(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        if self._unsub_states:
            self._unsub_states()
            self._unsub_states = None
        await self._store.async_save(self._data)

    def _schedule_reminder(self) -> None:
        when = parse_time(self.options.get(CONF_REMINDER_TIME), DEFAULT_REMINDER_TIME)
        self._unsubs.append(
            async_track_time_change(self.hass, self._async_remind, hour=when.hour, minute=when.minute, second=0)
        )

    @callback
    def async_options_changed(self) -> None:
        """New options: the reminder time may have moved, ignored sensors changed."""
        for unsub in self._unsubs:
            unsub()
        self._unsubs = [async_track_time_interval(self.hass, self._async_hourly, timedelta(hours=1))]
        self._schedule_reminder()
        self.async_discover()

    @property
    def options(self) -> dict[str, Any]:
        return dict(self.entry.options)

    @property
    def soon_days(self) -> int:
        return int(self.options.get(CONF_SOON_DAYS, DEFAULT_SOON_DAYS))

    @property
    def soon_percent(self) -> int:
        return int(self.options.get(CONF_SOON_PERCENT, DEFAULT_SOON_PERCENT))

    @callback
    def async_add_listener(self, update: CALLBACK_TYPE) -> Callable[[], None]:
        self._listeners.append(update)
        return lambda: self._listeners.remove(update)

    def _changed(self, save: bool = True) -> None:
        if save:
            self._store.async_delay_save(lambda: self._data, SAVE_DELAY)
        for listener in list(self._listeners):
            listener()

    # ── Consumables ─────────────────────────────────────────────────────────

    @callback
    def async_discover(self) -> None:
        """Find the consumable sensors (again: devices come and go), sample them, follow their changes."""
        ignored = set(self.options.get(CONF_IGNORED) or [])
        entities, devices = er.async_get(self.hass), dr.async_get(self.hass)
        found: dict[str, dict[str, Any]] = {}
        for state in self.hass.states.async_all("sensor"):
            info = self._consumable(state, entities, devices)
            if info is not None:
                info["ignored"] = state.entity_id in ignored
                found[state.entity_id] = info
        self._found = found
        self._sample()
        if self._unsub_states:
            self._unsub_states()
        self._unsub_states = async_track_state_change_event(self.hass, list(found), self._async_state_changed)
        self._changed(save=False)

    def _consumable(self, state, entities: er.EntityRegistry, devices: dr.DeviceRegistry) -> dict[str, Any] | None:
        unit = state.attributes.get("unit_of_measurement")
        if state.attributes.get("device_class") in ("battery", "signal_strength", "humidity", "temperature"):
            return None
        entry = entities.async_get(state.entity_id)
        if entry is not None and entry.platform == DOMAIN:
            return None
        words = _words(state.entity_id.split(".", 1)[1], state.attributes.get("friendly_name"))
        if any(f"_{w}" in words for w in _NEVER):
            return None
        match = next((c for c in CONSUMABLES if f"_{c[0]}_" in words or f"_{c[0]}s_" in words), None)
        if match is None:
            return None
        key, category, icon, lifetime = match
        strong = any(f"_{w}" in words for w in _STRONG)
        left = any(f"_{w}" in words for w in _LEFT)
        if key in ("sensor", "sensor_dirty") and unit not in _TIME_UNITS:
            return None  # "sensor" alone is too common a word: only a vacuum's sensors time left.
        if unit == "%":
            if not (strong or left):
                return None
        elif unit in _TIME_UNITS:
            if not left:
                return None
        else:
            return None
        device = devices.async_get(entry.device_id) if entry and entry.device_id else None
        category = self._device_category(entry, entities, category, key)
        return {
            "key": key,
            "category": category,
            "icon": icon,
            "unit": unit,
            "lifetime": lifetime,
            "source": self._source(entry),
            "device": (device.name_by_user or device.name) if device else None,
            "reset": self._reset_button(entry, entities, key),
        }

    @staticmethod
    def _device_category(entry: er.RegistryEntry | None, entities: er.EntityRegistry, default: str, key: str) -> str:
        if key in ("toner", "ink", "cartridge", "drum"):
            return "printer"
        if entry is None or entry.device_id is None:
            return default
        domains = {e.domain for e in er.async_entries_for_device(entities, entry.device_id)}
        if "vacuum" in domains:
            return "vacuum"
        if "fan" in domains or "humidifier" in domains:
            return "purifier"
        return default

    @staticmethod
    def _reset_button(entry: er.RegistryEntry | None, entities: er.EntityRegistry, key: str) -> str | None:
        """The device's own reset button for this consumable (Roborock, Xiaomi…), if any."""
        if entry is None or entry.device_id is None:
            return None
        for other in er.async_entries_for_device(entities, entry.device_id):
            words = _words(other.entity_id.split(".", 1)[1], other.original_name)
            if other.domain == "button" and "_reset_" in words and f"_{key}" in words:
                return other.entity_id
        return None

    def _source(self, entry: er.RegistryEntry | None) -> str:
        if entry is None:
            return ""
        try:
            from homeassistant.loader import async_get_loaded_integration

            return async_get_loaded_integration(self.hass, entry.platform).name
        except Exception:  # noqa: BLE001 — an unknown platform only loses its pretty name
            return entry.platform.replace("_", " ").title()

    def _value(self, entity_id: str) -> float | None:
        state = self.hass.states.get(entity_id)
        try:
            return float(state.state) if state else None
        except ValueError:
            return None

    def _sample(self) -> None:
        """One value a day per consumable; an increase (replaced) starts the samples again."""
        today = dt_util.now().date().isoformat()
        samples: dict[str, list[list[Any]]] = self._data["samples"]
        changed = False
        for entity_id in self._found:
            value = self._value(entity_id)
            if value is None:
                continue
            series = samples.setdefault(entity_id, [])
            if series and value > series[-1][1] + 0.5:
                series.clear()
            if series and series[-1][0] == today:
                if series[-1][1] != value:
                    series[-1][1] = value
                    changed = True
                continue
            series.append([today, value])
            del series[:-MAX_SAMPLES]
            changed = True
        for entity_id in [e for e in samples if e not in self._found]:
            del samples[entity_id]
            changed = True
        if changed:
            self._store.async_delay_save(lambda: self._data, SAVE_DELAY)

    def _days_left(self, entity_id: str, value: float) -> int | None:
        """Days until it runs out at the pace of the samples; None until there are enough."""
        series = self._data["samples"].get(entity_id) or []
        if len(series) < 2:
            return None
        first, last = series[0], series[-1]
        days = (date.fromisoformat(last[0]) - date.fromisoformat(first[0])).days
        used = first[1] - last[1]
        if days < MIN_SAMPLE_DAYS or used <= 0:
            return None
        return max(0, round(value / (used / days)))

    @callback
    def _async_state_changed(self, _event: Event) -> None:
        self._changed(save=False)

    async def _async_hourly(self, _now: datetime) -> None:
        self.async_discover()

    # ── Manual tasks ────────────────────────────────────────────────────────

    @property
    def tasks(self) -> list[dict[str, Any]]:
        return self._data["tasks"]

    def save_task(self, fields: dict[str, Any]) -> dict[str, Any]:
        """Create a task, or change one (fields with its id)."""
        task = next((t for t in self.tasks if t["id"] == fields.get("id")), None)
        if task is None:
            task = {"id": uuid.uuid4().hex[:10], "last_done": dt_util.now().date().isoformat()}
            self.tasks.append(task)
        for key in ("name", "every", "unit", "category", "icon", "last_done"):
            if fields.get(key) is not None:
                task[key] = str(fields[key]) if key == "last_done" else fields[key]
        task.setdefault("category", "home")
        task.setdefault("icon", "mdi:wrench")
        self._changed()
        return task

    def remove_task(self, task_id: str) -> bool:
        before = len(self.tasks)
        self._data["tasks"] = [t for t in self.tasks if t["id"] != task_id]
        self._data["notified"].pop(f"task:{task_id}", None)
        self._changed()
        return len(self.tasks) < before

    # ── Items ───────────────────────────────────────────────────────────────

    def items(self, include_ignored: bool = False) -> list[dict[str, Any]]:
        """Every tracked item, most urgent first."""
        today = dt_util.now().date()
        out = [self._task_item(t, today) for t in self.tasks]
        for entity_id, info in self._found.items():
            if info["ignored"] and not include_ignored:
                continue
            item = self._consumable_item(entity_id, info, today)
            if item is not None:
                out.append(item)
        rank = {s: i for i, s in enumerate(STATUSES)}
        return sorted(out, key=lambda i: (rank[i["status"]], i["days_left"] if i["days_left"] is not None else 10**6))

    def _task_item(self, task: dict[str, Any], today: date) -> dict[str, Any]:
        last = date.fromisoformat(task["last_done"])
        due = add_interval(last, int(task["every"]), task["unit"])
        days = (due - today).days
        status = STATUS_OVERDUE if days < 0 else STATUS_SOON if days <= self.soon_days else STATUS_OK
        return {
            "id": f"task:{task['id']}",
            "kind": KIND_TASK,
            "name": task["name"],
            "category": task.get("category", "home"),
            "icon": task.get("icon", "mdi:wrench"),
            "source": "",
            "every": int(task["every"]),
            "unit": task["unit"],
            "last_done": task["last_done"],
            "due": due.isoformat(),
            "days_left": days,
            "percent": None,
            "value": None,
            "status": status,
            "can_reset": False,
        }

    def _consumable_item(self, entity_id: str, info: dict[str, Any], today: date) -> dict[str, Any] | None:
        value = self._value(entity_id)
        if value is None:
            return None
        state = self.hass.states.get(entity_id)
        unit = info["unit"]
        if unit == "%":
            percent: float | None = value
            hours = None
        else:
            hours = value * _TIME_UNITS[unit]
            percent = min(100.0, hours / info["lifetime"] * 100) if info["lifetime"] else None
        days = self._days_left(entity_id, value)
        empty = value <= 0
        low = (percent is not None and percent <= self.soon_percent) or (days is not None and days <= self.soon_days)
        status = STATUS_OVERDUE if empty else STATUS_SOON if low else STATUS_OK
        name = _SUFFIX.sub("", state.name if state else entity_id).strip()
        return {
            "id": entity_id,
            "kind": KIND_CONSUMABLE,
            "name": name,
            "category": info["category"],
            "icon": info["icon"],
            "source": info["source"],
            "entity_id": entity_id,
            "unit": unit,
            "value": value,
            "hours": round(hours) if hours is not None else None,
            "percent": round(percent) if percent is not None else None,
            "days_left": days,
            "due": (today + timedelta(days=days)).isoformat() if days is not None else None,
            "status": status,
            "can_reset": info["reset"] is not None,
            "ignored": info["ignored"],
        }

    def counts(self) -> dict[str, int]:
        items = self.items()
        month = dt_util.now().strftime("%Y-%m")
        counts = {s: sum(i["status"] == s for i in items) for s in STATUSES}
        counts["tracked"] = len(items)
        counts["done_month"] = sum(h["time"][:7] == month for h in self._data["history"])
        return counts

    def summary(self, limit: int = 20) -> dict[str, Any]:
        """What the card shows (and the sensors' attributes carry)."""
        items = self.items()
        keep = ("id", "kind", "name", "category", "icon", "source", "percent", "hours", "days_left", "due", "status")
        keep += ("every", "unit", "can_reset")
        return {"counts": self.counts(), "items": [{k: i.get(k) for k in keep} for i in items[:limit]]}

    @property
    def history(self) -> list[dict[str, Any]]:
        return self._data["history"]

    # ── Done ────────────────────────────────────────────────────────────────

    async def async_done(self, item_id: str, by: str | None = None) -> dict[str, Any]:
        """A task done today, or a consumable replaced (the device's reset button pressed when it has one)."""
        now = dt_util.now()
        if item_id.startswith("task:"):
            task = next((t for t in self.tasks if f"task:{t['id']}" == item_id), None)
            if task is None:
                raise KeyError(item_id)
            task["last_done"] = now.date().isoformat()
            name, kind = task["name"], KIND_TASK
        else:
            info = self._found.get(item_id)
            if info is None:
                raise KeyError(item_id)
            if info["reset"]:
                await self.hass.services.async_call("button", "press", {"entity_id": info["reset"]}, blocking=True)
            self._data["samples"].pop(item_id, None)
            state = self.hass.states.get(item_id)
            name, kind = _SUFFIX.sub("", state.name if state else item_id).strip(), KIND_CONSUMABLE
        self._data["notified"].pop(item_id, None)
        record = {"time": now.isoformat(), "item": item_id, "name": name, "kind": kind, "by": by}
        self.history.insert(0, record)
        del self.history[MAX_HISTORY:]
        self.hass.bus.async_fire(EVENT_DONE, record)
        self._changed()
        return record

    # ── Reminders ───────────────────────────────────────────────────────────

    async def _async_remind(self, _now: datetime | None = None) -> int:
        """Once a day: tell about what became overdue or soon since the last time (each item once per status)."""
        service = self.options.get(CONF_NOTIFY_SERVICE)
        notified: dict[str, str] = self._data["notified"]
        fresh = [i for i in self.items() if i["status"] != STATUS_OK and notified.get(i["id"]) != i["status"]]
        for item in self.items():
            if item["status"] == STATUS_OK:
                notified.pop(item["id"], None)
        if not fresh or not service:
            return 0
        lines = [f"• {i['name']} — {text(self.hass, i['status'])}" for i in fresh[:8]]
        message = "\n".join(lines)
        title = text(self.hass, "title", n=len(fresh))
        domain, _, name = str(service).partition(".")
        if not self.hass.services.has_service(domain, name):
            _LOGGER.warning("Maintenance: %s is not an action", service)
            return 0
        payload: dict[str, Any] = {"message": message, "title": title}
        if domain == "notify_hub":
            payload |= {"priority": "info", "topic": "maintenance", "source": "Maintenance"}
        else:
            payload["data"] = {"url": "/maintenance", "clickAction": "/maintenance", "tag": "maintenance"}
        await self.hass.services.async_call(domain, name, payload, blocking=True)
        for item in fresh:
            notified[item["id"]] = item["status"]
        self._store.async_delay_save(lambda: self._data, SAVE_DELAY)
        return len(fresh)

    async def async_remind_now(self) -> int:
        return await self._async_remind()

    def notify_services(self) -> list[str]:
        services = self.hass.services.async_services()
        out = [f"notify.{n}" for n in services.get("notify", {})]
        if "send" in services.get("notify_hub", {}):
            out.insert(0, "notify_hub.send")
        return sorted(out, key=lambda s: (not s.startswith("notify_hub"), s))

    def found(self) -> list[dict[str, Any]]:
        """Every consumable sensor found, ignored or not, for the settings."""
        return [
            {"entity_id": e, "name": self.hass.states.get(e).name if self.hass.states.get(e) else e, **i}
            for e, i in self._found.items()
        ]
