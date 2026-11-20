"""Config flow: one tracker, nothing to ask. Options: when an item is "soon", the reminders (also in the panel)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers.selector import (
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
    TextSelector,
    TimeSelector,
)

from .const import (
    CONF_NOTIFY_SERVICE,
    CONF_REMINDER_TIME,
    CONF_SOON_DAYS,
    CONF_SOON_PERCENT,
    DEFAULT_REMINDER_TIME,
    DEFAULT_SOON_DAYS,
    DEFAULT_SOON_PERCENT,
    DOMAIN,
    TITLE,
)
from .tracker import parse_time


def default_options() -> dict[str, Any]:
    return {
        CONF_SOON_DAYS: DEFAULT_SOON_DAYS,
        CONF_SOON_PERCENT: DEFAULT_SOON_PERCENT,
        CONF_REMINDER_TIME: DEFAULT_REMINDER_TIME,
    }


def _number(maximum: int, unit: str) -> NumberSelector:
    return NumberSelector(
        NumberSelectorConfig(min=0, max=maximum, step=1, mode=NumberSelectorMode.BOX, unit_of_measurement=unit)
    )


class MaintenanceConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is not None:
            return self.async_create_entry(title=TITLE, data={}, options=default_options())
        return self.async_show_form(step_id="user")

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return MaintenanceOptionsFlow()


class MaintenanceOptionsFlow(OptionsFlow):
    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        current = {**default_options(), **self.config_entry.options}
        if user_input is not None:
            options = {
                **self.config_entry.options,
                CONF_SOON_DAYS: int(user_input[CONF_SOON_DAYS]),
                CONF_SOON_PERCENT: int(user_input[CONF_SOON_PERCENT]),
                CONF_REMINDER_TIME: parse_time(user_input[CONF_REMINDER_TIME], DEFAULT_REMINDER_TIME).strftime("%H:%M"),
            }
            service = (user_input.get(CONF_NOTIFY_SERVICE) or "").strip()
            if service:
                options[CONF_NOTIFY_SERVICE] = service
            else:
                options.pop(CONF_NOTIFY_SERVICE, None)
            return self.async_create_entry(data=options)
        schema = vol.Schema(
            {
                vol.Required(CONF_SOON_DAYS, default=int(current[CONF_SOON_DAYS])): _number(365, "d"),
                vol.Required(CONF_SOON_PERCENT, default=int(current[CONF_SOON_PERCENT])): _number(100, "%"),
                vol.Required(CONF_REMINDER_TIME, default=current[CONF_REMINDER_TIME]): TimeSelector(),
                vol.Optional(
                    CONF_NOTIFY_SERVICE, description={"suggested_value": current.get(CONF_NOTIFY_SERVICE)}
                ): TextSelector(),
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema)
