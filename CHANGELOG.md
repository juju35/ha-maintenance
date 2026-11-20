# Changelog

## 0.2.0 - 2026-11-20

### Features

- Panel: the task editor has an **Icon** field (`mdi:…`), like the `add_task` action
- Card: the illustration theme (`auto` / `day` / `night`) is in the visual editor
- Card and panel: the status pill also says how many items are due soon (it said "All up to date" in amber)

### Fixes

- Card: a state update no longer rebuilds the card — it is patched in place, so the dashboard no longer jumps (the re-created card had no height for a frame) and the header animation no longer restarts; updates of other entities are ignored at once
- Panel: no longer redrawn on every Home Assistant update — a field being typed in keeps its text and focus, and Save in the settings works at the first click
- Panel: the status pill is always shown, at the title line; the card's pill sits at the right of the header and the source chip is hidden on narrow cards (~300 px)
- An impossible last-done date (e.g. 2026-13-45) or icon sent from the panel is refused: it broke the due date of every item
- Task names are trimmed and limited to 80 characters in the `add_task` action too
- No more "Unable to remove unknown job listener" error in the log when the options change after a start
- A failing notify action no longer raises from the daily reminder: it is logged and tried again next time

### Maintenance

- Version consistency also checks `const.py` and the panel's and the card's version constants
- Browser layout check (no DOM rebuild, no height change on hass updates) in the Screenshots workflow
- Tests for the panel's task validation, the reminder retry, the diagnostics and the dashboard resource; brand logos in the README

## 0.1.2 - 2026-11-20

### Fixes

- Panel: illustrated header 90 px high, like the card and the other ha-* panels (was 110 px)

## 0.1.1 - 2026-11-20

### Fixes

- The sidebar panel is now served at `/home-maintenance`: Home Assistant already uses `/maintenance`, so the panel was never added to the sidebar
- The device consumables found at startup no longer update the calendar from a worker thread (Home Assistant thread-safety error in the log)

## 0.1.0 - 2026-11-20

### Features

- Consumables found among the device sensors (filters, brushes, mops, ink, toner…), with their days left estimated from a daily sample
- Done presses the device's own reset button when it has one, and keeps a history
- Manual tasks every N days, weeks or months, in categories
- Overdue / soon / up to date statuses with configurable thresholds
- Daily reminder through any notify action or Notify Hub, each item once
- Calendar entity with the due dates
- `maintenance.done`, `maintenance.add_task`, `maintenance.remove_task` actions, `maintenance_done` event
- Sensors: overdue, due soon, tracked
- Sidebar panel (due, calendar, history, settings) with a badge while something is overdue
- Lovelace card with an animated illustrated header and the Done button
- 22 languages
