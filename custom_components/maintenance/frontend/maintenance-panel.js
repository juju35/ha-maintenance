/**
 * maintenance-panel — Maintenance's sidebar panel (administrators): what is due (consumables found among the device
 * sensors and manual tasks, with Done and the task editor), a 30-day calendar, the history and the settings (when an
 * item is "soon", reminders, consumables tracked). Talks to the integration over its WebSocket commands
 * (maintenance/state, /done, /task, /delete_task, /save, /remind). Its layout follows the other ha-* panels: an
 * illustrated header across the whole width, the tabs under it, the current tab in the address.
 * https://github.com/juju35/ha-maintenance
 */
var MAINTENANCE_PANEL_VERSION = '0.1.0';

var MT_PANEL_I18N = {
  en: { title: "Maintenance", tracked_n: "{n} tracked", overdue_n: "{n} overdue", all_good: "All up to date", next: "Next: {name}, {when}", done: "Done", overdue_days: "Overdue by {n} d", due_today: "Due today", in_days: "In {n} d", in_months: "In {n} months", left_pct: "{p} % left", left_hours: "≈ {n} h", left_days: "≈ {n} days", empty: "Empty", every_days: "every {n} d", every_weeks: "every {n} wk", every_months: "every {n} mo", manual: "Manual", nothing: "Nothing tracked yet", not_found: "Maintenance is not set up", card_name: "Maintenance Card", card_desc: "Filters, brushes, ink and chores: what is overdue, what comes next", ed_entity: "Sensor", ed_title: "Title", ed_rows: "Rows", ed_language: "Language", c_overdue: "Overdue", c_soon: "Soon", c_ok: "Up to date", c_done_month: "Done this month", cat_vacuum: "Vacuum", cat_purifier: "Air purifier", cat_printer: "Printer", cat_safety: "Safety", cat_home: "Home", cat_garden: "Garden", cat_vehicle: "Vehicle", cat_other: "Other", tab_due: "Due", tab_calendar: "Calendar", tab_history: "History", tab_settings: "Settings", subtitle: "{n} tracked · {a} found automatically · {b} manual tasks", soon_hint: "≤ {d} d or ≤ {p} %", f_all: "All", f_consumables: "Consumables", f_tasks: "Tasks", g_todo: "To do", g_ok: "Up to date", add_task: "Add a task", edit: "Edit", delete: "Delete", save: "Save", cancel: "Cancel", f_name: "Name", f_every: "Every", f_unit: "Unit", u_days: "days", u_weeks: "weeks", u_months: "months", f_category: "Category", f_last: "Last done", cal_next30: "Next 30 days", today: "Today", cal_list: "Coming up", no_due: "Nothing due in the next 30 days", h_empty: "Nothing done yet", h_by: "by {who}", s_thresholds: "When is it soon", s_soon_days: "Days before a due date", s_soon_percent: "Consumable low at (%)", s_reminders: "Reminders", s_time: "Daily reminder at", s_service: "Send through", s_none: "No reminder", remind_now: "Send the reminder now", s_found: "Consumables found", s_found_text: "Uncheck a sensor to stop tracking it.", saved: "Saved", sent: "Sent", error: "Error" },
  fr: { title: "Entretien", tracked_n: "{n} suivis", overdue_n: "{n} en retard", all_good: "Tout est à jour", next: "Prochain : {name}, {when}", done: "Fait", overdue_days: "En retard de {n} j", due_today: "À faire aujourd’hui", in_days: "Dans {n} j", in_months: "Dans {n} mois", left_pct: "{p} % restant", left_hours: "≈ {n} h", left_days: "≈ {n} jours", empty: "Vide", every_days: "tous les {n} j", every_weeks: "toutes les {n} sem.", every_months: "tous les {n} mois", manual: "Manuel", nothing: "Rien de suivi pour l’instant", not_found: "Maintenance n’est pas configurée", card_name: "Carte Maintenance", card_desc: "Filtres, brosses, encre et tâches : ce qui est en retard, ce qui vient", ed_entity: "Capteur", ed_title: "Titre", ed_rows: "Lignes", ed_language: "Langue", c_overdue: "En retard", c_soon: "Bientôt", c_ok: "À jour", c_done_month: "Faits ce mois-ci", cat_vacuum: "Aspirateur", cat_purifier: "Purificateurs", cat_printer: "Imprimante", cat_safety: "Sécurité", cat_home: "Maison", cat_garden: "Jardin", cat_vehicle: "Véhicule", cat_other: "Autre", tab_due: "Échéances", tab_calendar: "Calendrier", tab_history: "Historique", tab_settings: "Réglages", subtitle: "{n} suivis · {a} détectés automatiquement · {b} tâches manuelles", soon_hint: "≤ {d} j ou ≤ {p} %", f_all: "Tout", f_consumables: "Consommables", f_tasks: "Tâches", g_todo: "À faire", g_ok: "À jour", add_task: "Ajouter une tâche", edit: "Modifier", delete: "Supprimer", save: "Enregistrer", cancel: "Annuler", f_name: "Nom", f_every: "Tous les", f_unit: "Unité", u_days: "jours", u_weeks: "semaines", u_months: "mois", f_category: "Catégorie", f_last: "Dernière fois", cal_next30: "30 prochains jours", today: "Aujourd’hui", cal_list: "À venir", no_due: "Rien d’ici 30 jours", h_empty: "Rien de fait pour l’instant", h_by: "par {who}", s_thresholds: "Quand est-ce bientôt", s_soon_days: "Jours avant l’échéance", s_soon_percent: "Consommable bas à (%)", s_reminders: "Rappels", s_time: "Rappel quotidien à", s_service: "Envoyer via", s_none: "Aucun rappel", remind_now: "Envoyer le rappel maintenant", s_found: "Consommables détectés", s_found_text: "Décochez un capteur pour ne plus le suivre.", saved: "Enregistré", sent: "Envoyé", error: "Erreur" },
  de: { title: "Wartung", tracked_n: "{n} verfolgt", overdue_n: "{n} überfällig", all_good: "Alles aktuell", next: "Nächste: {name}, {when}", done: "Erledigt", overdue_days: "{n} T. überfällig", due_today: "Heute fällig", in_days: "In {n} T.", in_months: "In {n} Monaten", left_pct: "{p} % übrig", left_hours: "≈ {n} Std.", left_days: "≈ {n} Tage", empty: "Leer", every_days: "alle {n} T.", every_weeks: "alle {n} Wo.", every_months: "alle {n} Mon.", manual: "Manuell", nothing: "Noch nichts verfolgt", not_found: "Maintenance ist nicht eingerichtet", card_name: "Maintenance-Karte", card_desc: "Filter, Bürsten, Tinte und Aufgaben: was überfällig ist, was als Nächstes kommt", ed_entity: "Sensor", ed_title: "Titel", ed_rows: "Zeilen", ed_language: "Sprache", c_overdue: "Überfällig", c_soon: "Bald", c_ok: "Aktuell", c_done_month: "Diesen Monat erledigt", cat_vacuum: "Staubsauger", cat_purifier: "Luftreiniger", cat_printer: "Drucker", cat_safety: "Sicherheit", cat_home: "Haus", cat_garden: "Garten", cat_vehicle: "Fahrzeug", cat_other: "Sonstiges", tab_due: "Fälligkeiten", tab_calendar: "Kalender", tab_history: "Verlauf", tab_settings: "Einstellungen", subtitle: "{n} verfolgt · {a} automatisch gefunden · {b} manuelle Aufgaben", soon_hint: "≤ {d} T. oder ≤ {p} %", f_all: "Alle", f_consumables: "Verbrauchsmaterial", f_tasks: "Aufgaben", g_todo: "Zu erledigen", g_ok: "Aktuell", add_task: "Aufgabe hinzufügen", edit: "Bearbeiten", delete: "Löschen", save: "Speichern", cancel: "Abbrechen", f_name: "Name", f_every: "Alle", f_unit: "Einheit", u_days: "Tage", u_weeks: "Wochen", u_months: "Monate", f_category: "Kategorie", f_last: "Zuletzt erledigt", cal_next30: "Nächste 30 Tage", today: "Heute", cal_list: "Demnächst", no_due: "In den nächsten 30 Tagen nichts fällig", h_empty: "Noch nichts erledigt", h_by: "von {who}", s_thresholds: "Wann ist es bald", s_soon_days: "Tage vor der Fälligkeit", s_soon_percent: "Verbrauchsmaterial niedrig bei (%)", s_reminders: "Erinnerungen", s_time: "Tägliche Erinnerung um", s_service: "Senden über", s_none: "Keine Erinnerung", remind_now: "Erinnerung jetzt senden", s_found: "Gefundene Verbrauchsmaterialien", s_found_text: "Sensor abwählen, um ihn nicht mehr zu verfolgen.", saved: "Gespeichert", sent: "Gesendet", error: "Fehler" },
  es: { title: "Mantenimiento", tracked_n: "{n} seguidos", overdue_n: "{n} atrasados", all_good: "Todo al día", next: "Siguiente: {name}, {when}", done: "Hecho", overdue_days: "Atrasado {n} d", due_today: "Vence hoy", in_days: "En {n} d", in_months: "En {n} meses", left_pct: "Queda {p} %", left_hours: "≈ {n} h", left_days: "≈ {n} días", empty: "Vacío", every_days: "cada {n} d", every_weeks: "cada {n} sem.", every_months: "cada {n} meses", manual: "Manual", nothing: "Aún no se sigue nada", not_found: "Maintenance no está configurado", card_name: "Tarjeta Maintenance", card_desc: "Filtros, cepillos, tinta y tareas: lo atrasado y lo próximo", ed_entity: "Sensor", ed_title: "Título", ed_rows: "Filas", ed_language: "Idioma", c_overdue: "Atrasados", c_soon: "Pronto", c_ok: "Al día", c_done_month: "Hechos este mes", cat_vacuum: "Aspiradora", cat_purifier: "Purificadores", cat_printer: "Impresora", cat_safety: "Seguridad", cat_home: "Casa", cat_garden: "Jardín", cat_vehicle: "Vehículo", cat_other: "Otro", tab_due: "Vencimientos", tab_calendar: "Calendario", tab_history: "Historial", tab_settings: "Ajustes", subtitle: "{n} seguidos · {a} detectados automáticamente · {b} tareas manuales", soon_hint: "≤ {d} d o ≤ {p} %", f_all: "Todo", f_consumables: "Consumibles", f_tasks: "Tareas", g_todo: "Pendiente", g_ok: "Al día", add_task: "Añadir una tarea", edit: "Editar", delete: "Eliminar", save: "Guardar", cancel: "Cancelar", f_name: "Nombre", f_every: "Cada", f_unit: "Unidad", u_days: "días", u_weeks: "semanas", u_months: "meses", f_category: "Categoría", f_last: "Última vez", cal_next30: "Próximos 30 días", today: "Hoy", cal_list: "Próximamente", no_due: "Nada vence en los próximos 30 días", h_empty: "Aún no se ha hecho nada", h_by: "por {who}", s_thresholds: "Cuándo es pronto", s_soon_days: "Días antes del vencimiento", s_soon_percent: "Consumible bajo al (%)", s_reminders: "Recordatorios", s_time: "Recordatorio diario a las", s_service: "Enviar mediante", s_none: "Sin recordatorio", remind_now: "Enviar el recordatorio ahora", s_found: "Consumibles detectados", s_found_text: "Desmarca un sensor para dejar de seguirlo.", saved: "Guardado", sent: "Enviado", error: "Error" },
  it: { title: "Manutenzione", tracked_n: "{n} monitorati", overdue_n: "{n} in ritardo", all_good: "Tutto in regola", next: "Prossimo: {name}, {when}", done: "Fatto", overdue_days: "In ritardo di {n} g", due_today: "Scade oggi", in_days: "Tra {n} g", in_months: "Tra {n} mesi", left_pct: "{p} % rimasto", left_hours: "≈ {n} h", left_days: "≈ {n} giorni", empty: "Vuoto", every_days: "ogni {n} g", every_weeks: "ogni {n} sett.", every_months: "ogni {n} mesi", manual: "Manuale", nothing: "Ancora niente di monitorato", not_found: "Maintenance non è configurato", card_name: "Scheda Maintenance", card_desc: "Filtri, spazzole, inchiostro e attività: cosa è in ritardo, cosa viene dopo", ed_entity: "Sensore", ed_title: "Titolo", ed_rows: "Righe", ed_language: "Lingua", c_overdue: "In ritardo", c_soon: "A breve", c_ok: "In regola", c_done_month: "Fatti questo mese", cat_vacuum: "Aspirapolvere", cat_purifier: "Purificatori", cat_printer: "Stampante", cat_safety: "Sicurezza", cat_home: "Casa", cat_garden: "Giardino", cat_vehicle: "Veicolo", cat_other: "Altro", tab_due: "Scadenze", tab_calendar: "Calendario", tab_history: "Cronologia", tab_settings: "Impostazioni", subtitle: "{n} monitorati · {a} trovati automaticamente · {b} attività manuali", soon_hint: "≤ {d} g o ≤ {p} %", f_all: "Tutto", f_consumables: "Consumabili", f_tasks: "Attività", g_todo: "Da fare", g_ok: "In regola", add_task: "Aggiungi un'attività", edit: "Modifica", delete: "Elimina", save: "Salva", cancel: "Annulla", f_name: "Nome", f_every: "Ogni", f_unit: "Unità", u_days: "giorni", u_weeks: "settimane", u_months: "mesi", f_category: "Categoria", f_last: "Ultima volta", cal_next30: "Prossimi 30 giorni", today: "Oggi", cal_list: "In arrivo", no_due: "Niente in scadenza nei prossimi 30 giorni", h_empty: "Ancora niente di fatto", h_by: "da {who}", s_thresholds: "Quando è a breve", s_soon_days: "Giorni prima della scadenza", s_soon_percent: "Consumabile basso al (%)", s_reminders: "Promemoria", s_time: "Promemoria giornaliero alle", s_service: "Invia tramite", s_none: "Nessun promemoria", remind_now: "Invia ora il promemoria", s_found: "Consumabili trovati", s_found_text: "Deseleziona un sensore per non monitorarlo più.", saved: "Salvato", sent: "Inviato", error: "Errore" },
  nl: { title: "Onderhoud", tracked_n: "{n} gevolgd", overdue_n: "{n} te laat", all_good: "Alles bijgewerkt", next: "Volgende: {name}, {when}", done: "Gedaan", overdue_days: "{n} d te laat", due_today: "Vandaag", in_days: "Over {n} d", in_months: "Over {n} maanden", left_pct: "{p} % over", left_hours: "≈ {n} u", left_days: "≈ {n} dagen", empty: "Leeg", every_days: "elke {n} d", every_weeks: "elke {n} wk", every_months: "elke {n} mnd", manual: "Handmatig", nothing: "Nog niets gevolgd", not_found: "Maintenance is niet ingesteld", card_name: "Maintenance-kaart", card_desc: "Filters, borstels, inkt en klusjes: wat te laat is, wat eraan komt", ed_entity: "Sensor", ed_title: "Titel", ed_rows: "Rijen", ed_language: "Taal", c_overdue: "Te laat", c_soon: "Binnenkort", c_ok: "Bijgewerkt", c_done_month: "Gedaan deze maand", cat_vacuum: "Stofzuiger", cat_purifier: "Luchtreinigers", cat_printer: "Printer", cat_safety: "Veiligheid", cat_home: "Huis", cat_garden: "Tuin", cat_vehicle: "Voertuig", cat_other: "Overig", tab_due: "Vervaldata", tab_calendar: "Kalender", tab_history: "Geschiedenis", tab_settings: "Instellingen", subtitle: "{n} gevolgd · {a} automatisch gevonden · {b} handmatige taken", soon_hint: "≤ {d} d of ≤ {p} %", f_all: "Alles", f_consumables: "Verbruiksartikelen", f_tasks: "Taken", g_todo: "Te doen", g_ok: "Bijgewerkt", add_task: "Taak toevoegen", edit: "Bewerken", delete: "Verwijderen", save: "Opslaan", cancel: "Annuleren", f_name: "Naam", f_every: "Elke", f_unit: "Eenheid", u_days: "dagen", u_weeks: "weken", u_months: "maanden", f_category: "Categorie", f_last: "Laatst gedaan", cal_next30: "Komende 30 dagen", today: "Vandaag", cal_list: "Binnenkort", no_due: "Niets te doen in de komende 30 dagen", h_empty: "Nog niets gedaan", h_by: "door {who}", s_thresholds: "Wanneer is het binnenkort", s_soon_days: "Dagen voor een vervaldatum", s_soon_percent: "Verbruiksartikel laag bij (%)", s_reminders: "Herinneringen", s_time: "Dagelijkse herinnering om", s_service: "Versturen via", s_none: "Geen herinnering", remind_now: "Herinnering nu versturen", s_found: "Gevonden verbruiksartikelen", s_found_text: "Vink een sensor uit om hem niet meer te volgen.", saved: "Opgeslagen", sent: "Verstuurd", error: "Fout" },
  pt: { title: "Manutenção", tracked_n: "{n} acompanhados", overdue_n: "{n} em atraso", all_good: "Tudo em dia", next: "Próximo: {name}, {when}", done: "Feito", overdue_days: "Em atraso há {n} d", due_today: "Vence hoje", in_days: "Daqui a {n} d", in_months: "Daqui a {n} meses", left_pct: "{p} % restante", left_hours: "≈ {n} h", left_days: "≈ {n} dias", empty: "Vazio", every_days: "a cada {n} d", every_weeks: "a cada {n} sem.", every_months: "a cada {n} meses", manual: "Manual", nothing: "Ainda nada acompanhado", not_found: "O Maintenance não está configurado", card_name: "Cartão Maintenance", card_desc: "Filtros, escovas, tinta e tarefas: o que está em atraso e o que vem a seguir", ed_entity: "Sensor", ed_title: "Título", ed_rows: "Linhas", ed_language: "Idioma", c_overdue: "Em atraso", c_soon: "Em breve", c_ok: "Em dia", c_done_month: "Feitos este mês", cat_vacuum: "Aspirador", cat_purifier: "Purificadores", cat_printer: "Impressora", cat_safety: "Segurança", cat_home: "Casa", cat_garden: "Jardim", cat_vehicle: "Veículo", cat_other: "Outro", tab_due: "Prazos", tab_calendar: "Calendário", tab_history: "Histórico", tab_settings: "Definições", subtitle: "{n} acompanhados · {a} encontrados automaticamente · {b} tarefas manuais", soon_hint: "≤ {d} d ou ≤ {p} %", f_all: "Tudo", f_consumables: "Consumíveis", f_tasks: "Tarefas", g_todo: "Por fazer", g_ok: "Em dia", add_task: "Adicionar uma tarefa", edit: "Editar", delete: "Eliminar", save: "Guardar", cancel: "Cancelar", f_name: "Nome", f_every: "A cada", f_unit: "Unidade", u_days: "dias", u_weeks: "semanas", u_months: "meses", f_category: "Categoria", f_last: "Última vez", cal_next30: "Próximos 30 dias", today: "Hoje", cal_list: "Brevemente", no_due: "Nada a vencer nos próximos 30 dias", h_empty: "Ainda nada feito", h_by: "por {who}", s_thresholds: "Quando é em breve", s_soon_days: "Dias antes do prazo", s_soon_percent: "Consumível baixo a (%)", s_reminders: "Lembretes", s_time: "Lembrete diário às", s_service: "Enviar por", s_none: "Sem lembrete", remind_now: "Enviar o lembrete agora", s_found: "Consumíveis encontrados", s_found_text: "Desmarque um sensor para deixar de o acompanhar.", saved: "Guardado", sent: "Enviado", error: "Erro" },
  pl: { title: "Konserwacja", tracked_n: "Śledzone: {n}", overdue_n: "Zaległe: {n}", all_good: "Wszystko aktualne", next: "Następne: {name}, {when}", done: "Zrobione", overdue_days: "Zaległe {n} dni", due_today: "Na dziś", in_days: "Za {n} dni", in_months: "Za {n} mies.", left_pct: "Zostało {p} %", left_hours: "≈ {n} godz.", left_days: "≈ {n} dni", empty: "Puste", every_days: "co {n} dni", every_weeks: "co {n} tyg.", every_months: "co {n} mies.", manual: "Ręczne", nothing: "Jeszcze nic nie śledzono", not_found: "Maintenance nie jest skonfigurowane", card_name: "Karta Maintenance", card_desc: "Filtry, szczotki, tusz i prace: co zaległe, co następne", ed_entity: "Czujnik", ed_title: "Tytuł", ed_rows: "Wiersze", ed_language: "Język", c_overdue: "Zaległe", c_soon: "Wkrótce", c_ok: "Aktualne", c_done_month: "Zrobione w tym miesiącu", cat_vacuum: "Odkurzacz", cat_purifier: "Oczyszczacze", cat_printer: "Drukarka", cat_safety: "Bezpieczeństwo", cat_home: "Dom", cat_garden: "Ogród", cat_vehicle: "Pojazd", cat_other: "Inne", tab_due: "Terminy", tab_calendar: "Kalendarz", tab_history: "Historia", tab_settings: "Ustawienia", subtitle: "Śledzone: {n} · wykryte automatycznie: {a} · zadania ręczne: {b}", soon_hint: "≤ {d} dni lub ≤ {p} %", f_all: "Wszystko", f_consumables: "Materiały", f_tasks: "Zadania", g_todo: "Do zrobienia", g_ok: "Aktualne", add_task: "Dodaj zadanie", edit: "Edytuj", delete: "Usuń", save: "Zapisz", cancel: "Anuluj", f_name: "Nazwa", f_every: "Co", f_unit: "Jednostka", u_days: "dni", u_weeks: "tygodnie", u_months: "miesiące", f_category: "Kategoria", f_last: "Ostatnio zrobione", cal_next30: "Najbliższe 30 dni", today: "Dziś", cal_list: "Wkrótce", no_due: "Nic w najbliższych 30 dniach", h_empty: "Jeszcze nic nie zrobiono", h_by: "przez {who}", s_thresholds: "Kiedy jest wkrótce", s_soon_days: "Dni przed terminem", s_soon_percent: "Niski poziom materiału przy (%)", s_reminders: "Przypomnienia", s_time: "Codzienne przypomnienie o", s_service: "Wysyłaj przez", s_none: "Bez przypomnień", remind_now: "Wyślij przypomnienie teraz", s_found: "Wykryte materiały", s_found_text: "Odznacz czujnik, aby przestać go śledzić.", saved: "Zapisano", sent: "Wysłano", error: "Błąd" },
  sr: { title: "Одржавање", tracked_n: "Праћено: {n}", overdue_n: "Касни: {n}", all_good: "Све је ажурно", next: "Следеће: {name}, {when}", done: "Урађено", overdue_days: "Касни {n} д", due_today: "Данас", in_days: "За {n} д", in_months: "За {n} месеци", left_pct: "Преостало {p} %", left_hours: "≈ {n} ч", left_days: "≈ {n} дана", empty: "Празно", every_days: "сваких {n} д", every_weeks: "сваких {n} нед.", every_months: "сваких {n} мес.", manual: "Ручно", nothing: "Још ништа није праћено", not_found: "Maintenance није подешен", card_name: "Maintenance картица", card_desc: "Филтери, четке, мастило и задаци: шта касни, шта следи", ed_entity: "Сензор", ed_title: "Наслов", ed_rows: "Редови", ed_language: "Језик", c_overdue: "Касни", c_soon: "Ускоро", c_ok: "Ажурно", c_done_month: "Урађено овог месеца", cat_vacuum: "Усисивач", cat_purifier: "Пречишћивачи", cat_printer: "Штампач", cat_safety: "Безбедност", cat_home: "Кућа", cat_garden: "Башта", cat_vehicle: "Возило", cat_other: "Остало", tab_due: "Рокови", tab_calendar: "Календар", tab_history: "Историја", tab_settings: "Подешавања", subtitle: "Праћено: {n} · аутоматски пронађено: {a} · ручни задаци: {b}", soon_hint: "≤ {d} д или ≤ {p} %", f_all: "Све", f_consumables: "Потрошни материјал", f_tasks: "Задаци", g_todo: "За урадити", g_ok: "Ажурно", add_task: "Додај задатак", edit: "Измени", delete: "Обриши", save: "Сачувај", cancel: "Откажи", f_name: "Назив", f_every: "Сваких", f_unit: "Јединица", u_days: "дани", u_weeks: "недеље", u_months: "месеци", f_category: "Категорија", f_last: "Последњи пут", cal_next30: "Следећих 30 дана", today: "Данас", cal_list: "Ускоро", no_due: "Ништа у наредних 30 дана", h_empty: "Још ништа није урађено", h_by: "урадио {who}", s_thresholds: "Када је ускоро", s_soon_days: "Дана пре рока", s_soon_percent: "Потрошни материјал низак на (%)", s_reminders: "Подсетници", s_time: "Дневни подсетник у", s_service: "Шаљи преко", s_none: "Без подсетника", remind_now: "Пошаљи подсетник сада", s_found: "Пронађени потрошни материјал", s_found_text: "Уклоните ознаку са сензора да га више не пратите.", saved: "Сачувано", sent: "Послато", error: "Грешка" },
  "sr-Latn": { title: "Održavanje", tracked_n: "Praćeno: {n}", overdue_n: "Kasni: {n}", all_good: "Sve je ažurno", next: "Sledeće: {name}, {when}", done: "Urađeno", overdue_days: "Kasni {n} d", due_today: "Danas", in_days: "Za {n} d", in_months: "Za {n} meseci", left_pct: "Preostalo {p} %", left_hours: "≈ {n} č", left_days: "≈ {n} dana", empty: "Prazno", every_days: "svakih {n} d", every_weeks: "svakih {n} ned.", every_months: "svakih {n} mes.", manual: "Ručno", nothing: "Još ništa nije praćeno", not_found: "Maintenance nije podešen", card_name: "Maintenance kartica", card_desc: "Filteri, četke, mastilo i zadaci: šta kasni, šta sledi", ed_entity: "Senzor", ed_title: "Naslov", ed_rows: "Redovi", ed_language: "Jezik", c_overdue: "Kasni", c_soon: "Uskoro", c_ok: "Ažurno", c_done_month: "Urađeno ovog meseca", cat_vacuum: "Usisivač", cat_purifier: "Prečišćivači", cat_printer: "Štampač", cat_safety: "Bezbednost", cat_home: "Kuća", cat_garden: "Bašta", cat_vehicle: "Vozilo", cat_other: "Ostalo", tab_due: "Rokovi", tab_calendar: "Kalendar", tab_history: "Istorija", tab_settings: "Podešavanja", subtitle: "Praćeno: {n} · automatski pronađeno: {a} · ručni zadaci: {b}", soon_hint: "≤ {d} d ili ≤ {p} %", f_all: "Sve", f_consumables: "Potrošni materijal", f_tasks: "Zadaci", g_todo: "Za uraditi", g_ok: "Ažurno", add_task: "Dodaj zadatak", edit: "Izmeni", delete: "Obriši", save: "Sačuvaj", cancel: "Otkaži", f_name: "Naziv", f_every: "Svakih", f_unit: "Jedinica", u_days: "dani", u_weeks: "nedelje", u_months: "meseci", f_category: "Kategorija", f_last: "Poslednji put", cal_next30: "Sledećih 30 dana", today: "Danas", cal_list: "Uskoro", no_due: "Ništa u narednih 30 dana", h_empty: "Još ništa nije urađeno", h_by: "uradio {who}", s_thresholds: "Kada je uskoro", s_soon_days: "Dana pre roka", s_soon_percent: "Potrošni materijal nizak na (%)", s_reminders: "Podsetnici", s_time: "Dnevni podsetnik u", s_service: "Šalji preko", s_none: "Bez podsetnika", remind_now: "Pošalji podsetnik sada", s_found: "Pronađeni potrošni materijal", s_found_text: "Uklonite oznaku sa senzora da ga više ne pratite.", saved: "Sačuvano", sent: "Poslato", error: "Greška" },
  ro: { title: "Întreținere", tracked_n: "{n} urmărite", overdue_n: "{n} întârziate", all_good: "Totul la zi", next: "Următorul: {name}, {when}", done: "Făcut", overdue_days: "Întârziat {n} z", due_today: "Azi", in_days: "În {n} z", in_months: "În {n} luni", left_pct: "{p} % rămas", left_hours: "≈ {n} h", left_days: "≈ {n} zile", empty: "Gol", every_days: "la {n} z", every_weeks: "la {n} săpt.", every_months: "la {n} luni", manual: "Manual", nothing: "Încă nimic urmărit", not_found: "Maintenance nu este configurat", card_name: "Card Maintenance", card_desc: "Filtre, perii, cerneală și treburi: ce e întârziat, ce urmează", ed_entity: "Senzor", ed_title: "Titlu", ed_rows: "Rânduri", ed_language: "Limbă", c_overdue: "Întârziate", c_soon: "În curând", c_ok: "La zi", c_done_month: "Făcute luna aceasta", cat_vacuum: "Aspirator", cat_purifier: "Purificatoare", cat_printer: "Imprimantă", cat_safety: "Siguranță", cat_home: "Casă", cat_garden: "Grădină", cat_vehicle: "Vehicul", cat_other: "Altele", tab_due: "Scadențe", tab_calendar: "Calendar", tab_history: "Istoric", tab_settings: "Setări", subtitle: "{n} urmărite · {a} găsite automat · {b} sarcini manuale", soon_hint: "≤ {d} z sau ≤ {p} %", f_all: "Toate", f_consumables: "Consumabile", f_tasks: "Sarcini", g_todo: "De făcut", g_ok: "La zi", add_task: "Adaugă o sarcină", edit: "Editează", delete: "Șterge", save: "Salvează", cancel: "Anulează", f_name: "Nume", f_every: "La fiecare", f_unit: "Unitate", u_days: "zile", u_weeks: "săptămâni", u_months: "luni", f_category: "Categorie", f_last: "Ultima dată", cal_next30: "Următoarele 30 de zile", today: "Azi", cal_list: "Urmează", no_due: "Nimic scadent în următoarele 30 de zile", h_empty: "Încă nimic făcut", h_by: "de {who}", s_thresholds: "Când e în curând", s_soon_days: "Zile înainte de scadență", s_soon_percent: "Consumabil scăzut la (%)", s_reminders: "Mementouri", s_time: "Memento zilnic la", s_service: "Trimite prin", s_none: "Fără memento", remind_now: "Trimite mementoul acum", s_found: "Consumabile găsite", s_found_text: "Debifați un senzor pentru a nu-l mai urmări.", saved: "Salvat", sent: "Trimis", error: "Eroare" },
  da: { title: "Vedligeholdelse", tracked_n: "{n} fulgt", overdue_n: "{n} forsinket", all_good: "Alt er ajour", next: "Næste: {name}, {when}", done: "Udført", overdue_days: "{n} d forsinket", due_today: "I dag", in_days: "Om {n} d", in_months: "Om {n} måneder", left_pct: "{p} % tilbage", left_hours: "≈ {n} t", left_days: "≈ {n} dage", empty: "Tom", every_days: "hver {n}. d", every_weeks: "hver {n}. uge", every_months: "hver {n}. md.", manual: "Manuel", nothing: "Intet fulgt endnu", not_found: "Maintenance er ikke sat op", card_name: "Maintenance-kort", card_desc: "Filtre, børster, blæk og opgaver: hvad der er forsinket, hvad der kommer", ed_entity: "Sensor", ed_title: "Titel", ed_rows: "Rækker", ed_language: "Sprog", c_overdue: "Forsinket", c_soon: "Snart", c_ok: "Ajour", c_done_month: "Udført denne måned", cat_vacuum: "Støvsuger", cat_purifier: "Luftrensere", cat_printer: "Printer", cat_safety: "Sikkerhed", cat_home: "Hjem", cat_garden: "Have", cat_vehicle: "Køretøj", cat_other: "Andet", tab_due: "Forfald", tab_calendar: "Kalender", tab_history: "Historik", tab_settings: "Indstillinger", subtitle: "{n} fulgt · {a} fundet automatisk · {b} manuelle opgaver", soon_hint: "≤ {d} d eller ≤ {p} %", f_all: "Alle", f_consumables: "Forbrugsstoffer", f_tasks: "Opgaver", g_todo: "At gøre", g_ok: "Ajour", add_task: "Tilføj en opgave", edit: "Redigér", delete: "Slet", save: "Gem", cancel: "Annullér", f_name: "Navn", f_every: "Hver", f_unit: "Enhed", u_days: "dage", u_weeks: "uger", u_months: "måneder", f_category: "Kategori", f_last: "Sidst udført", cal_next30: "Næste 30 dage", today: "I dag", cal_list: "Kommende", no_due: "Intet forfalder de næste 30 dage", h_empty: "Intet udført endnu", h_by: "af {who}", s_thresholds: "Hvornår er det snart", s_soon_days: "Dage før forfald", s_soon_percent: "Forbrugsstof lavt ved (%)", s_reminders: "Påmindelser", s_time: "Daglig påmindelse kl.", s_service: "Send via", s_none: "Ingen påmindelse", remind_now: "Send påmindelsen nu", s_found: "Fundne forbrugsstoffer", s_found_text: "Fjern fluebenet for at stoppe med at følge en sensor.", saved: "Gemt", sent: "Sendt", error: "Fejl" },
  sv: { title: "Underhåll", tracked_n: "{n} följda", overdue_n: "{n} försenade", all_good: "Allt är aktuellt", next: "Nästa: {name}, {when}", done: "Klar", overdue_days: "{n} d försenad", due_today: "I dag", in_days: "Om {n} d", in_months: "Om {n} månader", left_pct: "{p} % kvar", left_hours: "≈ {n} h", left_days: "≈ {n} dagar", empty: "Tom", every_days: "var {n}:e d", every_weeks: "var {n}:e v.", every_months: "var {n}:e mån.", manual: "Manuell", nothing: "Inget följs än", not_found: "Maintenance är inte konfigurerat", card_name: "Maintenance-kort", card_desc: "Filter, borstar, bläck och sysslor: vad som är försenat, vad som kommer", ed_entity: "Sensor", ed_title: "Rubrik", ed_rows: "Rader", ed_language: "Språk", c_overdue: "Försenade", c_soon: "Snart", c_ok: "Aktuella", c_done_month: "Klara denna månad", cat_vacuum: "Dammsugare", cat_purifier: "Luftrenare", cat_printer: "Skrivare", cat_safety: "Säkerhet", cat_home: "Hem", cat_garden: "Trädgård", cat_vehicle: "Fordon", cat_other: "Övrigt", tab_due: "Förfall", tab_calendar: "Kalender", tab_history: "Historik", tab_settings: "Inställningar", subtitle: "{n} följda · {a} hittade automatiskt · {b} manuella uppgifter", soon_hint: "≤ {d} d eller ≤ {p} %", f_all: "Alla", f_consumables: "Förbrukningsmaterial", f_tasks: "Uppgifter", g_todo: "Att göra", g_ok: "Aktuella", add_task: "Lägg till en uppgift", edit: "Redigera", delete: "Ta bort", save: "Spara", cancel: "Avbryt", f_name: "Namn", f_every: "Var", f_unit: "Enhet", u_days: "dagar", u_weeks: "veckor", u_months: "månader", f_category: "Kategori", f_last: "Senast gjord", cal_next30: "Kommande 30 dagar", today: "I dag", cal_list: "Kommande", no_due: "Inget förfaller de kommande 30 dagarna", h_empty: "Inget gjort än", h_by: "av {who}", s_thresholds: "När är det snart", s_soon_days: "Dagar före förfallodatum", s_soon_percent: "Förbrukningsmaterial lågt vid (%)", s_reminders: "Påminnelser", s_time: "Daglig påminnelse kl.", s_service: "Skicka via", s_none: "Ingen påminnelse", remind_now: "Skicka påminnelsen nu", s_found: "Hittat förbrukningsmaterial", s_found_text: "Avmarkera en sensor för att sluta följa den.", saved: "Sparat", sent: "Skickat", error: "Fel" },
  bg: { title: "Поддръжка", tracked_n: "Следени: {n}", overdue_n: "Просрочени: {n}", all_good: "Всичко е наред", next: "Следващо: {name}, {when}", done: "Готово", overdue_days: "Просрочено с {n} д", due_today: "Днес", in_days: "След {n} д", in_months: "След {n} месеца", left_pct: "Остават {p} %", left_hours: "≈ {n} ч", left_days: "≈ {n} дни", empty: "Празно", every_days: "на {n} д", every_weeks: "на {n} седм.", every_months: "на {n} мес.", manual: "Ръчно", nothing: "Още нищо не се следи", not_found: "Maintenance не е настроен", card_name: "Карта Maintenance", card_desc: "Филтри, четки, мастило и задачи: какво е просрочено, какво следва", ed_entity: "Сензор", ed_title: "Заглавие", ed_rows: "Редове", ed_language: "Език", c_overdue: "Просрочени", c_soon: "Скоро", c_ok: "Наред", c_done_month: "Направени този месец", cat_vacuum: "Прахосмукачка", cat_purifier: "Пречистватели", cat_printer: "Принтер", cat_safety: "Безопасност", cat_home: "Дом", cat_garden: "Градина", cat_vehicle: "Превозно средство", cat_other: "Друго", tab_due: "Срокове", tab_calendar: "Календар", tab_history: "История", tab_settings: "Настройки", subtitle: "Следени: {n} · намерени автоматично: {a} · ръчни задачи: {b}", soon_hint: "≤ {d} д или ≤ {p} %", f_all: "Всички", f_consumables: "Консумативи", f_tasks: "Задачи", g_todo: "За правене", g_ok: "Наред", add_task: "Добави задача", edit: "Редактирай", delete: "Изтрий", save: "Запази", cancel: "Отказ", f_name: "Име", f_every: "На всеки", f_unit: "Единица", u_days: "дни", u_weeks: "седмици", u_months: "месеци", f_category: "Категория", f_last: "Последно направено", cal_next30: "Следващите 30 дни", today: "Днес", cal_list: "Предстоящи", no_due: "Нищо в следващите 30 дни", h_empty: "Още нищо не е направено", h_by: "от {who}", s_thresholds: "Кога е скоро", s_soon_days: "Дни преди срока", s_soon_percent: "Нисък консуматив при (%)", s_reminders: "Напомняния", s_time: "Ежедневно напомняне в", s_service: "Изпращай чрез", s_none: "Без напомняне", remind_now: "Изпрати напомнянето сега", s_found: "Намерени консумативи", s_found_text: "Махнете отметката, за да спрете да следите сензор.", saved: "Запазено", sent: "Изпратено", error: "Грешка" },
  ru: { title: "Обслуживание", tracked_n: "Отслеживается: {n}", overdue_n: "Просрочено: {n}", all_good: "Всё в порядке", next: "Далее: {name}, {when}", done: "Готово", overdue_days: "Просрочено на {n} дн.", due_today: "Сегодня", in_days: "Через {n} дн.", in_months: "Через {n} мес.", left_pct: "Осталось {p} %", left_hours: "≈ {n} ч", left_days: "≈ {n} дн.", empty: "Пусто", every_days: "каждые {n} дн.", every_weeks: "каждые {n} нед.", every_months: "каждые {n} мес.", manual: "Вручную", nothing: "Пока ничего не отслеживается", not_found: "Maintenance не настроен", card_name: "Карточка Maintenance", card_desc: "Фильтры, щётки, чернила и дела: что просрочено, что дальше", ed_entity: "Датчик", ed_title: "Заголовок", ed_rows: "Строки", ed_language: "Язык", c_overdue: "Просрочено", c_soon: "Скоро", c_ok: "В порядке", c_done_month: "Сделано в этом месяце", cat_vacuum: "Пылесос", cat_purifier: "Очистители", cat_printer: "Принтер", cat_safety: "Безопасность", cat_home: "Дом", cat_garden: "Сад", cat_vehicle: "Автомобиль", cat_other: "Другое", tab_due: "Сроки", tab_calendar: "Календарь", tab_history: "История", tab_settings: "Настройки", subtitle: "Отслеживается: {n} · найдено автоматически: {a} · ручных задач: {b}", soon_hint: "≤ {d} дн. или ≤ {p} %", f_all: "Все", f_consumables: "Расходники", f_tasks: "Задачи", g_todo: "К выполнению", g_ok: "В порядке", add_task: "Добавить задачу", edit: "Изменить", delete: "Удалить", save: "Сохранить", cancel: "Отмена", f_name: "Название", f_every: "Каждые", f_unit: "Единица", u_days: "дни", u_weeks: "недели", u_months: "месяцы", f_category: "Категория", f_last: "Последний раз", cal_next30: "Ближайшие 30 дней", today: "Сегодня", cal_list: "Скоро", no_due: "Ничего в ближайшие 30 дней", h_empty: "Пока ничего не сделано", h_by: "выполнил(а) {who}", s_thresholds: "Когда «скоро»", s_soon_days: "Дней до срока", s_soon_percent: "Расходник заканчивается при (%)", s_reminders: "Напоминания", s_time: "Ежедневное напоминание в", s_service: "Отправлять через", s_none: "Без напоминаний", remind_now: "Отправить напоминание сейчас", s_found: "Найденные расходники", s_found_text: "Снимите отметку с датчика, чтобы перестать его отслеживать.", saved: "Сохранено", sent: "Отправлено", error: "Ошибка" },
  uk: { title: "Обслуговування", tracked_n: "Відстежується: {n}", overdue_n: "Прострочено: {n}", all_good: "Усе гаразд", next: "Далі: {name}, {when}", done: "Готово", overdue_days: "Прострочено на {n} дн.", due_today: "Сьогодні", in_days: "Через {n} дн.", in_months: "Через {n} міс.", left_pct: "Залишилось {p} %", left_hours: "≈ {n} год", left_days: "≈ {n} дн.", empty: "Порожньо", every_days: "кожні {n} дн.", every_weeks: "кожні {n} тиж.", every_months: "кожні {n} міс.", manual: "Вручну", nothing: "Поки нічого не відстежується", not_found: "Maintenance не налаштовано", card_name: "Картка Maintenance", card_desc: "Фільтри, щітки, чорнило й справи: що прострочено, що далі", ed_entity: "Датчик", ed_title: "Заголовок", ed_rows: "Рядки", ed_language: "Мова", c_overdue: "Прострочено", c_soon: "Незабаром", c_ok: "Гаразд", c_done_month: "Зроблено цього місяця", cat_vacuum: "Пилосос", cat_purifier: "Очищувачі", cat_printer: "Принтер", cat_safety: "Безпека", cat_home: "Дім", cat_garden: "Сад", cat_vehicle: "Автомобіль", cat_other: "Інше", tab_due: "Строки", tab_calendar: "Календар", tab_history: "Історія", tab_settings: "Налаштування", subtitle: "Відстежується: {n} · знайдено автоматично: {a} · ручних завдань: {b}", soon_hint: "≤ {d} дн. або ≤ {p} %", f_all: "Усі", f_consumables: "Витратні матеріали", f_tasks: "Завдання", g_todo: "До виконання", g_ok: "Гаразд", add_task: "Додати завдання", edit: "Змінити", delete: "Видалити", save: "Зберегти", cancel: "Скасувати", f_name: "Назва", f_every: "Кожні", f_unit: "Одиниця", u_days: "дні", u_weeks: "тижні", u_months: "місяці", f_category: "Категорія", f_last: "Останній раз", cal_next30: "Найближчі 30 днів", today: "Сьогодні", cal_list: "Незабаром", no_due: "Нічого в найближчі 30 днів", h_empty: "Поки нічого не зроблено", h_by: "виконав(ла) {who}", s_thresholds: "Коли «незабаром»", s_soon_days: "Днів до строку", s_soon_percent: "Витратний матеріал закінчується при (%)", s_reminders: "Нагадування", s_time: "Щоденне нагадування о", s_service: "Надсилати через", s_none: "Без нагадувань", remind_now: "Надіслати нагадування зараз", s_found: "Знайдені витратні матеріали", s_found_text: "Зніміть позначку з датчика, щоб припинити його відстежувати.", saved: "Збережено", sent: "Надіслано", error: "Помилка" },
  hu: { title: "Karbantartás", tracked_n: "{n} követett", overdue_n: "{n} késésben", all_good: "Minden naprakész", next: "Következő: {name}, {when}", done: "Kész", overdue_days: "{n} napja késésben", due_today: "Ma esedékes", in_days: "{n} nap múlva", in_months: "{n} hónap múlva", left_pct: "{p} % maradt", left_hours: "≈ {n} óra", left_days: "≈ {n} nap", empty: "Üres", every_days: "{n} naponta", every_weeks: "{n} hetente", every_months: "{n} havonta", manual: "Kézi", nothing: "Még semmi sincs követve", not_found: "A Maintenance nincs beállítva", card_name: "Maintenance kártya", card_desc: "Szűrők, kefék, tinta és teendők: mi késik, mi következik", ed_entity: "Érzékelő", ed_title: "Cím", ed_rows: "Sorok", ed_language: "Nyelv", c_overdue: "Késésben", c_soon: "Hamarosan", c_ok: "Naprakész", c_done_month: "Ebben a hónapban kész", cat_vacuum: "Porszívó", cat_purifier: "Légtisztítók", cat_printer: "Nyomtató", cat_safety: "Biztonság", cat_home: "Otthon", cat_garden: "Kert", cat_vehicle: "Jármű", cat_other: "Egyéb", tab_due: "Határidők", tab_calendar: "Naptár", tab_history: "Előzmények", tab_settings: "Beállítások", subtitle: "{n} követett · {a} automatikusan talált · {b} kézi feladat", soon_hint: "≤ {d} nap vagy ≤ {p} %", f_all: "Mind", f_consumables: "Fogyóeszközök", f_tasks: "Feladatok", g_todo: "Teendő", g_ok: "Naprakész", add_task: "Feladat hozzáadása", edit: "Szerkesztés", delete: "Törlés", save: "Mentés", cancel: "Mégse", f_name: "Név", f_every: "Minden", f_unit: "Egység", u_days: "nap", u_weeks: "hét", u_months: "hónap", f_category: "Kategória", f_last: "Utoljára elvégezve", cal_next30: "Következő 30 nap", today: "Ma", cal_list: "Közelgő", no_due: "A következő 30 napban nincs teendő", h_empty: "Még semmi sincs elvégezve", h_by: "{who} által", s_thresholds: "Mikor számít hamarosannak", s_soon_days: "Napok a határidő előtt", s_soon_percent: "Fogyóeszköz alacsony ennél (%)", s_reminders: "Emlékeztetők", s_time: "Napi emlékeztető ekkor", s_service: "Küldés ezen át", s_none: "Nincs emlékeztető", remind_now: "Emlékeztető küldése most", s_found: "Talált fogyóeszközök", s_found_text: "Vegye ki a pipát egy érzékelőnél, hogy ne kövesse tovább.", saved: "Mentve", sent: "Elküldve", error: "Hiba" },
  sk: { title: "Údržba", tracked_n: "Sledované: {n}", overdue_n: "Po termíne: {n}", all_good: "Všetko je aktuálne", next: "Ďalšie: {name}, {when}", done: "Hotovo", overdue_days: "Po termíne {n} d", due_today: "Dnes", in_days: "O {n} d", in_months: "O {n} mesiacov", left_pct: "Zostáva {p} %", left_hours: "≈ {n} h", left_days: "≈ {n} dní", empty: "Prázdne", every_days: "každých {n} d", every_weeks: "každých {n} týž.", every_months: "každých {n} mes.", manual: "Ručné", nothing: "Zatiaľ nič nesledované", not_found: "Maintenance nie je nastavené", card_name: "Karta Maintenance", card_desc: "Filtre, kefy, atrament a práce: čo je po termíne, čo príde", ed_entity: "Senzor", ed_title: "Názov", ed_rows: "Riadky", ed_language: "Jazyk", c_overdue: "Po termíne", c_soon: "Čoskoro", c_ok: "Aktuálne", c_done_month: "Hotové tento mesiac", cat_vacuum: "Vysávač", cat_purifier: "Čističky", cat_printer: "Tlačiareň", cat_safety: "Bezpečnosť", cat_home: "Domov", cat_garden: "Záhrada", cat_vehicle: "Vozidlo", cat_other: "Iné", tab_due: "Termíny", tab_calendar: "Kalendár", tab_history: "História", tab_settings: "Nastavenia", subtitle: "Sledované: {n} · nájdené automaticky: {a} · ručné úlohy: {b}", soon_hint: "≤ {d} d alebo ≤ {p} %", f_all: "Všetko", f_consumables: "Spotrebný materiál", f_tasks: "Úlohy", g_todo: "Na vykonanie", g_ok: "Aktuálne", add_task: "Pridať úlohu", edit: "Upraviť", delete: "Odstrániť", save: "Uložiť", cancel: "Zrušiť", f_name: "Názov", f_every: "Každých", f_unit: "Jednotka", u_days: "dni", u_weeks: "týždne", u_months: "mesiace", f_category: "Kategória", f_last: "Naposledy urobené", cal_next30: "Najbližších 30 dní", today: "Dnes", cal_list: "Čoskoro", no_due: "Nič v najbližších 30 dňoch", h_empty: "Zatiaľ nič urobené", h_by: "urobil(a) {who}", s_thresholds: "Kedy je čoskoro", s_soon_days: "Dni pred termínom", s_soon_percent: "Spotrebný materiál nízky pri (%)", s_reminders: "Pripomienky", s_time: "Denná pripomienka o", s_service: "Posielať cez", s_none: "Bez pripomienky", remind_now: "Poslať pripomienku teraz", s_found: "Nájdený spotrebný materiál", s_found_text: "Zrušte označenie senzora, aby sa prestal sledovať.", saved: "Uložené", sent: "Odoslané", error: "Chyba" },
  cs: { title: "Údržba", tracked_n: "Sledováno: {n}", overdue_n: "Po termínu: {n}", all_good: "Vše je aktuální", next: "Další: {name}, {when}", done: "Hotovo", overdue_days: "Po termínu {n} d", due_today: "Dnes", in_days: "Za {n} d", in_months: "Za {n} měsíců", left_pct: "Zbývá {p} %", left_hours: "≈ {n} h", left_days: "≈ {n} dní", empty: "Prázdné", every_days: "každých {n} d", every_weeks: "každých {n} týd.", every_months: "každých {n} měs.", manual: "Ruční", nothing: "Zatím nic nesledováno", not_found: "Maintenance není nastaveno", card_name: "Karta Maintenance", card_desc: "Filtry, kartáče, inkoust a práce: co je po termínu, co přijde", ed_entity: "Senzor", ed_title: "Název", ed_rows: "Řádky", ed_language: "Jazyk", c_overdue: "Po termínu", c_soon: "Brzy", c_ok: "Aktuální", c_done_month: "Hotovo tento měsíc", cat_vacuum: "Vysavač", cat_purifier: "Čističky", cat_printer: "Tiskárna", cat_safety: "Bezpečnost", cat_home: "Domov", cat_garden: "Zahrada", cat_vehicle: "Vozidlo", cat_other: "Jiné", tab_due: "Termíny", tab_calendar: "Kalendář", tab_history: "Historie", tab_settings: "Nastavení", subtitle: "Sledováno: {n} · nalezeno automaticky: {a} · ruční úkoly: {b}", soon_hint: "≤ {d} d nebo ≤ {p} %", f_all: "Vše", f_consumables: "Spotřební materiál", f_tasks: "Úkoly", g_todo: "K provedení", g_ok: "Aktuální", add_task: "Přidat úkol", edit: "Upravit", delete: "Smazat", save: "Uložit", cancel: "Zrušit", f_name: "Název", f_every: "Každých", f_unit: "Jednotka", u_days: "dny", u_weeks: "týdny", u_months: "měsíce", f_category: "Kategorie", f_last: "Naposledy uděláno", cal_next30: "Příštích 30 dní", today: "Dnes", cal_list: "Brzy", no_due: "Nic v příštích 30 dnech", h_empty: "Zatím nic uděláno", h_by: "udělal(a) {who}", s_thresholds: "Kdy je brzy", s_soon_days: "Dny před termínem", s_soon_percent: "Spotřební materiál nízký při (%)", s_reminders: "Připomínky", s_time: "Denní připomínka v", s_service: "Posílat přes", s_none: "Bez připomínky", remind_now: "Poslat připomínku teď", s_found: "Nalezený spotřební materiál", s_found_text: "Zrušte zaškrtnutí senzoru, aby se přestal sledovat.", saved: "Uloženo", sent: "Odesláno", error: "Chyba" },
  sl: { title: "Vzdrževanje", tracked_n: "Spremljano: {n}", overdue_n: "Zamuja: {n}", all_good: "Vse je ažurno", next: "Naslednje: {name}, {when}", done: "Opravljeno", overdue_days: "Zamuja {n} d", due_today: "Danes", in_days: "Čez {n} d", in_months: "Čez {n} mesecev", left_pct: "Ostane {p} %", left_hours: "≈ {n} h", left_days: "≈ {n} dni", empty: "Prazno", every_days: "vsakih {n} d", every_weeks: "vsakih {n} ted.", every_months: "vsakih {n} mes.", manual: "Ročno", nothing: "Še nič spremljano", not_found: "Maintenance ni nastavljen", card_name: "Kartica Maintenance", card_desc: "Filtri, krtače, črnilo in opravila: kaj zamuja, kaj sledi", ed_entity: "Senzor", ed_title: "Naslov", ed_rows: "Vrstice", ed_language: "Jezik", c_overdue: "Zamuja", c_soon: "Kmalu", c_ok: "Ažurno", c_done_month: "Opravljeno ta mesec", cat_vacuum: "Sesalnik", cat_purifier: "Čistilniki", cat_printer: "Tiskalnik", cat_safety: "Varnost", cat_home: "Dom", cat_garden: "Vrt", cat_vehicle: "Vozilo", cat_other: "Drugo", tab_due: "Roki", tab_calendar: "Koledar", tab_history: "Zgodovina", tab_settings: "Nastavitve", subtitle: "Spremljano: {n} · samodejno najdeno: {a} · ročna opravila: {b}", soon_hint: "≤ {d} d ali ≤ {p} %", f_all: "Vse", f_consumables: "Potrošni material", f_tasks: "Opravila", g_todo: "Za narediti", g_ok: "Ažurno", add_task: "Dodaj opravilo", edit: "Uredi", delete: "Izbriši", save: "Shrani", cancel: "Prekliči", f_name: "Ime", f_every: "Vsakih", f_unit: "Enota", u_days: "dnevi", u_weeks: "tedni", u_months: "meseci", f_category: "Kategorija", f_last: "Nazadnje opravljeno", cal_next30: "Naslednjih 30 dni", today: "Danes", cal_list: "Prihaja", no_due: "V naslednjih 30 dneh nič", h_empty: "Še nič opravljeno", h_by: "opravil(a) {who}", s_thresholds: "Kdaj je kmalu", s_soon_days: "Dni pred rokom", s_soon_percent: "Potrošni material nizek pri (%)", s_reminders: "Opomniki", s_time: "Dnevni opomnik ob", s_service: "Pošlji prek", s_none: "Brez opomnika", remind_now: "Pošlji opomnik zdaj", s_found: "Najden potrošni material", s_found_text: "Odstranite kljukico pri senzorju, da ga ne spremljate več.", saved: "Shranjeno", sent: "Poslano", error: "Napaka" },
  lv: { title: "Apkope", tracked_n: "Sekoti: {n}", overdue_n: "Nokavēti: {n}", all_good: "Viss ir kārtībā", next: "Nākamais: {name}, {when}", done: "Izdarīts", overdue_days: "Nokavēts {n} d", due_today: "Šodien", in_days: "Pēc {n} d", in_months: "Pēc {n} mēnešiem", left_pct: "Atlikuši {p} %", left_hours: "≈ {n} h", left_days: "≈ {n} dienas", empty: "Tukšs", every_days: "ik pēc {n} d", every_weeks: "ik pēc {n} ned.", every_months: "ik pēc {n} mēn.", manual: "Manuāls", nothing: "Vēl nekas netiek sekots", not_found: "Maintenance nav iestatīts", card_name: "Maintenance kartīte", card_desc: "Filtri, sukas, tinte un darbi: kas nokavēts, kas nāk", ed_entity: "Sensors", ed_title: "Virsraksts", ed_rows: "Rindas", ed_language: "Valoda", c_overdue: "Nokavēti", c_soon: "Drīz", c_ok: "Kārtībā", c_done_month: "Izdarīti šomēnes", cat_vacuum: "Putekļsūcējs", cat_purifier: "Attīrītāji", cat_printer: "Printeris", cat_safety: "Drošība", cat_home: "Mājas", cat_garden: "Dārzs", cat_vehicle: "Transportlīdzeklis", cat_other: "Cits", tab_due: "Termiņi", tab_calendar: "Kalendārs", tab_history: "Vēsture", tab_settings: "Iestatījumi", subtitle: "Sekoti: {n} · atrasti automātiski: {a} · manuāli uzdevumi: {b}", soon_hint: "≤ {d} d vai ≤ {p} %", f_all: "Visi", f_consumables: "Palīgmateriāli", f_tasks: "Uzdevumi", g_todo: "Jāizdara", g_ok: "Kārtībā", add_task: "Pievienot uzdevumu", edit: "Rediģēt", delete: "Dzēst", save: "Saglabāt", cancel: "Atcelt", f_name: "Nosaukums", f_every: "Ik pēc", f_unit: "Vienība", u_days: "dienas", u_weeks: "nedēļas", u_months: "mēneši", f_category: "Kategorija", f_last: "Pēdējo reizi izdarīts", cal_next30: "Nākamās 30 dienas", today: "Šodien", cal_list: "Gaidāmie", no_due: "Nākamajās 30 dienās nekā", h_empty: "Vēl nekas nav izdarīts", h_by: "izdarīja {who}", s_thresholds: "Kad ir drīz", s_soon_days: "Dienas pirms termiņa", s_soon_percent: "Palīgmateriāls zems pie (%)", s_reminders: "Atgādinājumi", s_time: "Ikdienas atgādinājums plkst.", s_service: "Sūtīt ar", s_none: "Bez atgādinājuma", remind_now: "Sūtīt atgādinājumu tagad", s_found: "Atrastie palīgmateriāli", s_found_text: "Noņemiet atzīmi sensoram, lai vairs tam nesekotu.", saved: "Saglabāts", sent: "Nosūtīts", error: "Kļūda" },
  el: { title: "Συντήρηση", tracked_n: "{n} παρακολουθούνται", overdue_n: "{n} εκπρόθεσμα", all_good: "Όλα ενημερωμένα", next: "Επόμενο: {name}, {when}", done: "Έγινε", overdue_days: "Εκπρόθεσμο {n} ημ.", due_today: "Σήμερα", in_days: "Σε {n} ημ.", in_months: "Σε {n} μήνες", left_pct: "Απομένει {p} %", left_hours: "≈ {n} ώρ.", left_days: "≈ {n} ημέρες", empty: "Άδειο", every_days: "κάθε {n} ημ.", every_weeks: "κάθε {n} εβδ.", every_months: "κάθε {n} μήν.", manual: "Χειροκίνητο", nothing: "Τίποτα δεν παρακολουθείται ακόμη", not_found: "Το Maintenance δεν έχει ρυθμιστεί", card_name: "Κάρτα Maintenance", card_desc: "Φίλτρα, βούρτσες, μελάνι και δουλειές: τι καθυστερεί, τι ακολουθεί", ed_entity: "Αισθητήρας", ed_title: "Τίτλος", ed_rows: "Γραμμές", ed_language: "Γλώσσα", c_overdue: "Εκπρόθεσμα", c_soon: "Σύντομα", c_ok: "Ενημερωμένα", c_done_month: "Έγιναν αυτόν τον μήνα", cat_vacuum: "Ηλεκτρική σκούπα", cat_purifier: "Καθαριστές", cat_printer: "Εκτυπωτής", cat_safety: "Ασφάλεια", cat_home: "Σπίτι", cat_garden: "Κήπος", cat_vehicle: "Όχημα", cat_other: "Άλλο", tab_due: "Προθεσμίες", tab_calendar: "Ημερολόγιο", tab_history: "Ιστορικό", tab_settings: "Ρυθμίσεις", subtitle: "{n} παρακολουθούνται · {a} βρέθηκαν αυτόματα · {b} χειροκίνητες εργασίες", soon_hint: "≤ {d} ημ. ή ≤ {p} %", f_all: "Όλα", f_consumables: "Αναλώσιμα", f_tasks: "Εργασίες", g_todo: "Προς εκτέλεση", g_ok: "Ενημερωμένα", add_task: "Προσθήκη εργασίας", edit: "Επεξεργασία", delete: "Διαγραφή", save: "Αποθήκευση", cancel: "Ακύρωση", f_name: "Όνομα", f_every: "Κάθε", f_unit: "Μονάδα", u_days: "ημέρες", u_weeks: "εβδομάδες", u_months: "μήνες", f_category: "Κατηγορία", f_last: "Τελευταία φορά", cal_next30: "Επόμενες 30 ημέρες", today: "Σήμερα", cal_list: "Προσεχώς", no_due: "Τίποτα τις επόμενες 30 ημέρες", h_empty: "Τίποτα δεν έχει γίνει ακόμη", h_by: "από {who}", s_thresholds: "Πότε είναι σύντομα", s_soon_days: "Ημέρες πριν από την προθεσμία", s_soon_percent: "Χαμηλό αναλώσιμο στο (%)", s_reminders: "Υπενθυμίσεις", s_time: "Καθημερινή υπενθύμιση στις", s_service: "Αποστολή μέσω", s_none: "Χωρίς υπενθύμιση", remind_now: "Αποστολή υπενθύμισης τώρα", s_found: "Αναλώσιμα που βρέθηκαν", s_found_text: "Αποεπιλέξτε έναν αισθητήρα για να σταματήσει η παρακολούθησή του.", saved: "Αποθηκεύτηκε", sent: "Στάλθηκε", error: "Σφάλμα" },
};

