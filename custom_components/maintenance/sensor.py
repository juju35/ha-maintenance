"""Sensors: items overdue (the card's and the sidebar badge's source), due soon, and tracked."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, TITLE
from .tracker import MaintenanceTracker

KEYS = ("overdue", "soon", "tracked")


def device_info(tracker: MaintenanceTracker) -> DeviceInfo:
    return DeviceInfo(
        identifiers={(DOMAIN, tracker.entry.entry_id)},
        name=TITLE,
        manufacturer="juju35",
        entry_type=DeviceEntryType.SERVICE,
    )


async def async_setup_entry(hass: HomeAssistant, entry, async_add_entities: AddEntitiesCallback) -> None:
    tracker: MaintenanceTracker = entry.runtime_data
    async_add_entities(MaintenanceSensor(tracker, key) for key in KEYS)


class MaintenanceSensor(SensorEntity):
    """One count; the `overdue` one carries what the card shows."""

    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, tracker: MaintenanceTracker, key: str) -> None:
        self.tracker = tracker
        self.key = key
        self._attr_translation_key = key
        self._attr_unique_id = f"{tracker.entry.entry_id}_{key}"
        self._attr_device_info = device_info(tracker)
        if key == "overdue":
            # The card's source: every change shows at once, kept out of the recorder.
            self._unrecorded_attributes = frozenset({"items", "counts"})

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.tracker.async_add_listener(self._update))

    @callback
    def _update(self) -> None:
        self.async_write_ha_state()

    @property
    def native_value(self) -> int:
        return self.tracker.counts()[self.key]

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        if self.key != "overdue":
            return None
        return {"maintenance": True, **self.tracker.summary(12)}
