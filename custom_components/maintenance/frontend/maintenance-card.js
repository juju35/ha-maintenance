/**
 * maintenance-card — the household maintenance at a glance: an illustrated header (a gear turning, a wrench at work
 * when something is overdue, night with the dark theme) and the items most urgent first — consumables found among the
 * device sensors (filters, brushes, ink…) and manual tasks — with a Done button on what needs doing.
 * Reads the integration's "Overdue" sensor (its `maintenance` attribute). Served and added to the dashboard
 * resources by the integration.
 * https://github.com/juju35/ha-maintenance
 */
var MAINTENANCE_CARD_VERSION = '0.1.1';

var MT_CARD_I18N = {
  en: { title: "Maintenance", tracked_n: "{n} tracked", overdue_n: "{n} overdue", all_good: "All up to date", next: "Next: {name}, {when}", done: "Done", overdue_days: "Overdue by {n} d", due_today: "Due today", in_days: "In {n} d", in_months: "In {n} months", left_pct: "{p} % left", left_hours: "≈ {n} h", left_days: "≈ {n} days", empty: "Empty", every_days: "every {n} d", every_weeks: "every {n} wk", every_months: "every {n} mo", manual: "Manual", nothing: "Nothing tracked yet", not_found: "Maintenance is not set up", card_name: "Maintenance Card", card_desc: "Filters, brushes, ink and chores: what is overdue, what comes next", ed_entity: "Sensor", ed_title: "Title", ed_rows: "Rows", ed_language: "Language" },
  fr: { title: "Entretien", tracked_n: "{n} suivis", overdue_n: "{n} en retard", all_good: "Tout est à jour", next: "Prochain : {name}, {when}", done: "Fait", overdue_days: "En retard de {n} j", due_today: "À faire aujourd’hui", in_days: "Dans {n} j", in_months: "Dans {n} mois", left_pct: "{p} % restant", left_hours: "≈ {n} h", left_days: "≈ {n} jours", empty: "Vide", every_days: "tous les {n} j", every_weeks: "toutes les {n} sem.", every_months: "tous les {n} mois", manual: "Manuel", nothing: "Rien de suivi pour l’instant", not_found: "Maintenance n’est pas configurée", card_name: "Carte Maintenance", card_desc: "Filtres, brosses, encre et tâches : ce qui est en retard, ce qui vient", ed_entity: "Capteur", ed_title: "Titre", ed_rows: "Lignes", ed_language: "Langue" },
  de: { title: "Wartung", tracked_n: "{n} verfolgt", overdue_n: "{n} überfällig", all_good: "Alles aktuell", next: "Nächste: {name}, {when}", done: "Erledigt", overdue_days: "{n} T. überfällig", due_today: "Heute fällig", in_days: "In {n} T.", in_months: "In {n} Monaten", left_pct: "{p} % übrig", left_hours: "≈ {n} Std.", left_days: "≈ {n} Tage", empty: "Leer", every_days: "alle {n} T.", every_weeks: "alle {n} Wo.", every_months: "alle {n} Mon.", manual: "Manuell", nothing: "Noch nichts verfolgt", not_found: "Maintenance ist nicht eingerichtet", card_name: "Maintenance-Karte", card_desc: "Filter, Bürsten, Tinte und Aufgaben: was überfällig ist, was als Nächstes kommt", ed_entity: "Sensor", ed_title: "Titel", ed_rows: "Zeilen", ed_language: "Sprache" },
  es: { title: "Mantenimiento", tracked_n: "{n} seguidos", overdue_n: "{n} atrasados", all_good: "Todo al día", next: "Siguiente: {name}, {when}", done: "Hecho", overdue_days: "Atrasado {n} d", due_today: "Vence hoy", in_days: "En {n} d", in_months: "En {n} meses", left_pct: "Queda {p} %", left_hours: "≈ {n} h", left_days: "≈ {n} días", empty: "Vacío", every_days: "cada {n} d", every_weeks: "cada {n} sem.", every_months: "cada {n} meses", manual: "Manual", nothing: "Aún no se sigue nada", not_found: "Maintenance no está configurado", card_name: "Tarjeta Maintenance", card_desc: "Filtros, cepillos, tinta y tareas: lo atrasado y lo próximo", ed_entity: "Sensor", ed_title: "Título", ed_rows: "Filas", ed_language: "Idioma" },
  it: { title: "Manutenzione", tracked_n: "{n} monitorati", overdue_n: "{n} in ritardo", all_good: "Tutto in regola", next: "Prossimo: {name}, {when}", done: "Fatto", overdue_days: "In ritardo di {n} g", due_today: "Scade oggi", in_days: "Tra {n} g", in_months: "Tra {n} mesi", left_pct: "{p} % rimasto", left_hours: "≈ {n} h", left_days: "≈ {n} giorni", empty: "Vuoto", every_days: "ogni {n} g", every_weeks: "ogni {n} sett.", every_months: "ogni {n} mesi", manual: "Manuale", nothing: "Ancora niente di monitorato", not_found: "Maintenance non è configurato", card_name: "Scheda Maintenance", card_desc: "Filtri, spazzole, inchiostro e attività: cosa è in ritardo, cosa viene dopo", ed_entity: "Sensore", ed_title: "Titolo", ed_rows: "Righe", ed_language: "Lingua" },
  nl: { title: "Onderhoud", tracked_n: "{n} gevolgd", overdue_n: "{n} te laat", all_good: "Alles bijgewerkt", next: "Volgende: {name}, {when}", done: "Gedaan", overdue_days: "{n} d te laat", due_today: "Vandaag", in_days: "Over {n} d", in_months: "Over {n} maanden", left_pct: "{p} % over", left_hours: "≈ {n} u", left_days: "≈ {n} dagen", empty: "Leeg", every_days: "elke {n} d", every_weeks: "elke {n} wk", every_months: "elke {n} mnd", manual: "Handmatig", nothing: "Nog niets gevolgd", not_found: "Maintenance is niet ingesteld", card_name: "Maintenance-kaart", card_desc: "Filters, borstels, inkt en klusjes: wat te laat is, wat eraan komt", ed_entity: "Sensor", ed_title: "Titel", ed_rows: "Rijen", ed_language: "Taal" },
  pt: { title: "Manutenção", tracked_n: "{n} acompanhados", overdue_n: "{n} em atraso", all_good: "Tudo em dia", next: "Próximo: {name}, {when}", done: "Feito", overdue_days: "Em atraso há {n} d", due_today: "Vence hoje", in_days: "Daqui a {n} d", in_months: "Daqui a {n} meses", left_pct: "{p} % restante", left_hours: "≈ {n} h", left_days: "≈ {n} dias", empty: "Vazio", every_days: "a cada {n} d", every_weeks: "a cada {n} sem.", every_months: "a cada {n} meses", manual: "Manual", nothing: "Ainda nada acompanhado", not_found: "O Maintenance não está configurado", card_name: "Cartão Maintenance", card_desc: "Filtros, escovas, tinta e tarefas: o que está em atraso e o que vem a seguir", ed_entity: "Sensor", ed_title: "Título", ed_rows: "Linhas", ed_language: "Idioma" },
  pl: { title: "Konserwacja", tracked_n: "Śledzone: {n}", overdue_n: "Zaległe: {n}", all_good: "Wszystko aktualne", next: "Następne: {name}, {when}", done: "Zrobione", overdue_days: "Zaległe {n} dni", due_today: "Na dziś", in_days: "Za {n} dni", in_months: "Za {n} mies.", left_pct: "Zostało {p} %", left_hours: "≈ {n} godz.", left_days: "≈ {n} dni", empty: "Puste", every_days: "co {n} dni", every_weeks: "co {n} tyg.", every_months: "co {n} mies.", manual: "Ręczne", nothing: "Jeszcze nic nie śledzono", not_found: "Maintenance nie jest skonfigurowane", card_name: "Karta Maintenance", card_desc: "Filtry, szczotki, tusz i prace: co zaległe, co następne", ed_entity: "Czujnik", ed_title: "Tytuł", ed_rows: "Wiersze", ed_language: "Język" },
  sr: { title: "Одржавање", tracked_n: "Праћено: {n}", overdue_n: "Касни: {n}", all_good: "Све је ажурно", next: "Следеће: {name}, {when}", done: "Урађено", overdue_days: "Касни {n} д", due_today: "Данас", in_days: "За {n} д", in_months: "За {n} месеци", left_pct: "Преостало {p} %", left_hours: "≈ {n} ч", left_days: "≈ {n} дана", empty: "Празно", every_days: "сваких {n} д", every_weeks: "сваких {n} нед.", every_months: "сваких {n} мес.", manual: "Ручно", nothing: "Још ништа није праћено", not_found: "Maintenance није подешен", card_name: "Maintenance картица", card_desc: "Филтери, четке, мастило и задаци: шта касни, шта следи", ed_entity: "Сензор", ed_title: "Наслов", ed_rows: "Редови", ed_language: "Језик" },
  "sr-Latn": { title: "Održavanje", tracked_n: "Praćeno: {n}", overdue_n: "Kasni: {n}", all_good: "Sve je ažurno", next: "Sledeće: {name}, {when}", done: "Urađeno", overdue_days: "Kasni {n} d", due_today: "Danas", in_days: "Za {n} d", in_months: "Za {n} meseci", left_pct: "Preostalo {p} %", left_hours: "≈ {n} č", left_days: "≈ {n} dana", empty: "Prazno", every_days: "svakih {n} d", every_weeks: "svakih {n} ned.", every_months: "svakih {n} mes.", manual: "Ručno", nothing: "Još ništa nije praćeno", not_found: "Maintenance nije podešen", card_name: "Maintenance kartica", card_desc: "Filteri, četke, mastilo i zadaci: šta kasni, šta sledi", ed_entity: "Senzor", ed_title: "Naslov", ed_rows: "Redovi", ed_language: "Jezik" },
  ro: { title: "Întreținere", tracked_n: "{n} urmărite", overdue_n: "{n} întârziate", all_good: "Totul la zi", next: "Următorul: {name}, {when}", done: "Făcut", overdue_days: "Întârziat {n} z", due_today: "Azi", in_days: "În {n} z", in_months: "În {n} luni", left_pct: "{p} % rămas", left_hours: "≈ {n} h", left_days: "≈ {n} zile", empty: "Gol", every_days: "la {n} z", every_weeks: "la {n} săpt.", every_months: "la {n} luni", manual: "Manual", nothing: "Încă nimic urmărit", not_found: "Maintenance nu este configurat", card_name: "Card Maintenance", card_desc: "Filtre, perii, cerneală și treburi: ce e întârziat, ce urmează", ed_entity: "Senzor", ed_title: "Titlu", ed_rows: "Rânduri", ed_language: "Limbă" },
  da: { title: "Vedligeholdelse", tracked_n: "{n} fulgt", overdue_n: "{n} forsinket", all_good: "Alt er ajour", next: "Næste: {name}, {when}", done: "Udført", overdue_days: "{n} d forsinket", due_today: "I dag", in_days: "Om {n} d", in_months: "Om {n} måneder", left_pct: "{p} % tilbage", left_hours: "≈ {n} t", left_days: "≈ {n} dage", empty: "Tom", every_days: "hver {n}. d", every_weeks: "hver {n}. uge", every_months: "hver {n}. md.", manual: "Manuel", nothing: "Intet fulgt endnu", not_found: "Maintenance er ikke sat op", card_name: "Maintenance-kort", card_desc: "Filtre, børster, blæk og opgaver: hvad der er forsinket, hvad der kommer", ed_entity: "Sensor", ed_title: "Titel", ed_rows: "Rækker", ed_language: "Sprog" },
  sv: { title: "Underhåll", tracked_n: "{n} följda", overdue_n: "{n} försenade", all_good: "Allt är aktuellt", next: "Nästa: {name}, {when}", done: "Klar", overdue_days: "{n} d försenad", due_today: "I dag", in_days: "Om {n} d", in_months: "Om {n} månader", left_pct: "{p} % kvar", left_hours: "≈ {n} h", left_days: "≈ {n} dagar", empty: "Tom", every_days: "var {n}:e d", every_weeks: "var {n}:e v.", every_months: "var {n}:e mån.", manual: "Manuell", nothing: "Inget följs än", not_found: "Maintenance är inte konfigurerat", card_name: "Maintenance-kort", card_desc: "Filter, borstar, bläck och sysslor: vad som är försenat, vad som kommer", ed_entity: "Sensor", ed_title: "Rubrik", ed_rows: "Rader", ed_language: "Språk" },
  bg: { title: "Поддръжка", tracked_n: "Следени: {n}", overdue_n: "Просрочени: {n}", all_good: "Всичко е наред", next: "Следващо: {name}, {when}", done: "Готово", overdue_days: "Просрочено с {n} д", due_today: "Днес", in_days: "След {n} д", in_months: "След {n} месеца", left_pct: "Остават {p} %", left_hours: "≈ {n} ч", left_days: "≈ {n} дни", empty: "Празно", every_days: "на {n} д", every_weeks: "на {n} седм.", every_months: "на {n} мес.", manual: "Ръчно", nothing: "Още нищо не се следи", not_found: "Maintenance не е настроен", card_name: "Карта Maintenance", card_desc: "Филтри, четки, мастило и задачи: какво е просрочено, какво следва", ed_entity: "Сензор", ed_title: "Заглавие", ed_rows: "Редове", ed_language: "Език" },
  ru: { title: "Обслуживание", tracked_n: "Отслеживается: {n}", overdue_n: "Просрочено: {n}", all_good: "Всё в порядке", next: "Далее: {name}, {when}", done: "Готово", overdue_days: "Просрочено на {n} дн.", due_today: "Сегодня", in_days: "Через {n} дн.", in_months: "Через {n} мес.", left_pct: "Осталось {p} %", left_hours: "≈ {n} ч", left_days: "≈ {n} дн.", empty: "Пусто", every_days: "каждые {n} дн.", every_weeks: "каждые {n} нед.", every_months: "каждые {n} мес.", manual: "Вручную", nothing: "Пока ничего не отслеживается", not_found: "Maintenance не настроен", card_name: "Карточка Maintenance", card_desc: "Фильтры, щётки, чернила и дела: что просрочено, что дальше", ed_entity: "Датчик", ed_title: "Заголовок", ed_rows: "Строки", ed_language: "Язык" },
  uk: { title: "Обслуговування", tracked_n: "Відстежується: {n}", overdue_n: "Прострочено: {n}", all_good: "Усе гаразд", next: "Далі: {name}, {when}", done: "Готово", overdue_days: "Прострочено на {n} дн.", due_today: "Сьогодні", in_days: "Через {n} дн.", in_months: "Через {n} міс.", left_pct: "Залишилось {p} %", left_hours: "≈ {n} год", left_days: "≈ {n} дн.", empty: "Порожньо", every_days: "кожні {n} дн.", every_weeks: "кожні {n} тиж.", every_months: "кожні {n} міс.", manual: "Вручну", nothing: "Поки нічого не відстежується", not_found: "Maintenance не налаштовано", card_name: "Картка Maintenance", card_desc: "Фільтри, щітки, чорнило й справи: що прострочено, що далі", ed_entity: "Датчик", ed_title: "Заголовок", ed_rows: "Рядки", ed_language: "Мова" },
  hu: { title: "Karbantartás", tracked_n: "{n} követett", overdue_n: "{n} késésben", all_good: "Minden naprakész", next: "Következő: {name}, {when}", done: "Kész", overdue_days: "{n} napja késésben", due_today: "Ma esedékes", in_days: "{n} nap múlva", in_months: "{n} hónap múlva", left_pct: "{p} % maradt", left_hours: "≈ {n} óra", left_days: "≈ {n} nap", empty: "Üres", every_days: "{n} naponta", every_weeks: "{n} hetente", every_months: "{n} havonta", manual: "Kézi", nothing: "Még semmi sincs követve", not_found: "A Maintenance nincs beállítva", card_name: "Maintenance kártya", card_desc: "Szűrők, kefék, tinta és teendők: mi késik, mi következik", ed_entity: "Érzékelő", ed_title: "Cím", ed_rows: "Sorok", ed_language: "Nyelv" },
  sk: { title: "Údržba", tracked_n: "Sledované: {n}", overdue_n: "Po termíne: {n}", all_good: "Všetko je aktuálne", next: "Ďalšie: {name}, {when}", done: "Hotovo", overdue_days: "Po termíne {n} d", due_today: "Dnes", in_days: "O {n} d", in_months: "O {n} mesiacov", left_pct: "Zostáva {p} %", left_hours: "≈ {n} h", left_days: "≈ {n} dní", empty: "Prázdne", every_days: "každých {n} d", every_weeks: "každých {n} týž.", every_months: "každých {n} mes.", manual: "Ručné", nothing: "Zatiaľ nič nesledované", not_found: "Maintenance nie je nastavené", card_name: "Karta Maintenance", card_desc: "Filtre, kefy, atrament a práce: čo je po termíne, čo príde", ed_entity: "Senzor", ed_title: "Názov", ed_rows: "Riadky", ed_language: "Jazyk" },
  cs: { title: "Údržba", tracked_n: "Sledováno: {n}", overdue_n: "Po termínu: {n}", all_good: "Vše je aktuální", next: "Další: {name}, {when}", done: "Hotovo", overdue_days: "Po termínu {n} d", due_today: "Dnes", in_days: "Za {n} d", in_months: "Za {n} měsíců", left_pct: "Zbývá {p} %", left_hours: "≈ {n} h", left_days: "≈ {n} dní", empty: "Prázdné", every_days: "každých {n} d", every_weeks: "každých {n} týd.", every_months: "každých {n} měs.", manual: "Ruční", nothing: "Zatím nic nesledováno", not_found: "Maintenance není nastaveno", card_name: "Karta Maintenance", card_desc: "Filtry, kartáče, inkoust a práce: co je po termínu, co přijde", ed_entity: "Senzor", ed_title: "Název", ed_rows: "Řádky", ed_language: "Jazyk" },
  sl: { title: "Vzdrževanje", tracked_n: "Spremljano: {n}", overdue_n: "Zamuja: {n}", all_good: "Vse je ažurno", next: "Naslednje: {name}, {when}", done: "Opravljeno", overdue_days: "Zamuja {n} d", due_today: "Danes", in_days: "Čez {n} d", in_months: "Čez {n} mesecev", left_pct: "Ostane {p} %", left_hours: "≈ {n} h", left_days: "≈ {n} dni", empty: "Prazno", every_days: "vsakih {n} d", every_weeks: "vsakih {n} ted.", every_months: "vsakih {n} mes.", manual: "Ročno", nothing: "Še nič spremljano", not_found: "Maintenance ni nastavljen", card_name: "Kartica Maintenance", card_desc: "Filtri, krtače, črnilo in opravila: kaj zamuja, kaj sledi", ed_entity: "Senzor", ed_title: "Naslov", ed_rows: "Vrstice", ed_language: "Jezik" },
  lv: { title: "Apkope", tracked_n: "Sekoti: {n}", overdue_n: "Nokavēti: {n}", all_good: "Viss ir kārtībā", next: "Nākamais: {name}, {when}", done: "Izdarīts", overdue_days: "Nokavēts {n} d", due_today: "Šodien", in_days: "Pēc {n} d", in_months: "Pēc {n} mēnešiem", left_pct: "Atlikuši {p} %", left_hours: "≈ {n} h", left_days: "≈ {n} dienas", empty: "Tukšs", every_days: "ik pēc {n} d", every_weeks: "ik pēc {n} ned.", every_months: "ik pēc {n} mēn.", manual: "Manuāls", nothing: "Vēl nekas netiek sekots", not_found: "Maintenance nav iestatīts", card_name: "Maintenance kartīte", card_desc: "Filtri, sukas, tinte un darbi: kas nokavēts, kas nāk", ed_entity: "Sensors", ed_title: "Virsraksts", ed_rows: "Rindas", ed_language: "Valoda" },
  el: { title: "Συντήρηση", tracked_n: "{n} παρακολουθούνται", overdue_n: "{n} εκπρόθεσμα", all_good: "Όλα ενημερωμένα", next: "Επόμενο: {name}, {when}", done: "Έγινε", overdue_days: "Εκπρόθεσμο {n} ημ.", due_today: "Σήμερα", in_days: "Σε {n} ημ.", in_months: "Σε {n} μήνες", left_pct: "Απομένει {p} %", left_hours: "≈ {n} ώρ.", left_days: "≈ {n} ημέρες", empty: "Άδειο", every_days: "κάθε {n} ημ.", every_weeks: "κάθε {n} εβδ.", every_months: "κάθε {n} μήν.", manual: "Χειροκίνητο", nothing: "Τίποτα δεν παρακολουθείται ακόμη", not_found: "Το Maintenance δεν έχει ρυθμιστεί", card_name: "Κάρτα Maintenance", card_desc: "Φίλτρα, βούρτσες, μελάνι και δουλειές: τι καθυστερεί, τι ακολουθεί", ed_entity: "Αισθητήρας", ed_title: "Τίτλος", ed_rows: "Γραμμές", ed_language: "Γλώσσα" },
};

