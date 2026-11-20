"""WebSocket commands of the panel: its state, mark done, save or delete a task, save the options, remind now."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback

from .const import (
    CATEGORIES,
    CONF_IGNORED,
    CONF_NOTIFY_SERVICE,
    CONF_REMINDER_TIME,
    CONF_SOON_DAYS,
    CONF_SOON_PERCENT,
    DEFAULT_REMINDER_TIME,
    DOMAIN,
    UNITS,
    VERSION,
)
from .tracker import MaintenanceTracker, parse_time

OPTION_SCHEMA = vol.Schema(
    {
        vol.Optional(CONF_SOON_DAYS): vol.All(vol.Coerce(int), vol.Range(min=0, max=365)),
        vol.Optional(CONF_SOON_PERCENT): vol.All(vol.Coerce(int), vol.Range(min=0, max=100)),
        vol.Optional(CONF_REMINDER_TIME): str,
        vol.Optional(CONF_NOTIFY_SERVICE): vol.Any(None, str),
        vol.Optional(CONF_IGNORED): [str],
    }
)
TASK_SCHEMA = vol.Schema(
    {
        vol.Optional("id"): str,
        vol.Required("name"): vol.All(str, vol.Length(min=1, max=80)),
        vol.Required("every"): vol.All(vol.Coerce(int), vol.Range(min=1, max=999)),
        vol.Required("unit"): vol.In(UNITS),
        vol.Optional("category", default="home"): vol.In(CATEGORIES),
        vol.Optional("icon"): str,
        vol.Optional("last_done"): vol.Match(r"^\d{4}-\d{2}-\d{2}$"),
    }
)


def _tracker(hass: HomeAssistant) -> MaintenanceTracker | None:
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state is ConfigEntryState.LOADED:
            return entry.runtime_data
    return None


@callback
def async_register_websocket(hass: HomeAssistant) -> None:
    for command in (ws_state, ws_done, ws_task, ws_delete, ws_save, ws_remind):
        websocket_api.async_register_command(hass, command)


def _loaded(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> MaintenanceTracker | None:
    """The tracker, or None once the error is sent."""
    tracker = _tracker(hass)
    if tracker is None:
        connection.send_error(msg["id"], "not_loaded", "Maintenance is not set up")
    return tracker


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/state"})
@callback
def ws_state(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Everything the panel shows: items, counts, tasks, history, consumables found, options, notify actions."""
    if (tracker := _loaded(hass, connection, msg)) is None:
        return
    connection.send_result(
        msg["id"],
        {
            "version": VERSION,
            "items": tracker.items(),
            "counts": tracker.counts(),
            "tasks": tracker.tasks,
            "history": tracker.history[:100],
            "found": [
                {k: f.get(k) for k in ("entity_id", "name", "category", "source", "ignored")} for f in tracker.found()
            ],
            "services": tracker.notify_services(),
            "options": dict(tracker.entry.options),
        },
    )


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/done", vol.Required("item"): str})
@websocket_api.async_response
async def ws_done(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (tracker := _loaded(hass, connection, msg)) is None:
        return
    user = connection.user
    try:
        record = await tracker.async_done(msg["item"], user.name if user else None)
    except KeyError:
        connection.send_error(msg["id"], "not_found", f"Unknown item {msg['item']}")
        return
    connection.send_result(msg["id"], record)


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/task", vol.Required("task"): dict})
@callback
def ws_task(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (tracker := _loaded(hass, connection, msg)) is None:
        return
    try:
        fields = TASK_SCHEMA(msg["task"])
    except vol.Invalid as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return
    connection.send_result(msg["id"], tracker.save_task(fields))


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/delete_task", vol.Required("task"): str})
@callback
def ws_delete(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (tracker := _loaded(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], {"removed": tracker.remove_task(msg["task"].removeprefix("task:"))})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/save", vol.Required("options"): dict})
@callback
def ws_save(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Merge the changed options into the entry's."""
    if (tracker := _loaded(hass, connection, msg)) is None:
        return
    try:
        changes = OPTION_SCHEMA(msg["options"])
    except vol.Invalid as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return
    if CONF_REMINDER_TIME in changes:
        changes[CONF_REMINDER_TIME] = parse_time(changes[CONF_REMINDER_TIME], DEFAULT_REMINDER_TIME).strftime("%H:%M")
    if CONF_IGNORED in changes:
        changes[CONF_IGNORED] = sorted(set(changes[CONF_IGNORED]))
    options = {**tracker.entry.options, **changes}
    if not options.get(CONF_NOTIFY_SERVICE):
        options.pop(CONF_NOTIFY_SERVICE, None)
    hass.config_entries.async_update_entry(tracker.entry, options=options)
    connection.send_result(msg["id"], {"options": options})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/remind"})
@websocket_api.async_response
async def ws_remind(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (tracker := _loaded(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], {"sent": await tracker.async_remind_now()})
