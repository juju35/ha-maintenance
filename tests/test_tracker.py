"""Tracker: consumables found, statuses, tasks, done, reminders, calendar, panel commands, config flow."""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from homeassistant import config_entries
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_mock_service

from custom_components.maintenance.const import DOMAIN
from custom_components.maintenance.tracker import add_interval

NOW = "2026-11-20 10:00:00+01:00"


def _device(hass: HomeAssistant, entry: MockConfigEntry, name: str) -> str:
    return (
        dr.async_get(hass)
        .async_get_or_create(config_entry_id=entry.entry_id, identifiers={("test", name)}, name=name)
        .id
    )


def _entity(hass: HomeAssistant, entry, device_id, domain, object_id, state, attributes=None, platform="roborock"):
    er.async_get(hass).async_get_or_create(
        domain, platform, object_id, suggested_object_id=object_id, device_id=device_id, config_entry=entry
    )
    hass.states.async_set(f"{domain}.{object_id}", state, attributes or {})


@pytest.fixture
async def devices(hass: HomeAssistant):
    """A vacuum (brush hours, reset button), a purifier (filter %), a printer (ink %), a phone battery."""
    other = MockConfigEntry(domain="test")
    other.add_to_hass(hass)
    vacuum = _device(hass, other, "Robot")
    _entity(hass, other, vacuum, "vacuum", "robot", "docked")
    _entity(hass, other, vacuum, "sensor", "robot_main_brush_time_left", "100", {"unit_of_measurement": "h"})
    _entity(hass, other, vacuum, "button", "robot_reset_main_brush_consumable", "unknown")
    purifier = _device(hass, other, "Purifier")
    _entity(hass, other, purifier, "fan", "purifier", "on", platform="homekit_controller")
    _entity(
        hass,
        other,
        purifier,
        "sensor",
        "purifier_filter_life_level",
        "12",
        {"unit_of_measurement": "%"},
        "homekit_controller",
    )
    printer = _device(hass, other, "Printer")
    _entity(hass, other, printer, "sensor", "printer_black_ink", "0", {"unit_of_measurement": "%"}, "ipp")
    phone = _device(hass, other, "Phone")
    _entity(
        hass, other, phone, "sensor", "phone_battery_level", "8",
        {"unit_of_measurement": "%", "device_class": "battery"}, "mobile_app",
    )  # fmt: skip


@pytest.fixture
async def tracker(hass: HomeAssistant, devices, freezer):
    freezer.move_to(NOW)
    assert await async_setup_component(hass, "button", {})
    entry = MockConfigEntry(domain=DOMAIN, title="Maintenance", options={"soon_days": 14, "soon_percent": 15})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry.runtime_data


def _item(tracker, item_id):
    return next(i for i in tracker.items() if i["id"] == item_id)


async def test_consumables_found(tracker):
    found = {f["entity_id"]: f for f in tracker.found()}
    assert set(found) == {
        "sensor.robot_main_brush_time_left",
        "sensor.purifier_filter_life_level",
        "sensor.printer_black_ink",
    }
    assert found["sensor.robot_main_brush_time_left"]["category"] == "vacuum"
    assert found["sensor.robot_main_brush_time_left"]["reset"] == "button.robot_reset_main_brush_consumable"
    assert found["sensor.purifier_filter_life_level"]["category"] == "purifier"
    assert found["sensor.printer_black_ink"]["category"] == "printer"


async def test_statuses(tracker):
    brush = _item(tracker, "sensor.robot_main_brush_time_left")
    assert (brush["status"], brush["percent"], brush["hours"]) == ("ok", 33, 100)
    assert _item(tracker, "sensor.purifier_filter_life_level")["status"] == "soon"
    assert _item(tracker, "sensor.printer_black_ink")["status"] == "overdue"
    assert tracker.items()[0]["status"] == "overdue"
    counts = tracker.counts()
    assert (counts["overdue"], counts["soon"], counts["ok"], counts["tracked"]) == (1, 1, 1, 3)


async def test_done_consumable_presses_reset(hass: HomeAssistant, tracker):
    presses = async_mock_service(hass, "button", "press")
    await hass.services.async_call(DOMAIN, "done", {"item": "sensor.robot_main_brush_time_left"}, blocking=True)
    assert presses[0].data["entity_id"] == "button.robot_reset_main_brush_consumable"
    assert tracker.history[0]["item"] == "sensor.robot_main_brush_time_left"


async def test_task_cycle(hass: HomeAssistant, tracker):
    last = (dt_util.now().date() - timedelta(days=40)).isoformat()
    response = await hass.services.async_call(
        DOMAIN, "add_task", {"name": "Smoke detectors", "every": 1, "unit": "months", "last_done": last},
        blocking=True, return_response=True,
    )  # fmt: skip
    item_id = response["item"]
    assert _item(tracker, item_id)["status"] == "overdue"
    await hass.services.async_call(DOMAIN, "done", {"item": item_id}, blocking=True)
    task = _item(tracker, item_id)
    assert task["status"] == "ok"
    assert task["due"] == "2026-12-20"
    await hass.services.async_call(DOMAIN, "remove_task", {"item": item_id}, blocking=True)
    assert not [i for i in tracker.items() if i["id"] == item_id]


