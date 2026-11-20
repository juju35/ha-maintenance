"""Calendar: the due dates of the manual tasks (and their next occurrences) and the estimated end of the consumables."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import KIND_TASK
from .sensor import device_info
from .tracker import MaintenanceTracker, add_interval

MAX_OCCURRENCES = 60


async def async_setup_entry(hass: HomeAssistant, entry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([MaintenanceCalendar(entry.runtime_data)])


class MaintenanceCalendar(CalendarEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_translation_key = "due"

    def __init__(self, tracker: MaintenanceTracker) -> None:
        self.tracker = tracker
        self._attr_unique_id = f"{tracker.entry.entry_id}_calendar"
        self._attr_device_info = device_info(tracker)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.tracker.async_add_listener(self._update))

    @callback
    def _update(self) -> None:
        self.async_write_ha_state()

    def _events(self, start: date, end: date) -> list[CalendarEvent]:
        events: list[CalendarEvent] = []
        for item in self.tracker.items():
            if not item.get("due"):
                continue
            day = date.fromisoformat(item["due"])
            for _ in range(MAX_OCCURRENCES):
                if day >= end:
                    break
                if day >= start:
                    events.append(
                        CalendarEvent(start=day, end=day + timedelta(days=1), summary=item["name"], uid=item["id"])
                    )
                if item["kind"] != KIND_TASK:
                    break
                day = add_interval(day, item["every"], item["unit"])
        return sorted(events, key=lambda e: e.start)

    @property
    def event(self) -> CalendarEvent | None:
        today = dt_util.now().date()
        # An overdue task shows today, so the calendar's state says there is something to do.
        upcoming = []
        for item in self.tracker.items():
            if item.get("due"):
                day = max(date.fromisoformat(item["due"]), today)
                upcoming.append(CalendarEvent(start=day, end=day + timedelta(days=1), summary=item["name"]))
        return min(upcoming, key=lambda e: e.start, default=None)

    async def async_get_events(self, hass: HomeAssistant, start_date: datetime, end_date: datetime) -> list:
        return self._events(dt_util.as_local(start_date).date(), dt_util.as_local(end_date).date() + timedelta(days=1))
