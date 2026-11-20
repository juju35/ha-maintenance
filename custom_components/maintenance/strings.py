"""The few texts the tracker writes into its reminders, in Home Assistant's language."""

from __future__ import annotations

from homeassistant.core import HomeAssistant

# key: title (the reminder's title), overdue / soon (an item's status in the reminder).
TEXTS: dict[str, dict[str, str]] = {
    "en": {"title": "Maintenance · {n} to do", "overdue": "overdue", "soon": "soon"},
    "fr": {"title": "Entretien · {n} à faire", "overdue": "en retard", "soon": "bientôt"},
    "de": {"title": "Wartung · {n} zu erledigen", "overdue": "überfällig", "soon": "bald"},
    "es": {"title": "Mantenimiento · {n} pendientes", "overdue": "atrasado", "soon": "pronto"},
    "it": {"title": "Manutenzione · {n} da fare", "overdue": "in ritardo", "soon": "a breve"},
    "nl": {"title": "Onderhoud · {n} te doen", "overdue": "te laat", "soon": "binnenkort"},
    "pt": {"title": "Manutenção · {n} por fazer", "overdue": "em atraso", "soon": "em breve"},
    "pl": {"title": "Konserwacja · {n} do zrobienia", "overdue": "zaległe", "soon": "wkrótce"},
    "sr": {"title": "Одржавање · {n} за урадити", "overdue": "касни", "soon": "ускоро"},
    "sr-Latn": {"title": "Održavanje · {n} za uraditi", "overdue": "kasni", "soon": "uskoro"},
    "ro": {"title": "Întreținere · {n} de făcut", "overdue": "întârziat", "soon": "în curând"},
    "da": {"title": "Vedligeholdelse · {n} at gøre", "overdue": "forsinket", "soon": "snart"},
    "sv": {"title": "Underhåll · {n} att göra", "overdue": "försenat", "soon": "snart"},
    "bg": {"title": "Поддръжка · {n} за правене", "overdue": "просрочено", "soon": "скоро"},
    "ru": {"title": "Обслуживание · {n} к выполнению", "overdue": "просрочено", "soon": "скоро"},
    "uk": {"title": "Обслуговування · {n} до виконання", "overdue": "прострочено", "soon": "незабаром"},
    "hu": {"title": "Karbantartás · {n} teendő", "overdue": "késésben", "soon": "hamarosan"},
    "sk": {"title": "Údržba · {n} na vykonanie", "overdue": "po termíne", "soon": "čoskoro"},
    "cs": {"title": "Údržba · {n} k provedení", "overdue": "po termínu", "soon": "brzy"},
    "sl": {"title": "Vzdrževanje · {n} za opraviti", "overdue": "zamuja", "soon": "kmalu"},
    "lv": {"title": "Apkope · {n} jāpaveic", "overdue": "nokavēts", "soon": "drīz"},
    "el": {"title": "Συντήρηση · {n} εκκρεμότητες", "overdue": "εκπρόθεσμο", "soon": "σύντομα"},
}


def text(hass: HomeAssistant, key: str, **values: object) -> str:
    """The text in Home Assistant's language (its exact code, then its base language, then English)."""
    language = str(hass.config.language or "en")
    table = TEXTS.get(language) or TEXTS.get(language.split("-")[0]) or TEXTS["en"]
    template = table.get(key, TEXTS["en"][key])
    for name, value in values.items():
        template = template.replace("{" + name + "}", str(value))
    return template
