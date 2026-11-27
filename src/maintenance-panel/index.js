// Entry point: the panel's modules in their original order. scripts/bundle.mjs concatenates them in this order into the
// single classic script the panel ships as.
import "./header.js";
import "./i18n/mt-panel-i18n.js";
import "./core.js";
import "./fold-css.js";
import "./fold.js";
import "../maintenance-card/scene.js";
import "./panel.js";