async def test_days_left_from_samples(tracker):
    today = dt_util.now().date()
    tracker._data["samples"]["sensor.purifier_filter_life_level"] = [
        [(today - timedelta(days=10)).isoformat(), 22.0],
        [today.isoformat(), 12.0],
    ]
    assert _item(tracker, "sensor.purifier_filter_life_level")["days_left"] == 12


def test_add_interval():
    assert add_interval(date(2026, 1, 31), 1, "months") == date(2026, 2, 28)
    assert add_interval(date(2026, 11, 20), 2, "weeks") == date(2026, 12, 4)
    assert add_interval(date(2026, 12, 15), 3, "months") == date(2027, 3, 15)


async def test_reminder_once_per_status(hass: HomeAssistant, tracker):
    calls: list[ServiceCall] = async_mock_service(hass, "notify", "phone")
    hass.config_entries.async_update_entry(
        tracker.entry, options={**tracker.entry.options, "notify_service": "notify.phone"}
    )
    await hass.async_block_till_done()
    assert await tracker.async_remind_now() == 2
    assert "purifier filter — soon" in calls[0].data["message"]
    assert await tracker.async_remind_now() == 0


async def test_calendar(hass: HomeAssistant, tracker):
    await hass.services.async_call(
        DOMAIN, "add_task", {"name": "Boiler", "every": 2, "unit": "weeks", "last_done": "2026-11-13"}, blocking=True
    )
    await hass.async_block_till_done()
    response = await hass.services.async_call(
        "calendar", "get_events",
        {
            "entity_id": "calendar.maintenance_due_dates",
            "start_date_time": "2026-11-20 00:00:00",
            "duration": {"days": 30},
        },
        blocking=True, return_response=True,
    )  # fmt: skip
    starts = [e["start"] for e in response["calendar.maintenance_due_dates"]["events"] if e["summary"] == "Boiler"]
    assert starts == ["2026-11-27", "2026-12-11"]


async def test_panel_commands(hass: HomeAssistant, tracker, hass_ws_client):
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": f"{DOMAIN}/task", "task": {"name": "Gutters", "every": 6, "unit": "months"}}
    )
    task = (await client.receive_json())["result"]
    await client.send_json_auto_id({"type": f"{DOMAIN}/save", "options": {"ignored": ["sensor.printer_black_ink"]}})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    await client.send_json_auto_id({"type": f"{DOMAIN}/state"})
    state = (await client.receive_json())["result"]
    ids = {i["id"] for i in state["items"]}
    assert f"task:{task['id']}" in ids
    assert "sensor.printer_black_ink" not in ids
    assert state["counts"]["overdue"] == 0
    await client.send_json_auto_id({"type": f"{DOMAIN}/delete_task", "task": task["id"]})
    assert (await client.receive_json())["result"] == {"removed": True}


async def test_sensors(hass: HomeAssistant, tracker):
    state = hass.states.get("sensor.maintenance_overdue")
    assert state.state == "1"
    assert state.attributes["maintenance"] is True
    assert state.attributes["items"][0]["id"] == "sensor.printer_black_ink"


async def test_config_flow(hass: HomeAssistant):
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    await hass.async_block_till_done()
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"soon_days": 7, "soon_percent": 10, "reminder_time": "08:30:00", "notify_service": ""}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert entry.options == {"soon_days": 7, "soon_percent": 10, "reminder_time": "08:30", "hide_header": "off"}
    again = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert again["type"] is FlowResultType.ABORT


async def test_not_consumables(hass: HomeAssistant, tracker):
    """Words that look like a consumable on sensors that are not one."""
    hass.states.async_set("sensor.garden_soil_sensor_level", "40", {"unit_of_measurement": "%"})
    hass.states.async_set("sensor.fridge_filter_status", "ok", {})
    hass.states.async_set("sensor.vacuum_brush_lifespan", "80", {"unit_of_measurement": "%"})
    tracker.async_discover()
    found = {f["entity_id"] for f in tracker.found()}
    assert "sensor.garden_soil_sensor_level" not in found
    assert "sensor.fridge_filter_status" not in found
    assert "sensor.vacuum_brush_lifespan" in found


async def test_options_change_after_startup_logs_nothing(hass: HomeAssistant, devices, freezer, caplog):
    """Set up before Home Assistant has started: the start listener, once fired, is not removed again later."""
    from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
    from homeassistant.core import CoreState

    freezer.move_to(NOW)
    hass.set_state(CoreState.starting)
    entry = MockConfigEntry(domain=DOMAIN, title="Maintenance", options={"soon_days": 14, "soon_percent": 15})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    hass.set_state(CoreState.running)
    hass.bus.async_fire(EVENT_HOMEASSISTANT_STARTED)
    await hass.async_block_till_done()
    assert entry.runtime_data.found()
    hass.config_entries.async_update_entry(entry, options={**entry.options, "soon_days": 7})
    await hass.async_block_till_done()
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert "Unable to remove unknown job listener" not in caplog.text


