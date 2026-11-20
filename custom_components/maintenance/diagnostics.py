"""Diagnostics: the options, the counts, the consumables found and the tasks (their names left out)."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant

from .tracker import MaintenanceTracker


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry) -> dict[str, Any]:
    tracker: MaintenanceTracker = entry.runtime_data
    return {
        "options": dict(entry.options),
        "counts": tracker.counts(),
        "found": [
            {k: f.get(k) for k in ("entity_id", "key", "category", "unit", "source", "reset", "ignored")}
            for f in tracker.found()
        ],
        "tasks": [{k: t.get(k) for k in ("every", "unit", "category", "last_done")} for t in tracker.tasks],
        "history": len(tracker.history),
    }
