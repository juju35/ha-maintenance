# Changelog

## 0.5.4 - 2026-11-24

### Fixes
- Philips Sonicare BLE: the brush head wear sensor (`brushhead_wear`) counts wear up — 0 % on a new head, 100 % when it is due. It is now read the other way round (100 % − wear = what is left), so a new head is up to date and a worn one due. It is found whatever Home Assistant's language (the German entity ID, `…_burstenkopf_verschleiss`, has no consumable word in it) (#14)
- Philips Shaver: the shaver head (`head_remaining`, counting down) is now found (#14)
- Both are recognised by their integration and translation key before the word matching; the other brush head sensors (usage, lifetime limit…) stay out. A name ending in « Wear » loses that word, as « Remaining » already did

## 0.5.3 - 2026-11-24

### Maintenance
- The panel and the card sources are split into ES modules: `src/maintenance-panel/` and `src/maintenance-card/` (entry `index.js`), cut at their sections, with the translations in one file per language (`i18n/<lang>.js`). `scripts/build-frontend.mjs` assembles them, in their original order, into the same `frontend/maintenance-panel.js` and `frontend/maintenance-card.js` as before, which are no longer committed; the release zip is unchanged.

## 0.5.2 - 2026-11-22

### Performance
- Card picker: the previews are back (`preview: true`), and light. Each card's preview is drawn only once it scrolls into view of Home Assistant's card picker, which otherwise builds the preview of every card at once: until then it holds Home Assistant's state (no render, no history request, no animation). On a dashboard or in the card editor the card is drawn as before.

## 0.5.1 - 2026-11-22

### Performance
- Card picker: the cards no longer ask Home Assistant for a live preview (`preview: false` in `window.customCards`). The picker drew every card at once (history requests, animations), which made the list slow to open; it now shows each card's description instead.

## 0.5.0 - 2026-11-21

### Features
- Panel: past 24 px of scroll the top bar folds into one sticky bar, as on the dashboards' illustrated headers (ha-dashboard-header) — the icon, title and line, the tabs as round icon pills with their counts, the status pill and the round buttons; back at the top it unfolds. The content does not move. On a narrow panel the pills get a row of their own under the bar, the status turns to a dot and only the first round button is kept.

## 0.4.2 - 2026-11-21

### Fixes

- Panel, Due tab: two devices with the same name get their own card (grouped by device id, not by name)
- A consumable's short name drops the device's name only when it is a whole word in front (« Saros 20 Filter » on a « Saros 2 » keeps its name)
- Panel on a phone: the device cards no longer overflow the screen below 372 px, the device tag of the To do rows shrinks to its icon below 520 px so the item name stays readable, and long device names end in an ellipsis instead of pushing the row

## 0.4.1 - 2026-11-21

### Fixes

- Panel: the devices have their icon (from their category; the manual tasks their own), in the head of each device card and in the device tag of the To do and Unavailable rows

## 0.4.0 - 2026-11-20

### Features

- Panel, Due tab: what is up to date is grouped by device (the manual tasks together), a compact card each with a line and a gauge per item; what is to do stays one list, most urgent first, with the device as its tag
- Consumables carry their device (`device`) and their name without the device's in front (`short`), shown in the panel

## 0.3.0 - 2026-11-20

### Features

- Panel: the task editor has an **Icon** field (`mdi:…`), like the `add_task` action
- Card: the illustration theme (`auto` / `day` / `night`) is in the visual editor
- Card and panel: the status pill also says how many items are due soon (it said "All up to date" in amber)
- Panel: option **Hide the top bar** (`hide_header`: no / for everyone / for non-admins), as on the other ha-* panels — the tabs stay, with the menu button and the round button beside them; in the options and the Settings tab
- Consumables (tanks and liquids included) whose sensor is unavailable stay in the card and the panel, greyed out and last, instead of vanishing (never counted as overdue/soon, never reminded)

### Fixes

- Card: a state update no longer rebuilds the card — it is patched in place, so the dashboard no longer jumps (the re-created card had no height for a frame) and the header animation no longer restarts; updates of other entities are ignored at once
- Panel: no longer redrawn on every Home Assistant update — a field being typed in keeps its text and focus, and Save in the settings works at the first click
- Panel: the status pill is always shown, beside the title, and the illustration sits at the right of the top bar, just left of the round button, like the other panels; the card's pill sits at the right of the header and the source chip is hidden on narrow cards (~300 px)
- An impossible last-done date (e.g. 2026-13-45) or icon sent from the panel is refused: it broke the due date of every item
- Task names are trimmed and limited to 80 characters in the `add_task` action too
- No more "Unable to remove unknown job listener" error in the log when the options change after a start
- A failing notify action no longer raises from the daily reminder: it is logged and tried again next time

### Maintenance

- Version consistency also checks `const.py` and the panel's and the card's version constants
- Browser layout check (no DOM rebuild, no height change on hass updates) in the Screenshots workflow
- Tests for the panel's task validation, the reminder retry, the diagnostics and the dashboard resource; brand logos in the README

## 0.2.0 - 2026-11-20

### Features

- Tanks and liquids: the problem binary sensors of a device's clean water tank, dirty water tank, cleaning fluid, detergent, softener and dust bin are tracked (overdue while they report a problem)
- Dock strainer time left (Roborock), with its reset button

### Fixes

- Consumables are also found from the entity's translation key, and accents are dropped from the names: with Home Assistant in another language than English (entity IDs made from the translated names, such as `temps_restant_brosse_laterale`), the brushes, filter and sensors were not found, nor their reset buttons
- The mop drying time left is no longer taken for a mop consumable

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