async def test_panel_task_validation(hass: HomeAssistant, tracker, hass_ws_client):
    """An impossible date or icon is refused, so a stored task can never break every due date."""
    client = await hass_ws_client(hass)
    for task in (
        {"name": "Gutters", "every": 6, "unit": "months", "last_done": "2026-13-45"},
        {"name": "Gutters", "every": 6, "unit": "months", "icon": "not an icon"},
        {"name": "   ", "every": 6, "unit": "months"},
    ):
        await client.send_json_auto_id({"type": f"{DOMAIN}/task", "task": task})
        response = await client.receive_json()
        assert not response["success"]
        assert response["error"]["code"] == "invalid"
    await client.send_json_auto_id(
        {"type": f"{DOMAIN}/task", "task": {"name": " Gutters ", "every": 6, "unit": "months", "icon": "mdi:leaf",
                                            "last_done": "2026-05-01"}}
    )  # fmt: skip
    task = (await client.receive_json())["result"]
    assert (task["name"], task["icon"], task["last_done"]) == ("Gutters", "mdi:leaf", "2026-05-01")
    assert _item(tracker, f"task:{task['id']}")["due"] == "2026-11-01"


async def test_reminder_failure_is_retried(hass: HomeAssistant, tracker):
    from homeassistant.exceptions import HomeAssistantError

    async def broken(call: ServiceCall) -> None:
        raise HomeAssistantError("offline")

    hass.services.async_register("notify", "broken", broken)
    hass.config_entries.async_update_entry(
        tracker.entry, options={**tracker.entry.options, "notify_service": "notify.broken"}
    )
    await hass.async_block_till_done()
    assert await tracker.async_remind_now() == 0
    calls = async_mock_service(hass, "notify", "broken")
    assert await tracker.async_remind_now() == 2
    assert len(calls) == 1


async def test_diagnostics_leave_names_out(hass: HomeAssistant, tracker):
    from custom_components.maintenance.diagnostics import async_get_config_entry_diagnostics

    tracker.save_task({"name": "Secret chore", "every": 1, "unit": "weeks"})
    data = await async_get_config_entry_diagnostics(hass, tracker.entry)
    assert "Secret chore" not in str(data)
    assert data["counts"]["tracked"] == 4


class _Resources:
    """A dashboard resources collection in storage mode."""

    def __init__(self, items):
        self.items = [dict(i) for i in items]

    async def async_get_info(self):
        return {}

    def async_items(self):
        return self.items

    async def async_create_item(self, data):
        self.items.append({"id": str(len(self.items) + 1), **data})

    async def async_update_item(self, item_id, data):
        next(i for i in self.items if i["id"] == item_id).update(data)

    async def async_delete_item(self, item_id):
        self.items = [i for i in self.items if i["id"] != item_id]


async def test_card_resource(hass: HomeAssistant):
    from custom_components.maintenance import panel

    url = "/maintenance_static/maintenance-card.js"
    resources = _Resources(
        [{"id": "1", "url": f"{url}?v=0.1.0", "res_type": "module"}, {"id": "2", "url": url, "res_type": "module"}]
    )
    hass.data["lovelace"] = {"resource_mode": "storage", "resources": resources}
    assert await panel._async_register_resource(hass, f"{url}?v=9.9.9")
    assert [i["url"] for i in resources.items] == [f"{url}?v=9.9.9"]
    await panel.async_remove_card(hass)
    assert resources.items == []
    assert await panel._async_register_resource(hass, f"{url}?v=9.9.9")
    assert len(resources.items) == 1
    hass.data["lovelace"] = {"resource_mode": "yaml", "resources": resources}
    assert not await panel._async_register_resource(hass, f"{url}?v=9.9.9")


async def test_unavailable_consumable_greyed(hass: HomeAssistant, tracker):
    """An unavailable consumable stays listed, last, with no due date, never counted nor reminded."""
    calls = async_mock_service(hass, "notify", "phone")
    hass.config_entries.async_update_entry(
        tracker.entry, options={**tracker.entry.options, "notify_service": "notify.phone"}
    )
    await hass.async_block_till_done()
    hass.states.async_set("sensor.purifier_filter_life_level", "unavailable", {"unit_of_measurement": "%"})
    await hass.async_block_till_done()
    item = _item(tracker, "sensor.purifier_filter_life_level")
    assert (item["status"], item["percent"], item["due"]) == ("unavailable", None, None)
    assert tracker.items()[-1]["id"] == "sensor.purifier_filter_life_level"
    counts = tracker.counts()
    assert (counts["soon"], counts["unavailable"], counts["tracked"]) == (0, 1, 3)
    assert await tracker.async_remind_now() == 1
    assert "purifier" not in calls[0].data["message"].lower()


async def test_hide_header_option(hass: HomeAssistant, tracker, hass_ws_client):
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": f"{DOMAIN}/save", "options": {"hide_header": "all"}})
    assert (await client.receive_json())["result"]["options"]["hide_header"] == "all"
    await client.send_json_auto_id({"type": f"{DOMAIN}/save", "options": {"hide_header": "sometimes"}})
    assert not (await client.receive_json())["success"]
