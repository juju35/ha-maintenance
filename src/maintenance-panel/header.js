/**
 * maintenance-panel — Maintenance's sidebar panel (administrators): what is due (consumables found among the device
 * sensors and manual tasks, with Done and the task editor), a 30-day calendar, the history and the settings (when an
 * item is "soon", reminders, consumables tracked). Talks to the integration over its WebSocket commands
 * (maintenance/state, /done, /task, /delete_task, /save, /remind). Its layout follows the other ha-* panels: an
 * illustrated header across the whole width, the tabs under it, the current tab in the address.
 * https://github.com/juju35/ha-maintenance
 */
export var MAINTENANCE_PANEL_VERSION = '0.5.3';