var MT_DEFAULTS = { rows: 5, illustration_theme: 'auto' };
var MT_TONES = { overdue: 'bad', soon: 'warn', ok: 'ok' };

var mtEsc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
var mtLang = (hass, config) => {
  var raw = String(config?.language || hass?.locale?.language || hass?.language || 'en');
  if (MT_CARD_I18N[raw]) return raw;
  var base = raw.split('-')[0];
  return MT_CARD_I18N[base] ? base : 'en';
};
var mtFill = (text, values) => String(text).replace(/\{(\w+)\}/g, (m, k) => (values[k] == null ? m : values[k]));
// The "Overdue" sensor: the one carrying the `maintenance` attribute.
var mtFind = (hass) => Object.keys(hass?.states || {}).find((id) => id.startsWith('sensor.') && hass.states[id]?.attributes?.maintenance);
// When it is due, in words: "Overdue by 5 d", "In 3 d", "In 7 months".
var mtWhen = (item, t) => {
  var d = item.days_left;
  if (d == null) return '';
  if (d < 0) return mtFill(t.overdue_days, { n: -d });
  if (d === 0) return t.due_today;
  return d < 60 ? mtFill(t.in_days, { n: d }) : mtFill(t.in_months, { n: Math.round(d / 30) });
};
// The line under an item's name.
var mtDetail = (item, t) => {
  if (item.kind === 'task') {
    var every = mtFill(t[`every_${item.unit}`] || t.every_days, { n: item.every });
    return [mtWhen(item, t), every].filter(Boolean).join(' · ');
  }
  if (item.status === 'overdue' && !item.percent) return t.empty;
  var parts = [];
  if (item.percent != null) parts.push(mtFill(t.left_pct, { p: item.percent }));
  if (item.days_left != null) parts.push(mtFill(t.left_days, { n: item.days_left }));
  else if (item.hours != null) parts.push(mtFill(t.left_hours, { n: item.hours }));
  return parts.join(' · ');
};

class MaintenanceCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement('maintenance-card-editor');
  }

  static getStubConfig() {
    return {};
  }

  setConfig(config) {
    this._config = Object.assign({}, MT_DEFAULTS, config || {});
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    var id = this._config?.entity || mtFind(hass);
    var st = id ? hass.states[id] : undefined;
    var sig = JSON.stringify([st?.state, st?.attributes, hass.themes?.darkMode, hass.locale?.language, this._config]);
    if (sig === this._sig) return;
    this._sig = sig;
    this._render();
  }

  getCardSize() {
    return 2 + Math.min(Number(this._config?.rows) || 5, 10);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  _night() {
    var theme = this._config.illustration_theme;
    if (theme === 'day') return false;
    if (theme === 'night') return true;
    return !!this._hass?.themes?.darkMode;
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('click', (ev) => this._click(ev));
    }
    var lang = mtLang(this._hass, this._config);
    var t = Object.assign({}, MT_CARD_I18N.en, MT_CARD_I18N[lang]);
    var id = this._config.entity || mtFind(this._hass);
    var a = id ? this._hass.states[id]?.attributes : undefined;
    var tone = 'ok';
    var subtitle = '';
    var pill = '';
    var body;
    if (!a?.maintenance) {
      tone = 'idle';
      body = `<div class="empty">${mtEsc(t.not_found)}</div>`;
    } else {
      var counts = a.counts || {};
      var items = a.items || [];
      var overdue = Number(counts.overdue) || 0;
      tone = overdue ? 'bad' : counts.soon ? 'warn' : 'ok';
      var next = items.find((i) => i.status !== 'ok') || items[0];
      subtitle = [mtFill(t.tracked_n, { n: counts.tracked || 0 }), overdue ? mtFill(t.overdue_n, { n: overdue }) : '']
        .filter(Boolean)
        .join(' · ');
      if (!overdue && next) subtitle = mtFill(t.next, { name: next.name, when: mtWhen(next, t) || mtDetail(next, t) });
      pill = overdue ? mtFill(t.overdue_n, { n: overdue }) : t.all_good;
      var rows = items.slice(0, Math.max(1, Number(this._config.rows) || 5));
      body = rows.length
        ? `<div class="list">${rows
            .map((i) => {
              var tn = MT_TONES[i.status] || 'ok';
              var done = i.status !== 'ok' ? `<button class="btn" type="button" data-done="${mtEsc(i.id)}">${mtEsc(t.done)}</button>` : '';
              return `<div class="row r-${tn}"><span class="dot"><ha-icon icon="${mtEsc(i.icon || 'mdi:wrench')}"></ha-icon></span>
                <span class="txt"><span class="nm">${mtEsc(i.name)}</span><span class="sub">${mtEsc(mtDetail(i, t))}</span></span>
                <span class="chip">${mtEsc(i.source || t.manual)}</span>${done}</div>`;
            })
            .join('')}</div>`
        : `<div class="empty">${mtEsc(t.nothing)}</div>`;
    }
    this.shadowRoot.innerHTML = `<style>${MaintenanceCard.styles()}</style>
      <ha-card class="tone-${tone}${this._night() ? ' night' : ''}">
        <div class="banner">
          ${MaintenanceCard.scene(tone === 'bad')}
          <div class="ground"></div>
          <div class="head">
            <span class="ico"><ha-icon icon="mdi:wrench-clock"></ha-icon></span>
            <span class="htxt"><span class="title">${mtEsc(this._config.title || t.title)}</span>${subtitle ? `<span class="subtitle">${mtEsc(subtitle)}</span>` : ''}</span>
            ${pill ? `<span class="pill">${mtEsc(pill)}</span>` : ''}
          </div>
        </div>
        <div class="body">${body}</div>
      </ha-card>`;
  }

  // The header's scene: a pegboard with a gear turning and a wrench (at work when something is overdue), a filter.
  static scene(busy) {
    return `<svg class="scene" viewBox="0 0 200 90" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <rect class="board" x="30" y="14" width="150" height="70" rx="6"/>
      <g class="holes">${[0, 1, 2, 3, 4, 5]
        .map((x) => [0, 1, 2].map((y) => `<circle cx="${44 + x * 24}" cy="${26 + y * 22}" r="1.6"/>`).join(''))
        .join('')}</g>
      <g class="gear"><path d="M74 33l4 0 1 5 4 2 4-3 3 3-3 4 2 4 5 1 0 4-5 1-2 4 3 4-3 3-4-3-4 2-1 5-4 0-1-5-4-2-4 3-3-3 3-4-2-4-5-1 0-4 5-1 2-4-3-4 3-3 4 3 4-2z"/><circle class="hub" cx="76" cy="50" r="5"/></g>
      <g class="wrench${busy ? ' busy' : ''}"><path d="M118 28a9 9 0 0 0-8 12l-14 26a4 4 0 0 0 7 4l14-26a9 9 0 0 0 11-10l-5 3-5-3 0-5z"/></g>
      <g class="filter"><rect x="140" y="34" width="26" height="36" rx="4"/><path d="M144 42h18M144 50h18M144 58h18"/></g>
    </svg>`;
  }

  async _click(ev) {
    var btn = ev.composedPath().find((n) => n?.dataset?.done);
    if (!btn) return;
    btn.disabled = true;
    try {
      await this._hass.callService('maintenance', 'done', { item: btn.dataset.done });
    } catch (_err) {
      btn.disabled = false;
    }
  }

  static styles() {
    return `
      :host { --mt-ok: var(--success-color, #43a047); --mt-warn: var(--warning-color, #f59e0b); --mt-bad: var(--error-color, #db4437);
              --mt-idle: var(--secondary-text-color, #727272); --mt-accent: #0d9488; }
      ha-card { overflow: hidden; }
      ha-card.tone-ok { --c: var(--mt-accent); } ha-card.tone-warn { --c: var(--mt-warn); } ha-card.tone-bad { --c: var(--mt-bad); }
      ha-card.tone-idle { --c: var(--mt-idle); }
      .banner { position: relative; height: 90px; overflow: hidden; background: linear-gradient(#ccfbf1, #f0fdfa); }
      .night .banner { background: linear-gradient(#0c2626, #153838); }
      .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: #5eead4; }
      .night .ground { background: #2c6b66; }
      .scene { position: absolute; right: 14px; bottom: 6px; height: 44px; width: auto; max-width: 40%; }
      .board { fill: #fdf6e3; stroke: #e7d8b1; stroke-width: 2; } .holes circle { fill: #d6c49a; }
      .night .board { fill: #2b3a3a; stroke: #3f5656; } .night .holes circle { fill: #4f6a6a; }
      .gear path { fill: #5eead4; } .gear .hub { fill: #fdf6e3; } .night .gear path { fill: #2dd4bf; } .night .gear .hub { fill: #2b3a3a; }
      .wrench path { fill: #94a3b8; } .night .wrench path { fill: #cbd5e1; } .tone-bad .wrench path { fill: #ef4444; }
      .filter rect { fill: #fff; stroke: #5eead4; stroke-width: 2; } .filter path { stroke: #99f6e4; stroke-width: 2; }
      .tone-warn .filter rect, .tone-bad .filter rect { stroke: #f59e0b; } .tone-warn .filter path, .tone-bad .filter path { stroke: #fcd34d; }
      .night .filter rect { fill: #e6ebf3; }
      .gear { transform-box: fill-box; transform-origin: 50% 50%; animation: mt-spin 12s linear infinite; }
      .wrench { transform-box: fill-box; transform-origin: 80% 15%; }
      .wrench.busy { animation: mt-turn 1.5s ease-in-out infinite; }
      @keyframes mt-spin { to { transform: rotate(360deg); } }
      @keyframes mt-turn { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-24deg); } }
      @media (prefers-reduced-motion: reduce) { .gear, .wrench.busy { animation: none; } }
      .head { position: absolute; left: 16px; right: 16px; top: 16px; display: flex; align-items: flex-start; gap: 12px; }
      .ico { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
             background: color-mix(in srgb, var(--c) 18%, #fff); color: var(--c); --mdc-icon-size: 22px; }
      .night .ico { background: color-mix(in srgb, var(--c) 30%, #153838); }
      .htxt { flex: 1; min-width: 0; max-width: calc(100% - 170px); display: flex; flex-direction: column; }
      .title { font-size: 16px; font-weight: 700; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .subtitle { font-size: 13px; color: #4b5563; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .night .title { color: #f3f4f6; } .night .subtitle { color: #cbd5e1; }
      .pill { flex: none; margin-top: 6px; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
              color: color-mix(in srgb, var(--c) 70%, #111); background: color-mix(in srgb, var(--c) 16%, #fff); }
      .night .pill { color: color-mix(in srgb, var(--c) 45%, #fff); background: color-mix(in srgb, var(--c) 25%, #153838); }
      .body { padding: 12px 16px 16px; }
      .list { display: flex; flex-direction: column; gap: 6px; }
      .row { --c: var(--mt-ok); display: flex; align-items: center; gap: 10px; min-width: 0; padding: 8px 10px; border-radius: 12px;
             background: var(--secondary-background-color, rgba(127,127,127,.08)); }
      .row.r-bad { --c: var(--mt-bad); background: color-mix(in srgb, var(--mt-bad) 9%, var(--secondary-background-color, transparent)); }
      .row.r-warn { --c: var(--mt-warn); }
      .dot { flex: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; --mdc-icon-size: 17px;
             background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
      .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .nm { font-size: 14px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub { font-size: 12px; color: color-mix(in srgb, var(--c) 70%, var(--primary-text-color)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .r-ok .sub { color: var(--secondary-text-color); }
      .chip { flex: none; max-width: 28%; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
              color: var(--secondary-text-color); background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent); }
      .btn { flex: none; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; padding: 5px 12px; border-radius: 999px;
             color: var(--primary-text-color); background: transparent; border: 1px solid var(--divider-color, rgba(127,127,127,.35)); }
      .btn:hover { background: color-mix(in srgb, var(--secondary-text-color) 10%, transparent); }
      .btn:focus-visible { outline: 2px solid var(--mt-accent); outline-offset: 2px; }
      .btn[disabled] { opacity: .5; cursor: default; }
      .empty { padding: 10px 2px; font-size: 13px; color: var(--secondary-text-color); }
    `;
  }
}

class MaintenanceCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._hass || !this._config) return;
    var t = Object.assign({}, MT_CARD_I18N.en, MT_CARD_I18N[mtLang(this._hass, this._config)]);
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => t[`ed_${s.name}`] || s.name;
      this._form.addEventListener('value-changed', (ev) => {
        var value = Object.assign({}, ev.detail.value);
        for (var key of Object.keys(value)) if (value[key] === '' || value[key] == null || value[key] === MT_DEFAULTS[key]) delete value[key];
        this._config = Object.assign({ type: this._config.type }, value);
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = Object.assign({}, MT_DEFAULTS, this._config);
    this._form.schema = [
      { name: 'entity', selector: { entity: { domain: 'sensor', integration: 'maintenance' } } },
      { name: 'title', selector: { text: {} } },
      { name: 'rows', selector: { number: { min: 1, max: 10, mode: 'box' } } },
      { name: 'language', selector: { select: { mode: 'dropdown', options: Object.keys(MT_CARD_I18N).map((l) => ({ value: l, label: l })) } } },
    ];
  }
}

if (!customElements.get('maintenance-card')) customElements.define('maintenance-card', MaintenanceCard);
if (!customElements.get('maintenance-card-editor')) customElements.define('maintenance-card-editor', MaintenanceCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'maintenance-card')) {
  var mtT = Object.assign({}, MT_CARD_I18N.en, MT_CARD_I18N[mtLang(document.querySelector('home-assistant')?.hass, {})]);
  window.customCards.push({ type: 'maintenance-card', name: mtT.card_name, description: mtT.card_desc, preview: true });
}