var MTP_TABS = ['due', 'calendar', 'history', 'settings'];
var MTP_CATEGORIES = ['vacuum', 'purifier', 'printer', 'safety', 'home', 'garden', 'vehicle', 'other'];
var MTP_TONE = { overdue: 'bad', soon: 'warn', ok: 'ok' };
var MTP_BLANK = { name: '', every: 1, unit: 'months', category: 'home' };

var mtpEsc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
var mtpFill = (text, values) => String(text).replace(/\{(\w+)\}/g, (m, k) => (values[k] == null ? m : values[k]));

class MaintenancePanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = null;
    this._draft = {};
    this._filter = 'all';
    this._form = null;
    var tab = new URLSearchParams(location.search).get('tab');
    this._tab = MTP_TABS.includes(tab) ? tab : 'due';
    this.shadowRoot.addEventListener('click', (ev) => this._click(ev));
    this.shadowRoot.addEventListener('change', (ev) => this._change(ev));
    this.shadowRoot.addEventListener('input', (ev) => this._input(ev));
  }

  set hass(hass) {
    var first = !this._hass;
    this._hass = hass;
    var id = Object.keys(hass.states).find((k) => k.startsWith('sensor.') && hass.states[k]?.attributes?.maintenance);
    var stamp = id ? hass.states[id].last_updated : '';
    if (first || stamp !== this._stamp) {
      this._stamp = stamp;
      this._load();
    } else if (!this._form) {
      this._render();
    }
  }

  set narrow(value) {
    this._narrow = value;
    this._render();
  }

  connectedCallback() {
    this._timer = setInterval(() => this._form || this._load(), 60000);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
  }

  _t() {
    var raw = String(this._hass?.locale?.language || this._hass?.language || 'en');
    var lang = MT_PANEL_I18N[raw] ? raw : MT_PANEL_I18N[raw.split('-')[0]] ? raw.split('-')[0] : 'en';
    return Object.assign({}, MT_PANEL_I18N.en, MT_PANEL_I18N[lang]);
  }

  async _load() {
    if (!this._hass) return;
    try {
      this._data = await this._hass.callWS({ type: 'maintenance/state' });
      this._error = '';
    } catch (err) {
      this._error = err?.message || String(err);
    }
    this._render();
  }

  _options() {
    return Object.assign({}, this._data?.options || {}, this._draft);
  }

  _setTab(tab) {
    this._tab = tab;
    this._draft = {};
    this._form = null;
    this._filter = 'all';
    var url = new URL(location.href);
    url.searchParams.set('tab', tab);
    history.replaceState(history.state, '', url);
    this._render();
  }

  async _ws(message, done) {
    try {
      await this._hass.callWS(message);
      this._toast = done;
    } catch (err) {
      this._toast = `${this._t().error}: ${err?.message || err}`;
    }
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this._toast = '';
      this._render();
    }, 2500);
    await this._load();
  }

  _click(ev) {
    var el = ev.composedPath().find((n) => n?.dataset?.act);
    if (!el) return;
    var t = this._t();
    var act = el.dataset.act;
    if (act === 'tab') this._setTab(el.dataset.tab);
    else if (act === 'filter') {
      this._filter = el.dataset.filter;
      this._render();
    } else if (act === 'done') this._ws({ type: 'maintenance/done', item: el.dataset.item }, t.saved);
    else if (act === 'new') {
      this._form = Object.assign({}, MTP_BLANK);
      this._render();
    } else if (act === 'edit') {
      var task = (this._data?.tasks || []).find((x) => `task:${x.id}` === el.dataset.item);
      this._form = task ? Object.assign({}, task) : null;
      this._render();
    } else if (act === 'cancel') {
      this._form = null;
      this._render();
    } else if (act === 'save-task') {
      var form = this._form;
      if (!form?.name?.trim()) return;
      this._form = null;
      var payload = { name: form.name.trim(), every: Number(form.every) || 1, unit: form.unit, category: form.category };
      if (form.id) payload.id = form.id;
      if (form.last_done) payload.last_done = form.last_done;
      this._ws({ type: 'maintenance/task', task: payload }, t.saved);
    } else if (act === 'delete') {
      var id = this._form?.id;
      this._form = null;
      if (id) this._ws({ type: 'maintenance/delete_task', task: id }, t.saved);
    } else if (act === 'remind') this._ws({ type: 'maintenance/remind' }, t.sent);
    else if (act === 'save') {
      var draft = this._draft;
      this._draft = {};
      this._ws({ type: 'maintenance/save', options: draft }, t.saved);
    }
  }

  _input(ev) {
    var field = ev.target?.dataset?.field;
    if (field && this._form) this._form[field] = ev.target.value;
  }

  _change(ev) {
    var el = ev.target;
    if (el?.dataset?.field && this._form) {
      this._form[el.dataset.field] = el.value;
      return;
    }
    if (el?.dataset?.track) {
      var ignored = new Set(this._options().ignored || []);
      if (el.checked) ignored.delete(el.dataset.track);
      else ignored.add(el.dataset.track);
      this._ws({ type: 'maintenance/save', options: { ignored: [...ignored] } }, this._t().saved);
      return;
    }
    var key = el?.dataset?.key;
    if (!key) return;
    this._draft[key] = el.type === 'number' ? Number(el.value) : el.value || null;
    this._render();
  }

  // An item's line: when it is due or how much is left, and how often.
  _line(item, t) {
    var d = item.days_left;
    var when = d == null ? '' : d < 0 ? mtpFill(t.overdue_days, { n: -d }) : d === 0 ? t.due_today : d < 60 ? mtpFill(t.in_days, { n: d }) : mtpFill(t.in_months, { n: Math.round(d / 30) });
    if (item.kind === 'task') return `${when} · ${mtpFill(t[`every_${item.unit}`] || t.every_days, { n: item.every })}`;
    var left = item.percent != null ? mtpFill(t.left_pct, { p: item.percent }) : '';
    var pace = d != null ? mtpFill(t.left_days, { n: d }) : item.hours != null ? mtpFill(t.left_hours, { n: item.hours }) : '';
    return item.value <= 0 ? t.empty : [left, pace].filter(Boolean).join(' · ');
  }

  _render() {
    if (!this._hass) return;
    var t = this._t();
    var d = this._data;
    var counts = d?.counts || {};
    var tone = counts.overdue ? 'bad' : counts.soon ? 'warn' : 'ok';
    var found = (d?.items || []).filter((i) => i.kind === 'consumable').length;
    var subtitle = d ? mtpFill(t.subtitle, { n: counts.tracked || 0, a: found, b: (d.tasks || []).length }) : '';
    var body = !d ? `<div class="empty">${mtpEsc(this._error || '…')}</div>` : this[`_${this._tab}`](d, t);
    var dark = !!this._hass.themes?.darkMode;
    this.shadowRoot.innerHTML = `<style>${MaintenancePanel.styles()}</style>
      <div class="page tone-${tone}${dark ? ' night' : ''}">
        <header class="top">
          ${MaintenancePanel.scene(tone === 'bad')}
          <div class="ground"></div>
          <div class="bar">
            ${this._narrow ? '<ha-menu-button class="menu"></ha-menu-button>' : ''}
            <span class="ico"><ha-icon icon="mdi:wrench-clock"></ha-icon></span>
            <span class="htxt"><span class="title">${mtpEsc(t.title)}</span><span class="subtitle">${mtpEsc(subtitle)}</span></span>
            ${counts.overdue ? `<span class="pill">${mtpEsc(mtpFill(t.overdue_n, { n: counts.overdue }))}</span>` : ''}
            <button class="round" type="button" data-act="new" title="${mtpEsc(t.add_task)}" aria-label="${mtpEsc(t.add_task)}"><ha-icon icon="mdi:plus"></ha-icon></button>
          </div>
        </header>
        <nav class="tabs" role="tablist">${MTP_TABS.map((tab) => `<button type="button" role="tab" class="tab${tab === this._tab ? ' on' : ''}" aria-selected="${tab === this._tab}" data-act="tab" data-tab="${tab}">${mtpEsc(t[`tab_${tab}`])}</button>`).join('')}</nav>
        <main class="wrap">${this._form ? this._editor(t) : ''}${body}</main>
        ${this._toast ? `<div class="toast">${mtpEsc(this._toast)}</div>` : ''}
      </div>`;
    var menu = this.shadowRoot.querySelector('ha-menu-button');
    if (menu) {
      menu.hass = this._hass;
      menu.narrow = this._narrow;
    }
  }

  static scene(busy) {
    var holes = [];
    for (var x = 0; x < 8; x++) for (var y = 0; y < 3; y++) holes.push(`<circle cx="${30 + x * 26}" cy="${26 + y * 24}" r="2"/>`);
    return `<svg class="scene" viewBox="0 0 240 110" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <rect class="board" x="14" y="12" width="212" height="92" rx="8"/><g class="holes">${holes.join('')}</g>
      <g class="gear"><path d="M66 36l5 0 1 6 5 2 5-4 4 4-4 5 2 5 6 1 0 5-6 1-2 5 4 5-4 4-5-4-5 2-1 6-5 0-1-6-5-2-5 4-4-4 4-5-2-5-6-1 0-5 6-1 2-5-4-5 4-4 5 4 5-2z"/><circle class="hub" cx="68.5" cy="58.5" r="6"/></g>
      <g class="wrench${busy ? ' busy' : ''}"><path d="M134 30a11 11 0 0 0-10 15l-18 32a5 5 0 0 0 9 5l18-32a11 11 0 0 0 13-12l-6 4-6-4 0-6z"/></g>
      <g class="filter"><rect x="170" y="36" width="34" height="48" rx="5"/><path d="M175 47h24M175 58h24M175 69h24"/></g>
    </svg>`;
  }

  _row(item, t, todo) {
    var tone = MTP_TONE[item.status] || 'ok';
    var tag = item.kind === 'task' ? t.manual : item.source || '—';
    var actions = [
      item.kind === 'task' ? `<button class="btn ghost" type="button" data-act="edit" data-item="${mtpEsc(item.id)}">${mtpEsc(t.edit)}</button>` : '',
      todo ? `<button class="btn" type="button" data-act="done" data-item="${mtpEsc(item.id)}">${mtpEsc(t.done)}</button>` : '',
    ].join('');
    return `<div class="row r-${tone}"><span class="dot"><ha-icon icon="${mtpEsc(item.icon || 'mdi:wrench')}"></ha-icon></span>
      <span class="txt"><span class="nm">${mtpEsc(item.name)}</span><span class="sub">${mtpEsc(this._line(item, t))}</span></span>
      <span class="tag">${mtpEsc(tag)}</span><span class="acts">${actions}</span></div>`;
  }

  _due(d, t) {
    var c = d.counts || {};
    var o = this._options();
    var tiles = [
      [c.overdue, t.c_overdue, c.overdue ? 'bad' : ''],
      [c.soon, `${t.c_soon} (${mtpFill(t.soon_hint, { d: o.soon_days ?? 14, p: o.soon_percent ?? 15 })})`, c.soon ? 'warn' : ''],
      [c.ok, t.c_ok, ''],
      [c.done_month, t.c_done_month, ''],
    ];
    var cats = MTP_CATEGORIES.filter((k) => (d.items || []).some((i) => i.category === k));
    var filters = ['all', 'consumables', 'tasks', ...cats];
    var label = (f) => t[`f_${f}`] || t[`cat_${f}`];
    var keep = (i) =>
      this._filter === 'all' ||
      (this._filter === 'consumables' ? i.kind === 'consumable' : this._filter === 'tasks' ? i.kind === 'task' : i.category === this._filter);
    var items = (d.items || []).filter(keep);
    var todo = items.filter((i) => i.status !== 'ok');
    var fine = items.filter((i) => i.status === 'ok');
    var group = (title, list, isTodo) => (list.length ? `<h2>${mtpEsc(title)}</h2><div class="list">${list.map((i) => this._row(i, t, isTodo)).join('')}</div>` : '');
    return `<div class="tiles">${tiles.map(([n, k, cls]) => `<div class="tile${cls ? ` t-${cls}` : ''}"><span class="n">${mtpEsc(n ?? 0)}</span><span class="k">${mtpEsc(k)}</span></div>`).join('')}</div>
      <div class="chips">${filters.map((f) => `<button type="button" class="chip${f === this._filter ? ' on' : ''}" data-act="filter" data-filter="${f}">${mtpEsc(label(f))}</button>`).join('')}</div>
      ${items.length ? group(t.g_todo, todo, true) + group(t.g_ok, fine, false) : `<div class="empty">${mtpEsc(t.nothing)}</div>`}`;
  }

  _editor(t) {
    var f = this._form;
    var opt = (value, text, current) => `<option value="${value}"${String(value) === String(current) ? ' selected' : ''}>${mtpEsc(text)}</option>`;
    return `<section class="card form editor"><h2>${mtpEsc(f.id ? t.edit : t.add_task)}</h2>
      <div class="grid4">
        <label class="field wide"><span>${mtpEsc(t.f_name)}</span><input type="text" maxlength="80" data-field="name" value="${mtpEsc(f.name)}"></label>
        <label class="field"><span>${mtpEsc(t.f_every)}</span><input type="number" min="1" max="999" data-field="every" value="${mtpEsc(f.every)}"></label>
        <label class="field"><span>${mtpEsc(t.f_unit)}</span><select data-field="unit">${['days', 'weeks', 'months'].map((u) => opt(u, t[`u_${u}`], f.unit)).join('')}</select></label>
        <label class="field"><span>${mtpEsc(t.f_category)}</span><select data-field="category">${MTP_CATEGORIES.map((k) => opt(k, t[`cat_${k}`], f.category)).join('')}</select></label>
        <label class="field"><span>${mtpEsc(t.f_last)}</span><input type="date" data-field="last_done" value="${mtpEsc(f.last_done || '')}"></label>
      </div>
      <div class="actions">${f.id ? `<button class="btn danger" type="button" data-act="delete">${mtpEsc(t.delete)}</button>` : ''}<span class="grow"></span>
        <button class="btn ghost" type="button" data-act="cancel">${mtpEsc(t.cancel)}</button>
        <button class="btn primary" type="button" data-act="save-task">${mtpEsc(t.save)}</button></div></section>`;
  }

  _calendar(d, t) {
    var lang = this._hass.locale?.language || 'en';
    var today = new Date(Date.now());
    var dated = (d.items || []).filter((i) => i.days_left != null && i.days_left <= 30).sort((a, b) => a.days_left - b.days_left);
    var week = dated.filter((i) => i.days_left >= 0 && i.days_left <= 7).length;
    var marks = dated
      .map((i) => {
        var at = Math.max(0, Math.min(30, i.days_left)) / 30;
        return `<span class="mark m-${MTP_TONE[i.status]}" style="left:${(at * 100).toFixed(2)}%" title="${mtpEsc(i.name)}"></span>`;
      })
      .join('');
    var day = (n) => {
      var when = new Date(today.getTime() + Math.max(0, n) * 86400000);
      try {
        return when.toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' });
      } catch (_err) {
        return when.toDateString();
      }
    };
    var tiles = [
      [d.counts?.overdue, t.c_overdue, d.counts?.overdue ? 'bad' : ''],
      [week, t.cal_list, week ? 'warn' : ''],
      [dated.length, t.cal_next30, ''],
    ];
    return `<div class="tiles t3">${tiles.map(([n, k, cls]) => `<div class="tile${cls ? ` t-${cls}` : ''}"><span class="n">${mtpEsc(n ?? 0)}</span><span class="k">${mtpEsc(k)}</span></div>`).join('')}</div>
      <section class="card"><h2>${mtpEsc(t.cal_next30)}</h2>
        <div class="line"><span class="track"></span>${marks}</div>
        <div class="scale"><span>${mtpEsc(t.today)}</span><span>+15</span><span>+30</span></div></section>
      <h2>${mtpEsc(t.cal_list)}</h2>
      ${dated.length ? `<div class="list">${dated.map((i) => `<div class="row r-${MTP_TONE[i.status]}"><span class="date">${mtpEsc(day(i.days_left))}</span><span class="dot"><ha-icon icon="${mtpEsc(i.icon || 'mdi:wrench')}"></ha-icon></span><span class="txt"><span class="nm">${mtpEsc(i.name)}</span><span class="sub">${mtpEsc(this._line(i, t))}</span></span><span class="acts"><button class="btn" type="button" data-act="done" data-item="${mtpEsc(i.id)}">${mtpEsc(t.done)}</button></span></div>`).join('')}</div>` : `<div class="empty">${mtpEsc(t.no_due)}</div>`}`;
  }

  _history(d, t) {
    var lang = this._hass.locale?.language || 'en';
    var rows = (d.history || []).map((h) => {
      var when;
      try {
        when = new Date(h.time).toLocaleString(lang, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch (_err) {
        when = h.time;
      }
      return `<div class="row r-ok"><span class="dot"><ha-icon icon="${h.kind === 'task' ? 'mdi:check' : 'mdi:autorenew'}"></ha-icon></span>
        <span class="txt"><span class="nm">${mtpEsc(h.name)}</span><span class="sub">${mtpEsc([when, h.by ? mtpFill(t.h_by, { who: h.by }) : ''].filter(Boolean).join(' · '))}</span></span>
        <span class="tag">${mtpEsc(h.kind === 'task' ? t.f_tasks : t.f_consumables)}</span></div>`;
    });
    return rows.length ? `<div class="list">${rows.join('')}</div>` : `<div class="empty">${mtpEsc(t.h_empty)}</div>`;
  }

  _settings(d, t) {
    var o = this._options();
    var dirty = Object.keys(this._draft).length > 0;
    var found = (d.found || [])
      .map((f) => `<label class="check"><input type="checkbox" data-track="${mtpEsc(f.entity_id)}"${f.ignored ? '' : ' checked'}><span class="txt"><span class="nm">${mtpEsc(f.name)}</span><span class="sub">${mtpEsc([f.source, t[`cat_${f.category}`]].filter(Boolean).join(' · '))}</span></span></label>`)
      .join('');
    return `<div class="cols"><section class="col"><h2>${mtpEsc(t.s_thresholds)}</h2><div class="card form">
        <label class="field"><span>${mtpEsc(t.s_soon_days)}</span><input type="number" min="0" max="365" data-key="soon_days" value="${mtpEsc(o.soon_days ?? 14)}"></label>
        <label class="field"><span>${mtpEsc(t.s_soon_percent)}</span><input type="number" min="0" max="100" data-key="soon_percent" value="${mtpEsc(o.soon_percent ?? 15)}"></label>
        <h2>${mtpEsc(t.s_reminders)}</h2>
        <label class="field"><span>${mtpEsc(t.s_time)}</span><input type="time" data-key="reminder_time" value="${mtpEsc(o.reminder_time || '09:00')}"></label>
        <label class="field"><span>${mtpEsc(t.s_service)}</span><select data-key="notify_service"><option value="">${mtpEsc(t.s_none)}</option>${(d.services || []).map((s) => `<option value="${mtpEsc(s)}"${s === o.notify_service ? ' selected' : ''}>${mtpEsc(s)}</option>`).join('')}</select></label>
        <div class="actions"><button class="btn ghost" type="button" data-act="remind"${o.notify_service ? '' : ' disabled'}>${mtpEsc(t.remind_now)}</button><span class="grow"></span>
          <button class="btn primary" type="button" data-act="save"${dirty ? '' : ' disabled'}>${mtpEsc(t.save)}</button></div>
      </div></section>
      <section class="col"><h2>${mtpEsc(t.s_found)}</h2><div class="card"><p class="text">${mtpEsc(t.s_found_text)}</p>${found || `<div class="empty">${mtpEsc(t.nothing)}</div>`}
        <p class="muted">Maintenance ${mtpEsc(d.version || MAINTENANCE_PANEL_VERSION)}</p></div></section></div>`;
  }

  static styles() {
    return `
      :host { display: block; --ok: var(--success-color, #43a047); --warn: var(--warning-color, #f59e0b); --bad: var(--error-color, #db4437);
              --idle: var(--secondary-text-color, #727272); --accent: #0d9488; }
      .page { min-height: 100vh; background: var(--primary-background-color); color: var(--primary-text-color); }
      .page.tone-ok { --c: var(--accent); } .page.tone-warn { --c: var(--warn); } .page.tone-bad { --c: var(--bad); }
      .top { position: relative; height: 110px; overflow: hidden; background: linear-gradient(#ccfbf1, #f0fdfa); }
      .night .top { background: linear-gradient(#0c2626, #153838); }
      .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: #5eead4; } .night .ground { background: #2c6b66; }
      .scene { position: absolute; right: 300px; bottom: 6px; height: 104px; width: auto; max-width: 40%; }
      @media (max-width: 900px) { .scene { right: 80px; opacity: .35; } }
      .board { fill: #fdf6e3; stroke: #e7d8b1; stroke-width: 2; } .holes circle { fill: #d6c49a; }
      .night .board { fill: #2b3a3a; stroke: #3f5656; } .night .holes circle { fill: #4f6a6a; }
      .gear path { fill: #5eead4; } .gear .hub { fill: #fdf6e3; } .night .gear path { fill: #2dd4bf; } .night .gear .hub { fill: #2b3a3a; }
      .wrench path { fill: #94a3b8; } .night .wrench path { fill: #cbd5e1; } .tone-bad .wrench path { fill: #ef4444; }
      .filter rect { fill: #fff; stroke: #5eead4; stroke-width: 2; } .filter path { stroke: #99f6e4; stroke-width: 2; }
      .tone-warn .filter rect, .tone-bad .filter rect { stroke: #f59e0b; } .tone-warn .filter path, .tone-bad .filter path { stroke: #fcd34d; }
      .night .filter rect { fill: #e6ebf3; }
      .gear { transform-box: fill-box; transform-origin: 50% 50%; animation: mtp-spin 12s linear infinite; }
      .wrench { transform-box: fill-box; transform-origin: 80% 15%; } .wrench.busy { animation: mtp-turn 1.5s ease-in-out infinite; }
      @keyframes mtp-spin { to { transform: rotate(360deg); } }
      @keyframes mtp-turn { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-24deg); } }
      @media (prefers-reduced-motion: reduce) { .gear, .wrench.busy { animation: none; } }
      .bar { position: absolute; left: 24px; right: 24px; top: 26px; display: flex; align-items: center; gap: 12px; }
      .menu { color: #1f2937; } .night .menu { color: #f3f4f6; }
      .ico { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: var(--c); --mdc-icon-size: 22px;
             background: color-mix(in srgb, var(--c) 18%, #fff); }
      .night .ico { background: color-mix(in srgb, var(--c) 30%, #153838); }
      .htxt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .title { font-size: 20px; font-weight: 700; color: #1f2937; } .subtitle { font-size: 13px; color: #4b5563; }
      .night .title { color: #f3f4f6; } .night .subtitle { color: #cbd5e1; }
      .pill { flex: none; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 999px; color: color-mix(in srgb, var(--c) 70%, #111); background: color-mix(in srgb, var(--c) 16%, #fff); }
      .round { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: var(--c); --mdc-icon-size: 20px;
               border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); background: rgba(255,255,255,.6); }
      .night .round { background: rgba(0,0,0,.25); }
      .round:focus-visible, .tab:focus-visible, .btn:focus-visible, .chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
      .tabs { display: flex; gap: 24px; padding: 0 24px; border-bottom: 1px solid var(--divider-color, rgba(127,127,127,.2)); background: var(--card-background-color, #fff); overflow-x: auto; }
      .tab { font: inherit; font-size: 14px; font-weight: 600; background: none; border: 0; padding: 14px 0; cursor: pointer; white-space: nowrap;
             color: var(--secondary-text-color); border-bottom: 3px solid transparent; }
      .tab.on { color: var(--primary-text-color); border-bottom-color: var(--accent); }
      .wrap { max-width: 1180px; margin: 0 auto; padding: 20px 24px 40px; display: flex; flex-direction: column; gap: 14px; }
      h2 { margin: 6px 0 0; font-size: 13px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--secondary-text-color); }
      .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; } .tiles.t3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      @media (max-width: 700px) { .tiles, .tiles.t3 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      .tile, .card { background: var(--card-background-color, #fff); border-radius: 14px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.08)); }
      .tile { padding: 14px; display: flex; flex-direction: column; gap: 4px; }
      .tile .n { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; } .tile .k { font-size: 13px; color: var(--secondary-text-color); }
      .tile.t-bad .n { color: var(--bad); } .tile.t-warn .n { color: color-mix(in srgb, var(--warn) 80%, var(--primary-text-color)); }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .chip { font: inherit; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 999px; cursor: pointer; color: var(--primary-text-color);
              border: 1px solid var(--divider-color, rgba(127,127,127,.35)); background: var(--card-background-color, #fff); }
      .chip.on { color: #0f766e; border-color: #5eead4; background: #ccfbf1; } .night .chip.on { color: #99f6e4; background: #134e4a; border-color: #2c6b66; }
      .list { display: flex; flex-direction: column; gap: 6px; }
      .row { --c: var(--ok); display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 14px;
             background: var(--card-background-color, #fff); box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.06)); }
      .row.r-bad { --c: var(--bad); background: color-mix(in srgb, var(--bad) 8%, var(--card-background-color, #fff)); } .row.r-warn { --c: var(--warn); }
      .dot { flex: none; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: var(--c); --mdc-icon-size: 18px;
             background: color-mix(in srgb, var(--c) 16%, transparent); }
      .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .nm { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub { font-size: 12px; color: color-mix(in srgb, var(--c) 70%, var(--primary-text-color)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .r-ok .sub, .check .sub { color: var(--secondary-text-color); }
      .tag { flex: none; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; color: var(--secondary-text-color);
             background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent); }
      .acts { flex: none; display: flex; gap: 6px; justify-content: flex-end; min-width: 64px; }
      .date { flex: none; width: 110px; font-size: 13px; font-weight: 600; color: var(--secondary-text-color); }
      .btn { font: inherit; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 999px; cursor: pointer; color: var(--primary-text-color);
             background: transparent; border: 1px solid var(--divider-color, rgba(127,127,127,.35)); }
      .btn:hover { background: color-mix(in srgb, var(--secondary-text-color) 10%, transparent); }
      .btn.ghost { border-color: transparent; color: var(--secondary-text-color); }
      .btn.primary { color: color-mix(in srgb, var(--accent) 75%, var(--primary-text-color)); border-color: color-mix(in srgb, var(--accent) 60%, transparent); }
      .btn.danger { color: color-mix(in srgb, var(--bad) 75%, var(--primary-text-color)); border-color: color-mix(in srgb, var(--bad) 55%, transparent); }
      .btn[disabled] { opacity: .45; cursor: default; }
      .card { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
      .cols { display: flex; flex-wrap: wrap; gap: 20px; } .col { flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
      .form { gap: 14px; } .grid4 { display: grid; grid-template-columns: 2fr repeat(4, minmax(0, 1fr)); gap: 12px; }
      @media (max-width: 860px) { .grid4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } .field.wide { grid-column: 1 / -1; } }
      .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: var(--secondary-text-color); }
      .field input, .field select { font: inherit; font-size: 14px; padding: 8px 10px; border-radius: 10px; color: var(--primary-text-color);
             background: transparent; border: 1px solid var(--divider-color, rgba(127,127,127,.35)); color-scheme: light dark; }
      .editor { border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); }
      .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; } .grow { flex: 1; }
      .check { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-top: 1px solid var(--divider-color, rgba(127,127,127,.15)); cursor: pointer; }
      .check input { width: 18px; height: 18px; accent-color: var(--accent); }
      .text { margin: 0; font-size: 13px; color: var(--secondary-text-color); } .muted { margin: 4px 0 0; font-size: 12px; color: var(--secondary-text-color); }
      .line { position: relative; height: 26px; margin: 6px 6px 0; }
      .track { position: absolute; left: 0; right: 0; top: 11px; height: 4px; border-radius: 2px; background: var(--divider-color, rgba(127,127,127,.25)); }
      .mark { position: absolute; top: 5px; width: 16px; height: 16px; margin-left: -8px; border-radius: 50%; border: 2px solid var(--card-background-color, #fff); }
      .m-bad { background: var(--bad); } .m-warn { background: var(--warn); } .m-ok { background: var(--accent); }
      .scale { display: flex; justify-content: space-between; font-size: 12px; color: var(--secondary-text-color); }
      .empty { padding: 16px; color: var(--secondary-text-color); font-size: 13px; }
      .toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); padding: 10px 18px; border-radius: 999px; font-size: 13px;
               background: var(--primary-text-color); color: var(--primary-background-color); box-shadow: 0 6px 20px rgba(0,0,0,.2); }
    `;
  }
}

if (!customElements.get('maintenance-panel')) customElements.define('maintenance-panel', MaintenancePanel);
