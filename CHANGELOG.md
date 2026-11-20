# Changelog

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
