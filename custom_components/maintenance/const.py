"""Constants of Maintenance."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "maintenance"
TITLE: Final = "Maintenance"
VERSION: Final = "0.5.2"

# Status of an item, most urgent first.
STATUS_OVERDUE: Final = "overdue"
STATUS_SOON: Final = "soon"
STATUS_OK: Final = "ok"
# A consumable whose sensor is unavailable: shown greyed out, last, never counted nor reminded.
STATUS_UNAVAILABLE: Final = "unavailable"
STATUSES: Final = (STATUS_OVERDUE, STATUS_SOON, STATUS_OK)

KIND_TASK: Final = "task"
KIND_CONSUMABLE: Final = "consumable"

CATEGORIES: Final = ("vacuum", "purifier", "printer", "safety", "home", "garden", "vehicle", "other")
UNITS: Final = ("days", "weeks", "months")

# Options (all have a default: nothing to fill in at setup).
CONF_SOON_DAYS: Final = "soon_days"
CONF_SOON_PERCENT: Final = "soon_percent"
CONF_REMINDER_TIME: Final = "reminder_time"
CONF_NOTIFY_SERVICE: Final = "notify_service"
CONF_IGNORED: Final = "ignored"
# Who the panel's illustrated top bar is hidden for (the tabs stay), as on the other ha-* panels.
CONF_HIDE_HEADER: Final = "hide_header"
HIDE_HEADER_OFF: Final = "off"
HIDE_HEADER_CHOICES: Final = (HIDE_HEADER_OFF, "all", "non_admin")

DEFAULT_SOON_DAYS: Final = 14
DEFAULT_SOON_PERCENT: Final = 15
DEFAULT_REMINDER_TIME: Final = "09:00"

# Actions.
SERVICE_DONE: Final = "done"
SERVICE_ADD_TASK: Final = "add_task"
SERVICE_REMOVE_TASK: Final = "remove_task"
ATTR_ITEM: Final = "item"
ATTR_NAME: Final = "name"
ATTR_EVERY: Final = "every"
ATTR_UNIT: Final = "unit"
ATTR_LAST_DONE: Final = "last_done"
ATTR_CATEGORY: Final = "category"
ATTR_ICON: Final = "icon"

EVENT_DONE: Final = f"{DOMAIN}_done"

# Not "maintenance": Home Assistant already serves a panel at that path.
PANEL_URL: Final = "home-maintenance"
PANEL_ICON: Final = "mdi:wrench-clock"

STORAGE_VERSION: Final = 1
MAX_HISTORY: Final = 300
# Samples kept per consumable, one a day, to estimate how fast it wears.
MAX_SAMPLES: Final = 60
# Days of samples needed before an estimate is shown.
MIN_SAMPLE_DAYS: Final = 3
