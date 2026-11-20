"""Maintenance: consumables found among the device sensors and manual tasks, their due dates, reminders and history."""

from __future__ import annotations

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .const import (
    ATTR_CATEGORY,
    ATTR_EVERY,
    ATTR_ICON,
    ATTR_ITEM,
    ATTR_LAST_DONE,
    ATTR_NAME,
    ATTR_UNIT,
    CATEGORIES,
    DOMAIN,
    SERVICE_ADD_TASK,
    SERVICE_DONE,
    SERVICE_REMOVE_TASK,
    UNITS,
)
from .panel import async_register_panel, async_remove_card, async_unregister_panel
from .tracker import MaintenanceTracker
from .websocket import async_register_websocket

PLATFORMS = [Platform.CALENDAR, Platform.SENSOR]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type MaintenanceConfigEntry = ConfigEntry[MaintenanceTracker]

DONE_SCHEMA = vol.Schema({vol.Required(ATTR_ITEM): cv.string})
TASK_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_NAME): vol.All(cv.string, vol.Strip, vol.Length(min=1, max=80)),
        vol.Required(ATTR_EVERY): vol.All(vol.Coerce(int), vol.Range(min=1, max=999)),
        vol.Optional(ATTR_UNIT, default="months"): vol.In(UNITS),
        vol.Optional(ATTR_LAST_DONE): cv.date,
        vol.Optional(ATTR_CATEGORY, default="home"): vol.In(CATEGORIES),
        vol.Optional(ATTR_ICON): cv.icon,
    }
)


def tracker_of(hass: HomeAssistant) -> MaintenanceTracker:
    """The loaded tracker (single config entry)."""
    for entry in hass.config_entries.async_loaded_entries(DOMAIN):
        return entry.runtime_data
    raise ServiceValidationError(translation_domain=DOMAIN, translation_key="not_loaded")


def _task_id(item: str) -> str:
    return item.removeprefix("task:")


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    async def done(call: ServiceCall) -> ServiceResponse:
        user = await hass.auth.async_get_user(call.context.user_id) if call.context.user_id else None
        try:
            record = await tracker_of(hass).async_done(call.data[ATTR_ITEM], user.name if user else None)
        except KeyError as err:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="unknown_item", translation_placeholders={"item": str(err)}
            ) from err
        return {"item": record["item"], "time": record["time"]}

    async def add_task(call: ServiceCall) -> ServiceResponse:
        fields = dict(call.data)
        if ATTR_LAST_DONE in fields:
            fields[ATTR_LAST_DONE] = fields[ATTR_LAST_DONE].isoformat()
        task = tracker_of(hass).save_task(fields)
        return {"item": f"task:{task['id']}"}

    async def remove_task(call: ServiceCall) -> None:
        if not tracker_of(hass).remove_task(_task_id(call.data[ATTR_ITEM])):
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="unknown_item",
                translation_placeholders={"item": call.data[ATTR_ITEM]},
            )

    hass.services.async_register(DOMAIN, SERVICE_DONE, done, DONE_SCHEMA, supports_response=SupportsResponse.OPTIONAL)
    hass.services.async_register(
        DOMAIN, SERVICE_ADD_TASK, add_task, TASK_SCHEMA, supports_response=SupportsResponse.OPTIONAL
    )
    hass.services.async_register(DOMAIN, SERVICE_REMOVE_TASK, remove_task, DONE_SCHEMA)
    async_register_websocket(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: MaintenanceConfigEntry) -> bool:
    tracker = MaintenanceTracker(hass, entry)
    await tracker.async_load()
    entry.runtime_data = tracker
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    await async_register_panel(hass)
    return True


async def _async_options_updated(hass: HomeAssistant, entry: MaintenanceConfigEntry) -> None:
    entry.runtime_data.async_options_changed()


async def async_unload_entry(hass: HomeAssistant, entry: MaintenanceConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        await entry.runtime_data.async_unload()
        async_unregister_panel(hass)
    return unloaded


async def async_remove_entry(hass: HomeAssistant, entry: MaintenanceConfigEntry) -> None:
    """The integration removed: its card leaves the dashboard resources."""
    await async_remove_card(hass)
