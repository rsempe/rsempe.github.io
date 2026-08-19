(function () {
  "use strict";

  var AVAILABILITY_URL = "/assets/data/availability.json";
  var RATES_URL = "/assets/data/reservation-rates.json";
  var DAY_MS = 24 * 60 * 60 * 1000;

  var LOCALES = {
    fr: "fr-FR", en: "en-GB", de: "de-DE", nl: "nl-NL", it: "it-IT", es: "es-ES"
  };

  // Guest-facing strings. Month and weekday names come from Intl instead.
  // The e-mail built for the owners stays in French whatever the page
  // language: the request always lands in the same French inbox.
  var STRINGS = {
    fr: {
      nights: ["nuit", "nuits"],
      weeks: ["semaine", "semaines"],
      adults: ["adulte", "adultes"],
      persons: ["personne", "personnes"],
      extraNights: ["nuit supp.", "nuits supp."],
      restrictionFallback: "Sur cette période",
      restrictionArrival: function (label, days) { return label + ", l'arrivée se fait le " + days + "."; },
      restrictionMinNights: function (label, n) { return label + ", le séjour minimum est de " + n + " nuits."; },
      restrictionWeekly: function (label, n) {
        return label + ", les séjours se font à la semaine (" + n + ", " + (n * 2) + " nuits...).";
      },
      weekdayJoin: " ou le ",
      season: "Saison",
      until: function (date) { return "jusqu'au " + date; },
      fromTo: function (from, to) { return "du " + from + " au " + to; },
      seasonsJoin: ", puis ",
      seasonsPhrase: function (list) { return "Séjours possibles " + list + " (date de départ incluse)."; },
      dayPast: " passé",
      dayClosed: " hors période d'ouverture",
      dayBusy: " indisponible",
      dayFree: " disponible",
      prevMonths: "Mois précédents",
      nextMonths: "Mois suivants",
      statusStale: "Mise à jour momentanément indisponible. Envoyez-nous vos dates pour confirmation.",
      statusSyncing: "Calendrier en cours de synchronisation. Envoyez-nous vos dates pour confirmation.",
      statusUnavailable: "Calendrier indisponible pour le moment. Envoyez-nous vos dates pour confirmation.",
      availUnknown: "Disponibilité à confirmer : le calendrier n'est pas encore synchronisé.",
      availBusy: "Déjà réservé pour au moins une nuit sélectionnée. Vous pouvez tout de même envoyer la demande, nous regarderons les alternatives possibles.",
      availFree: "Disponible selon notre calendrier.",
      weekendPackage: function (price) { return "Forfait week-end " + price; },
      noAdultTax: "Aucune taxe estimée si aucun adulte assujetti n'est indiqué.",
      vSelectDates: "Sélectionnez une date d'arrivée et une date de départ.",
      vDepartureAfter: "La date de départ doit être après la date d'arrivée.",
      vArrivalPast: "La date d'arrivée ne peut pas être dans le passé.",
      vAtLeastAdult: "Indiquez au moins un adulte.",
      vAtLeastPerson: "Indiquez au moins une personne.",
      vMaxCapacity: function (guests) { return "La capacité maximale est de " + guests + "."; },
      vMinStay: function (n) { return "Le séjour minimum est de " + n + " nuits."; },
      vOutOfSeason: function (phrase) { return "Dates hors période d'ouverture. " + phrase; },
      qLodging: "Hébergement",
      qCleaning: "Ménage",
      qTax: "Taxe de séjour",
      qTotal: "Total estimatif",
      ratesUnavailable: "Tarifs momentanément indisponibles. Vous pouvez nous contacter depuis la page contact."
    },
    en: {
      nights: ["night", "nights"],
      weeks: ["week", "weeks"],
      adults: ["adult", "adults"],
      persons: ["person", "people"],
      extraNights: ["extra night", "extra nights"],
      restrictionFallback: "During this period",
      restrictionArrival: function (label, days) { return label + ": arrival on " + days + " only."; },
      restrictionMinNights: function (label, n) { return label + ": minimum stay is " + n + " nights."; },
      restrictionWeekly: function (label, n) {
        return label + ": stays run by the week (" + n + ", " + (n * 2) + " nights...).";
      },
      weekdayJoin: " or ",
      season: "Season",
      until: function (date) { return "until " + date; },
      fromTo: function (from, to) { return from + " to " + to; },
      seasonsJoin: ", then ",
      seasonsPhrase: function (list) { return "Stays possible " + list + " (departure date included)."; },
      dayPast: " (past)",
      dayClosed: " (outside the booking season)",
      dayBusy: " (unavailable)",
      dayFree: " (available)",
      prevMonths: "Previous months",
      nextMonths: "Next months",
      statusStale: "Update temporarily unavailable. Send us your dates and we will confirm.",
      statusSyncing: "Calendar syncing. Send us your dates and we will confirm.",
      statusUnavailable: "Calendar unavailable right now. Send us your dates and we will confirm.",
      availUnknown: "Availability to be confirmed: the calendar is not synced yet.",
      availBusy: "At least one of the selected nights is already booked. You can still send the request and we will look at the alternatives.",
      availFree: "Available according to our calendar.",
      weekendPackage: function (price) { return "Weekend package " + price; },
      noAdultTax: "No tax estimated when no liable adult is given.",
      vSelectDates: "Select an arrival date and a departure date.",
      vDepartureAfter: "The departure date must be after the arrival date.",
      vArrivalPast: "The arrival date cannot be in the past.",
      vAtLeastAdult: "Enter at least one adult.",
      vAtLeastPerson: "Enter at least one person.",
      vMaxCapacity: function (guests) { return "Maximum capacity is " + guests + "."; },
      vMinStay: function (n) { return "Minimum stay is " + n + " nights."; },
      vOutOfSeason: function (phrase) { return "Dates outside the booking season. " + phrase; },
      qLodging: "Accommodation",
      qCleaning: "Cleaning",
      qTax: "Tourist tax",
      qTotal: "Estimated total",
      ratesUnavailable: "Rates temporarily unavailable. You can reach us from the contact page."
    },
    de: {
      nights: ["Nacht", "Nächte"],
      weeks: ["Woche", "Wochen"],
      adults: ["Erwachsener", "Erwachsene"],
      persons: ["Person", "Personen"],
      extraNights: ["Zusatznacht", "Zusatznächte"],
      restrictionFallback: "In diesem Zeitraum",
      restrictionArrival: function (label, days) { return label + ": Anreise nur " + days + "."; },
      restrictionMinNights: function (label, n) { return label + ": Mindestaufenthalt " + n + " Nächte."; },
      restrictionWeekly: function (label, n) {
        return label + ": Aufenthalte nur wochenweise (" + n + ", " + (n * 2) + " Nächte...).";
      },
      weekdayJoin: " oder ",
      season: "Saison",
      until: function (date) { return "bis " + date; },
      fromTo: function (from, to) { return "von " + from + " bis " + to; },
      seasonsJoin: ", dann ",
      seasonsPhrase: function (list) { return "Aufenthalte möglich " + list + " (Abreisetag inklusive)."; },
      dayPast: " (vergangen)",
      dayClosed: " (außerhalb der Saison)",
      dayBusy: " (nicht verfügbar)",
      dayFree: " (verfügbar)",
      prevMonths: "Vorherige Monate",
      nextMonths: "Nächste Monate",
      statusStale: "Aktualisierung momentan nicht möglich. Senden Sie uns Ihre Daten, wir bestätigen sie.",
      statusSyncing: "Kalender wird synchronisiert. Senden Sie uns Ihre Daten, wir bestätigen sie.",
      statusUnavailable: "Kalender momentan nicht verfügbar. Senden Sie uns Ihre Daten, wir bestätigen sie.",
      availUnknown: "Verfügbarkeit noch zu bestätigen: der Kalender ist noch nicht synchronisiert.",
      availBusy: "Mindestens eine der gewählten Nächte ist bereits belegt. Sie können die Anfrage trotzdem senden, wir prüfen die Alternativen.",
      availFree: "Laut unserem Kalender verfügbar.",
      weekendPackage: function (price) { return "Wochenendpauschale " + price; },
      noAdultTax: "Keine Kurtaxe geschätzt, solange kein pflichtiger Erwachsener angegeben ist.",
      vSelectDates: "Wählen Sie ein Anreise- und ein Abreisedatum.",
      vDepartureAfter: "Das Abreisedatum muss nach dem Anreisedatum liegen.",
      vArrivalPast: "Das Anreisedatum darf nicht in der Vergangenheit liegen.",
      vAtLeastAdult: "Geben Sie mindestens einen Erwachsenen an.",
      vAtLeastPerson: "Geben Sie mindestens eine Person an.",
      vMaxCapacity: function (guests) { return "Maximale Belegung: " + guests + "."; },
      vMinStay: function (n) { return "Der Mindestaufenthalt beträgt " + n + " Nächte."; },
      vOutOfSeason: function (phrase) { return "Daten außerhalb der Saison. " + phrase; },
      qLodging: "Unterkunft",
      qCleaning: "Endreinigung",
      qTax: "Kurtaxe",
      qTotal: "Geschätzte Gesamtsumme",
      ratesUnavailable: "Preise momentan nicht verfügbar. Sie können uns über die Kontaktseite erreichen."
    },
    nl: {
      nights: ["nacht", "nachten"],
      weeks: ["week", "weken"],
      adults: ["volwassene", "volwassenen"],
      persons: ["persoon", "personen"],
      extraNights: ["extra nacht", "extra nachten"],
      restrictionFallback: "In deze periode",
      restrictionArrival: function (label, days) { return label + ": aankomst alleen op " + days + "."; },
      restrictionMinNights: function (label, n) { return label + ": minimaal " + n + " nachten."; },
      restrictionWeekly: function (label, n) {
        return label + ": verblijf per week (" + n + ", " + (n * 2) + " nachten...).";
      },
      weekdayJoin: " of ",
      season: "Seizoen",
      until: function (date) { return "tot " + date; },
      fromTo: function (from, to) { return "van " + from + " tot " + to; },
      seasonsJoin: ", daarna ",
      seasonsPhrase: function (list) { return "Verblijf mogelijk " + list + " (vertrekdatum inbegrepen)."; },
      dayPast: " (verstreken)",
      dayClosed: " (buiten het seizoen)",
      dayBusy: " (niet beschikbaar)",
      dayFree: " (beschikbaar)",
      prevMonths: "Vorige maanden",
      nextMonths: "Volgende maanden",
      statusStale: "Bijwerken tijdelijk niet mogelijk. Stuur ons uw data, wij bevestigen.",
      statusSyncing: "Kalender wordt gesynchroniseerd. Stuur ons uw data, wij bevestigen.",
      statusUnavailable: "Kalender momenteel niet beschikbaar. Stuur ons uw data, wij bevestigen.",
      availUnknown: "Beschikbaarheid nog te bevestigen: de kalender is nog niet gesynchroniseerd.",
      availBusy: "Minstens één van de gekozen nachten is al geboekt. U kunt de aanvraag toch versturen, wij bekijken de alternatieven.",
      availFree: "Beschikbaar volgens onze kalender.",
      weekendPackage: function (price) { return "Weekendpakket " + price; },
      noAdultTax: "Geen toeristenbelasting geschat zonder opgave van een belastingplichtige volwassene.",
      vSelectDates: "Kies een aankomst- en een vertrekdatum.",
      vDepartureAfter: "De vertrekdatum moet na de aankomstdatum liggen.",
      vArrivalPast: "De aankomstdatum kan niet in het verleden liggen.",
      vAtLeastAdult: "Geef minstens één volwassene op.",
      vAtLeastPerson: "Geef minstens één persoon op.",
      vMaxCapacity: function (guests) { return "De maximale capaciteit is " + guests + "."; },
      vMinStay: function (n) { return "Het minimale verblijf is " + n + " nachten."; },
      vOutOfSeason: function (phrase) { return "Data buiten het seizoen. " + phrase; },
      qLodging: "Verblijf",
      qCleaning: "Eindschoonmaak",
      qTax: "Toeristenbelasting",
      qTotal: "Geschat totaal",
      ratesUnavailable: "Tarieven tijdelijk niet beschikbaar. U kunt ons bereiken via de contactpagina."
    },
    it: {
      nights: ["notte", "notti"],
      weeks: ["settimana", "settimane"],
      adults: ["adulto", "adulti"],
      persons: ["persona", "persone"],
      extraNights: ["notte extra", "notti extra"],
      restrictionFallback: "In questo periodo",
      restrictionArrival: function (label, days) { return label + ": arrivo solo " + days + "."; },
      restrictionMinNights: function (label, n) { return label + ": soggiorno minimo di " + n + " notti."; },
      restrictionWeekly: function (label, n) {
        return label + ": soggiorni settimanali (" + n + ", " + (n * 2) + " notti...).";
      },
      weekdayJoin: " o ",
      season: "Stagione",
      until: function (date) { return "fino al " + date; },
      fromTo: function (from, to) { return "dal " + from + " al " + to; },
      seasonsJoin: ", poi ",
      seasonsPhrase: function (list) { return "Soggiorni possibili " + list + " (data di partenza inclusa)."; },
      dayPast: " (passato)",
      dayClosed: " (fuori stagione)",
      dayBusy: " (non disponibile)",
      dayFree: " (disponibile)",
      prevMonths: "Mesi precedenti",
      nextMonths: "Mesi successivi",
      statusStale: "Aggiornamento momentaneamente non disponibile. Inviaci le tue date, le confermeremo.",
      statusSyncing: "Calendario in sincronizzazione. Inviaci le tue date, le confermeremo.",
      statusUnavailable: "Calendario non disponibile in questo momento. Inviaci le tue date, le confermeremo.",
      availUnknown: "Disponibilità da confermare: il calendario non è ancora sincronizzato.",
      availBusy: "Almeno una delle notti selezionate è già prenotata. Puoi comunque inviare la richiesta, cercheremo un'alternativa.",
      availFree: "Disponibile secondo il nostro calendario.",
      weekendPackage: function (price) { return "Pacchetto weekend " + price; },
      noAdultTax: "Nessuna tassa stimata se non è indicato alcun adulto soggetto.",
      vSelectDates: "Seleziona una data di arrivo e una data di partenza.",
      vDepartureAfter: "La data di partenza deve essere successiva alla data di arrivo.",
      vArrivalPast: "La data di arrivo non può essere nel passato.",
      vAtLeastAdult: "Indica almeno un adulto.",
      vAtLeastPerson: "Indica almeno una persona.",
      vMaxCapacity: function (guests) { return "La capacità massima è di " + guests + "."; },
      vMinStay: function (n) { return "Il soggiorno minimo è di " + n + " notti."; },
      vOutOfSeason: function (phrase) { return "Date fuori dal periodo di apertura. " + phrase; },
      qLodging: "Alloggio",
      qCleaning: "Pulizia finale",
      qTax: "Tassa di soggiorno",
      qTotal: "Totale stimato",
      ratesUnavailable: "Prezzi momentaneamente non disponibili. Puoi contattarci dalla pagina contatti."
    },
    es: {
      nights: ["noche", "noches"],
      weeks: ["semana", "semanas"],
      adults: ["adulto", "adultos"],
      persons: ["persona", "personas"],
      extraNights: ["noche extra", "noches extra"],
      restrictionFallback: "En este periodo",
      restrictionArrival: function (label, days) { return label + ": llegada solo el " + days + "."; },
      restrictionMinNights: function (label, n) { return label + ": estancia mínima de " + n + " noches."; },
      restrictionWeekly: function (label, n) {
        return label + ": estancias por semana (" + n + ", " + (n * 2) + " noches...).";
      },
      weekdayJoin: " o el ",
      season: "Temporada",
      until: function (date) { return "hasta el " + date; },
      fromTo: function (from, to) { return "del " + from + " al " + to; },
      seasonsJoin: ", luego ",
      seasonsPhrase: function (list) { return "Estancias posibles " + list + " (fecha de salida incluida)."; },
      dayPast: " (pasado)",
      dayClosed: " (fuera de temporada)",
      dayBusy: " (no disponible)",
      dayFree: " (disponible)",
      prevMonths: "Meses anteriores",
      nextMonths: "Meses siguientes",
      statusStale: "Actualización momentáneamente no disponible. Envíanos tus fechas y las confirmamos.",
      statusSyncing: "Calendario sincronizándose. Envíanos tus fechas y las confirmamos.",
      statusUnavailable: "Calendario no disponible por ahora. Envíanos tus fechas y las confirmamos.",
      availUnknown: "Disponibilidad por confirmar: el calendario aún no está sincronizado.",
      availBusy: "Al menos una de las noches seleccionadas ya está reservada. Puedes enviar la solicitud igualmente y buscaremos alternativas.",
      availFree: "Disponible según nuestro calendario.",
      weekendPackage: function (price) { return "Paquete de fin de semana " + price; },
      noAdultTax: "No se estima tasa si no se indica ningún adulto sujeto.",
      vSelectDates: "Selecciona una fecha de llegada y una de salida.",
      vDepartureAfter: "La fecha de salida debe ser posterior a la de llegada.",
      vArrivalPast: "La fecha de llegada no puede estar en el pasado.",
      vAtLeastAdult: "Indica al menos un adulto.",
      vAtLeastPerson: "Indica al menos una persona.",
      vMaxCapacity: function (guests) { return "La capacidad máxima es de " + guests + "."; },
      vMinStay: function (n) { return "La estancia mínima es de " + n + " noches."; },
      vOutOfSeason: function (phrase) { return "Fechas fuera del periodo de apertura. " + phrase; },
      qLodging: "Alojamiento",
      qCleaning: "Limpieza final",
      qTax: "Tasa turística",
      qTotal: "Total estimado",
      ratesUnavailable: "Precios momentáneamente no disponibles. Puedes contactarnos desde la página de contacto."
    }
  };

  function pageLang() {
    var lang = String(document.documentElement.getAttribute("lang") || "fr").slice(0, 2).toLowerCase();
    return STRINGS[lang] ? lang : "fr";
  }

  var LANG = pageLang();
  var LOCALE = LOCALES[LANG];
  var T = STRINGS[LANG];

  function plural(count, forms) {
    return count + " " + forms[Math.abs(count) === 1 ? 0 : 1];
  }

  function intlNames(options) {
    var formatter = new Intl.DateTimeFormat(LOCALE, options);
    var count = options.month ? 12 : 7;
    var names = [];
    for (var index = 0; index < count; index += 1) {
      // 2021-08-01 was a Sunday, so weekday indexes match Date#getUTCDay().
      names.push(formatter.format(options.month
        ? new Date(Date.UTC(2021, index, 1))
        : new Date(Date.UTC(2021, 7, 1 + index))));
    }
    return names;
  }

  // Month names head the calendars, so they are capitalised; the long weekday
  // names appear inside sentences and keep the locale's own casing.
  var MONTHS = intlNames({ month: "long", timeZone: "UTC" }).map(capitalize);
  var WEEKDAY_NAMES = intlNames({ weekday: "long", timeZone: "UTC" });
  var WEEKDAY_INITIALS = intlNames({ weekday: "narrow", timeZone: "UTC" }).map(capitalize);
  // Calendar columns start on Monday.
  var WEEKDAYS = [1, 2, 3, 4, 5, 6, 0].map(function (index) {
    return WEEKDAY_INITIALS[index];
  });

  var state = {
    availability: null,
    rates: null,
    availabilityError: false,
    ratesError: false
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function dateOnlyToDay(value) {
    var parts = String(value || "").slice(0, 10).split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      return NaN;
    }
    return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / DAY_MS);
  }

  function dayToIso(day) {
    return new Date(day * DAY_MS).toISOString().slice(0, 10);
  }

  function todayDay() {
    var date = new Date();
    return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
  }

  function timedToExclusiveDay(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return dateOnlyToDay(value);
    }

    var day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS);
    var isMidnight = date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
    return isMidnight ? day : day + 1;
  }

  function rangeToDays(range) {
    var start = dateOnlyToDay(range.start);
    var end = range.allDay ? dateOnlyToDay(range.end) : timedToExclusiveDay(range.end);
    var days = [];

    for (var day = start; day < end; day += 1) {
      days.push(day);
    }

    return days;
  }

  function buildBusySet(item) {
    var busy = new Set();
    (item.busy || []).forEach(function (range) {
      rangeToDays(range).forEach(function (day) {
        busy.add(day);
      });
    });
    return busy;
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: state.rates && state.rates.currency ? state.rates.currency : "EUR"
    }).format(Math.round((amount + Number.EPSILON) * 100) / 100);
  }

  function formatDate(value) {
    var date = new Date(String(value).slice(0, 10) + "T00:00:00Z");
    return new Intl.DateTimeFormat(LOCALE, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  function formatDayMonth(value) {
    var date = new Date(String(value).slice(0, 10) + "T00:00:00Z");
    return new Intl.DateTimeFormat(LOCALE, {
      day: "numeric",
      month: "long",
      timeZone: "UTC"
    }).format(date);
  }


  function nightsBetween(start, end) {
    return dateOnlyToDay(end) - dateOnlyToDay(start);
  }

  // Booking seasons: start = first possible arrival, end = last departure.
  // A night "day" is open when season.start <= day < season.end.
  function getSeasons(key) {
    var rate = getRate(key);
    return rate && Array.isArray(rate.seasons) && rate.seasons.length ? rate.seasons : null;
  }

  function buildOpenSet(seasons) {
    var open = new Set();
    seasons.forEach(function (season) {
      var start = dateOnlyToDay(season.start);
      var end = dateOnlyToDay(season.end);
      for (var day = start; day < end; day += 1) {
        open.add(day);
      }
    });
    return open;
  }

  // High-season restrictions (e.g. week-long stays, weekend arrivals only).
  // A restriction applies as soon as one night of the stay falls inside it.
  function findRestriction(key, startDay, endDay) {
    var rate = getRate(key);
    var list = rate && Array.isArray(rate.restrictions) ? rate.restrictions : [];
    var match = null;

    list.forEach(function (restriction) {
      var from = dateOnlyToDay(restriction.start);
      var to = dateOnlyToDay(restriction.end);
      if (startDay < to && endDay > from) {
        match = restriction;
      }
    });

    return match;
  }

  function weekdayOfDay(day) {
    return new Date(day * DAY_MS).getUTCDay();
  }

  function listWeekdays(weekdays) {
    return weekdays.map(function (index) {
      return WEEKDAY_NAMES[index];
    }).join(T.weekdayJoin);
  }

  function isAllowedArrival(key, day) {
    var restriction = findRestriction(key, day, day + 1);
    if (!restriction || !Array.isArray(restriction.arrivalWeekdays)) {
      return true;
    }
    return restriction.arrivalWeekdays.indexOf(weekdayOfDay(day)) !== -1;
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // Returns "" when the stay complies, otherwise the reason to display.
  function restrictionIssue(key, startDay, endDay) {
    var restriction = findRestriction(key, startDay, endDay);
    if (!restriction) {
      return "";
    }

    var nights = endDay - startDay;
    var raw = restriction.labels ? restriction.labels[LANG] || restriction.labels.fr : restriction.label;
    var label = raw ? capitalize(raw) : T.restrictionFallback;

    if (Array.isArray(restriction.arrivalWeekdays) &&
        restriction.arrivalWeekdays.indexOf(weekdayOfDay(startDay)) === -1) {
      return T.restrictionArrival(label, listWeekdays(restriction.arrivalWeekdays));
    }
    if (restriction.minNights && nights < restriction.minNights) {
      return T.restrictionMinNights(label, restriction.minNights);
    }
    if (restriction.nightsMultiple && nights % restriction.nightsMultiple !== 0) {
      return T.restrictionWeekly(label, restriction.nightsMultiple);
    }
    return "";
  }

  function formatSeasonsPhrase(seasons, currentTodayDay) {
    var parts = seasons
      .filter(function (season) {
        return dateOnlyToDay(season.end) > currentTodayDay;
      })
      .map(function (season) {
        if (dateOnlyToDay(season.start) <= currentTodayDay) {
          return T.until(formatDate(season.end));
        }
        return T.fromTo(formatDate(season.start), formatDate(season.end));
      });
    return T.seasonsPhrase(parts.join(T.seasonsJoin));
  }

  function renderMonth(year, month, busySet, currentTodayDay, openSet) {
    var first = new Date(Date.UTC(year, month, 1));
    var daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    var offset = (first.getUTCDay() + 6) % 7;
    var html = "";

    html += '<div class="availability-month">';
    html += '<h4>' + MONTHS[month] + " " + year + "</h4>";
    html += '<div class="availability-days availability-weekdays">';
    WEEKDAYS.forEach(function (day) {
      html += "<span>" + day + "</span>";
    });
    html += "</div>";
    html += '<div class="availability-days">';

    for (var blank = 0; blank < offset; blank += 1) {
      html += '<span class="availability-day is-empty"></span>';
    }

    for (var date = 1; date <= daysInMonth; date += 1) {
      var currentDay = Math.floor(Date.UTC(year, month, date) / DAY_MS);
      var classes = ["availability-day"];
      var label = formatDate(dayToIso(currentDay));

      if (currentDay < currentTodayDay) {
        classes.push("is-past");
        label += T.dayPast;
      } else if (openSet && !openSet.has(currentDay)) {
        classes.push("is-closed");
        label += T.dayClosed;
      } else if (busySet.has(currentDay)) {
        classes.push("is-busy");
        label += T.dayBusy;
      } else {
        classes.push("is-free");
        label += T.dayFree;
      }

      html += '<span class="' + classes.join(" ") + '" data-day="' + currentDay + '" aria-label="' + label + '">' + date + "</span>";
    }

    html += "</div></div>";
    return html;
  }

  function renderCalendars(widget, item) {
    var calendars = widget.querySelector("[data-availability-calendars]");
    var currentTodayDay = todayDay();
    var busySet = buildBusySet(item);
    var today = new Date();
    var html = "";
    var seasons = getSeasons(widget.getAttribute("data-availability-widget"));

    if (seasons) {
      // One collapsible block per booking season; the current (or next)
      // season is expanded by default. Months are paged two at a time.
      var openSet = buildOpenSet(seasons);
      var firstRendered = true;
      calendars.innerHTML = "";

      seasons.forEach(function (season) {
        var seasonStart = dateOnlyToDay(season.start);
        var seasonLastNight = dateOnlyToDay(season.end) - 1;
        if (seasonLastNight < currentTodayDay) {
          return;
        }

        var endDate = new Date(dateOnlyToDay(season.end) * DAY_MS);
        var title = T.season + " " + endDate.getUTCFullYear() + " · " +
          (seasonStart <= currentTodayDay
            ? T.until(formatDayMonth(season.end))
            : T.fromTo(formatDayMonth(season.start), formatDayMonth(season.end)));

        var months = [];
        var firstDay = Math.max(seasonStart, currentTodayDay);
        var cursor = new Date(firstDay * DAY_MS);
        cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
        while (Math.floor(cursor.getTime() / DAY_MS) <= seasonLastNight) {
          months.push({ year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() });
          cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
        }

        var details = document.createElement("details");
        details.className = "availability-season";
        if (firstRendered) {
          details.open = true;
        }
        firstRendered = false;
        details.innerHTML =
          '<summary class="availability-season-title">' + escapeHtml(title) + "</summary>" +
          '<div class="availability-pager">' +
          '<button type="button" class="availability-nav" data-nav="prev" aria-label="' + escapeHtml(T.prevMonths) + '">&#8249;</button>' +
          '<button type="button" class="availability-nav" data-nav="next" aria-label="' + escapeHtml(T.nextMonths) + '">&#8250;</button>' +
          "</div>" +
          '<div class="availability-season-months"></div>';
        calendars.appendChild(details);

        var monthsEl = details.querySelector(".availability-season-months");
        var prevBtn = details.querySelector('[data-nav="prev"]');
        var nextBtn = details.querySelector('[data-nav="next"]');
        var PER_PAGE = 2;
        var pageCount = Math.max(1, Math.ceil(months.length / PER_PAGE));
        var page = 0;

        function paintPage() {
          var slice = months.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
          monthsEl.innerHTML = slice.map(function (m) {
            return renderMonth(m.year, m.month, busySet, currentTodayDay, openSet);
          }).join("");
          prevBtn.disabled = page === 0;
          nextBtn.disabled = page >= pageCount - 1;
          if (typeof calendars._paintSelection === "function") {
            calendars._paintSelection();
          }
        }

        prevBtn.addEventListener("click", function () {
          if (page > 0) {
            page -= 1;
            paintPage();
          }
        });
        nextBtn.addEventListener("click", function () {
          if (page < pageCount - 1) {
            page += 1;
            paintPage();
          }
        });

        paintPage();
      });
      return;
    }

    var monthsCount = Number(widget.getAttribute("data-availability-months") || 4);
    for (var offset = 0; offset < monthsCount; offset += 1) {
      var monthDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() + offset, 1));
      html += renderMonth(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), busySet, currentTodayDay);
    }

    calendars.innerHTML = html;
  }


  function renderStatus(widget, item, generatedAt) {
    var status = widget.querySelector("[data-availability-status]");

    if (item.error) {
      status.innerHTML = escapeHtml(T.statusStale);
      status.className = "availability-status is-warning";
      return false;
    }

    if (!item.sourceConfigured) {
      status.innerHTML = escapeHtml(T.statusSyncing);
      status.className = "availability-status is-warning";
      return false;
    }

    // Calendar in sync: no status line needed.
    status.innerHTML = "";
    status.className = "availability-status";
    return true;
  }

  function renderWidget(widget) {
    var key = widget.getAttribute("data-availability-widget");
    var item = state.availability && state.availability.accommodations && state.availability.accommodations[key];

    if (!item) {
      return;
    }

    if (!renderStatus(widget, item, state.availability.generatedAt)) {
      return;
    }

    renderCalendars(widget, item);
    initCalendarSelection(widget);
  }

  // Click-to-select: first click picks the arrival date, second click the
  // departure date; the matching request form is pre-filled and scrolled to.
  function initCalendarSelection(widget) {
    var key = widget.getAttribute("data-availability-widget");
    var form = document.querySelector('[data-reservation-form="' + key + '"]');
    var calendars = widget.querySelector("[data-availability-calendars]");

    if (!form || !calendars || calendars._selectionBound) {
      return;
    }
    calendars._selectionBound = true;

    // The form only appears once both dates are picked in the calendar.
    // (Without an interactive calendar the form stays visible as fallback.)
    form.classList.add("is-pending-dates");

    var selection = { start: null, end: null };

    function minNights() {
      var rate = getRate(key);
      return rate && rate.minNights ? rate.minNights : 1;
    }

    // Departures that break the minimum stay or a high-season restriction
    // (week-long stays, weekend arrivals) are not selectable.
    function isTooSoon(day) {
      if (selection.start === null || selection.end !== null || day <= selection.start) {
        return false;
      }
      if (day - selection.start < minNights()) {
        return true;
      }
      return Boolean(restrictionIssue(key, selection.start, day));
    }

    function paint() {
      var cells = calendars.querySelectorAll(".availability-day[data-day]");
      Array.prototype.forEach.call(cells, function (cell) {
        var day = Number(cell.getAttribute("data-day"));
        cell.classList.remove("is-selected", "is-in-range", "is-too-soon");
        if ((selection.start !== null && day === selection.start) ||
            (selection.end !== null && day === selection.end)) {
          cell.classList.add("is-selected");
        } else if (selection.start !== null && selection.end !== null &&
            day > selection.start && day < selection.end &&
            !cell.classList.contains("is-busy")) {
          cell.classList.add("is-in-range");
        } else if (isTooSoon(day)) {
          cell.classList.add("is-too-soon");
        }
      });
    }

    calendars._paintSelection = paint;

    // Contextual hint (e.g. "arrival on Saturday or Sunday"), shown in the
    // status line which is otherwise empty when everything is fine.
    function showHint(message) {
      var status = widget.querySelector("[data-availability-status]");
      if (!status) {
        return;
      }
      status.innerHTML = message ? escapeHtml(message) : "";
      status.className = message ? "availability-status is-warning" : "availability-status";
    }

    function apply() {
      var arrival = getField(form, "arrival_date");
      var departure = getField(form, "departure_date");
      if (arrival) {
        arrival.value = selection.start !== null ? dayToIso(selection.start) : "";
      }
      if (departure) {
        departure.value = selection.end !== null ? dayToIso(selection.end) : "";
      }
      updateReservationForm(form);
      if (selection.start !== null && selection.end !== null) {
        form.classList.remove("is-pending-dates");
        ensureHashcash(form);
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    calendars.addEventListener("click", function (event) {
      var cell = event.target.closest ? event.target.closest(".availability-day[data-day]") : null;
      if (!cell || !calendars.contains(cell)) {
        return;
      }

      var day = Number(cell.getAttribute("data-day"));
      if (day < todayDay()) {
        return;
      }
      var isFree = cell.classList.contains("is-free");

      if (selection.start === null || selection.end !== null) {
        // Start a new selection: the arrival night must be free.
        if (!isFree) {
          return;
        }
        if (!isAllowedArrival(key, day)) {
          showHint(restrictionIssue(key, day, day + 1));
          return;
        }
        showHint("");
        selection.start = day;
        selection.end = null;
      } else if (day > selection.start) {
        // Enforce the minimum stay before anything else.
        if (isTooSoon(day)) {
          return;
        }
        // Any later date can be the departure (checkout on a busy or
        // season-end day is legitimate; the form validates the details).
        selection.end = day;
      } else if (isFree) {
        // Clicked on/before the arrival: restart from there.
        if (!isAllowedArrival(key, day)) {
          showHint(restrictionIssue(key, day, day + 1));
          return;
        }
        showHint("");
        selection.start = day;
        selection.end = null;
      } else {
        return;
      }

      paint();
      apply();
    });
  }

  function getRate(key) {
    return state.rates && state.rates.accommodations && state.rates.accommodations[key];
  }

  function getAvailabilityItem(key) {
    return state.availability && state.availability.accommodations && state.availability.accommodations[key];
  }

  function getField(form, name) {
    return form.querySelector('[name="' + name + '"]');
  }

  // NiceTouch keeps a single global Hashcash worker, so on a page with two
  // request forms the second script cancels the first form's proof-of-work
  // and its submit button stays on "Waiting for verification ...".
  // Re-mint on demand for the form the visitor is actually using.
  function ensureHashcash(form) {
    var input = getField(form, "hashcash");
    if (!input || input.value || form._hashcashRetried) {
      return;
    }
    if (typeof Hashcash !== "function") {
      return;
    }
    form._hashcashRetried = true;
    try {
      new Hashcash(input);
    } catch (error) {
      form._hashcashRetried = false;
    }
  }

  function getFieldValue(form, name) {
    var field = getField(form, name);
    return field ? field.value.trim() : "";
  }

  function getReservationValues(form) {
    var adults = Number(getFieldValue(form, "adults") || 0);
    var children = Number(getFieldValue(form, "children") || 0);

    return {
      accommodationKey: form.getAttribute("data-reservation-form"),
      start: getFieldValue(form, "arrival_date"),
      end: getFieldValue(form, "departure_date"),
      adults: adults,
      children: children,
      guests: adults + children,
      hasChildrenField: Boolean(getField(form, "children")),
      name: getFieldValue(form, "guest_name"),
      email: getFieldValue(form, "sender"),
      phone: getFieldValue(form, "phone"),
      note: getFieldValue(form, "guest_message")
    };
  }

  function getAvailabilityStatus(key, start, end) {
    var item = getAvailabilityItem(key);
    var startDay = dateOnlyToDay(start);
    var endDay = dateOnlyToDay(end);

    if (!item || state.availabilityError || item.error || !item.sourceConfigured) {
      return {
        status: "unknown",
        message: T.availUnknown
      };
    }

    var busySet = buildBusySet(item);
    for (var day = startDay; day < endDay; day += 1) {
      if (busySet.has(day)) {
        return {
          status: "busy",
          message: T.availBusy
        };
      }
    }

    return {
      status: "free",
      message: T.availFree
    };
  }

  function computeLodging(pricing, nights) {
    var lodging = 0;
    var detail = "";

    if (pricing.model === "nightly") {
      lodging = nights * pricing.nightlyRate;
      detail = plural(nights, T.nights) + " x " + formatCurrency(pricing.nightlyRate);
    } else if (pricing.model === "villa_bundle") {
      if (nights < pricing.weekNights) {
        lodging = pricing.weekendPrice + Math.max(0, nights - pricing.weekendNights) * pricing.extraNightPrice;
        detail = T.weekendPackage(formatCurrency(pricing.weekendPrice));
        if (nights > pricing.weekendNights) {
          detail += " + " + plural(nights - pricing.weekendNights, T.extraNights);
        }
      } else {
        var weeks = Math.floor(nights / pricing.weekNights);
        var extraNights = nights % pricing.weekNights;
        lodging = weeks * pricing.weekPrice + extraNights * pricing.extraNightPrice;
        detail = plural(weeks, T.weeks) + " x " + formatCurrency(pricing.weekPrice);
        if (extraNights) {
          detail += " + " + plural(extraNights, T.extraNights);
        }
      }
    }

    return {
      amount: lodging,
      cleaningFee: pricing.cleaningFee || 0,
      detail: detail
    };
  }

  function computeTouristTax(rate, lodgingAmount, nights, adults, guests) {
    var tax = rate.touristTax || {};
    var taxableGuests = Math.max(0, adults);
    var perAdultNight = 0;

    if (!taxableGuests || !nights) {
      return {
        amount: 0,
        detail: T.noAdultTax
      };
    }

    if (tax.model === "fixed") {
      perAdultNight = tax.perAdultNight || 0;
    } else if (tax.model === "proportional") {
      var guestCount = Math.max(1, guests);
      var nightlyPerGuest = lodgingAmount / nights / guestCount;
      perAdultNight = Math.min(nightlyPerGuest * (tax.rateWithAdditionalTax || 0), tax.capWithAdditionalTax || Infinity);
    }

    return {
      amount: perAdultNight * nights * taxableGuests,
      detail: plural(taxableGuests, T.adults) + " x " + plural(nights, T.nights) +
        " x " + formatCurrency(perAdultNight)
    };
  }

  function validateReservation(rate, values, nights) {
    if (!values.start || !values.end) {
      return T.vSelectDates;
    }
    if (!Number.isFinite(nights) || nights <= 0) {
      return T.vDepartureAfter;
    }
    if (dateOnlyToDay(values.start) < todayDay()) {
      return T.vArrivalPast;
    }
    if (!values.adults || values.adults < 1) {
      return values.hasChildrenField ? T.vAtLeastAdult : T.vAtLeastPerson;
    }
    if (values.guests > rate.maxGuests) {
      return T.vMaxCapacity(plural(rate.maxGuests, T.persons));
    }
    if (nights < rate.minNights) {
      return T.vMinStay(rate.minNights);
    }
    var restrictionMessage = restrictionIssue(values.accommodationKey,
      dateOnlyToDay(values.start), dateOnlyToDay(values.end));
    if (restrictionMessage) {
      return restrictionMessage;
    }
    if (rate.seasons && rate.seasons.length) {
      var arrivalDay = dateOnlyToDay(values.start);
      var departureDay = dateOnlyToDay(values.end);
      var withinSeason = rate.seasons.some(function (season) {
        return arrivalDay >= dateOnlyToDay(season.start) && departureDay <= dateOnlyToDay(season.end);
      });
      if (!withinSeason) {
        return T.vOutOfSeason(formatSeasonsPhrase(rate.seasons, todayDay()));
      }
    }
    return "";
  }

  function renderQuote(form, result) {
    var target = form.querySelector("[data-reservation-result]");
    if (!target) {
      return;
    }

    if (!result.ready) {
      target.className = "reservation-result is-muted";
      target.innerHTML = escapeHtml(result.message);
      return;
    }

    target.className = "reservation-result " + (
      result.availability.status === "busy" ? "is-busy" :
        result.availability.status === "unknown" ? "is-warning" : "is-ready"
    );
    target.innerHTML = [
      // Only warnings are worth a heading; "available" is already implied.
      result.availability.status === "free"
        ? null
        : '<strong>' + escapeHtml(result.availability.message) + "</strong>",
      '<dl>',
      "<dt>" + escapeHtml(T.qLodging) + "</dt><dd>" + escapeHtml(formatCurrency(result.lodging.amount)) + " <span>" + escapeHtml(result.lodging.detail) + "</span></dd>",
      result.lodging.cleaningFee
        ? "<dt>" + escapeHtml(T.qCleaning) + "</dt><dd>" + escapeHtml(formatCurrency(result.lodging.cleaningFee)) + "</dd>"
        : null,
      "<dt>" + escapeHtml(T.qTax) + "</dt><dd>" + escapeHtml(formatCurrency(result.touristTax.amount)) + " <span>" + escapeHtml(result.touristTax.detail) + "</span></dd>",
      "<dt>" + escapeHtml(T.qTotal) + "</dt><dd><strong>" + escapeHtml(formatCurrency(result.total)) + "</strong></dd>",
      '</dl>'
    ].filter(function (part) {
      return part !== null;
    }).join("");
  }

  function calculateReservation(form) {
    var values = getReservationValues(form);
    var rate = getRate(values.accommodationKey);
    var nights = nightsBetween(values.start, values.end);
    var validationError;
    var availability;
    var lodging;
    var touristTax;

    if (!rate) {
      return {
        ready: false,
        canSubmit: false,
        message: T.ratesUnavailable
      };
    }

    validationError = validateReservation(rate, values, nights);
    if (validationError) {
      return {
        ready: false,
        canSubmit: false,
        values: values,
        rate: rate,
        message: validationError
      };
    }

    lodging = computeLodging(rate.pricing, nights);
    touristTax = computeTouristTax(rate, lodging.amount, nights, values.adults, values.guests);
    availability = getAvailabilityStatus(values.accommodationKey, values.start, values.end);

    return {
      ready: true,
      canSubmit: true,
      values: values,
      rate: rate,
      nights: nights,
      lodging: lodging,
      touristTax: touristTax,
      availability: availability,
      total: lodging.amount + lodging.cleaningFee + touristTax.amount
    };
  }

  var LANG_NAMES = {
    fr: "français", en: "anglais", de: "allemand", nl: "néerlandais", it: "italien", es: "espagnol"
  };

  // Formats and wording follow the page language everywhere except here: the
  // request lands in a French inbox, so the message is rebuilt in French.
  function inFrench(build) {
    var previousT = T;
    var previousLocale = LOCALE;
    T = STRINGS.fr;
    LOCALE = LOCALES.fr;
    try {
      return build();
    } finally {
      T = previousT;
      LOCALE = previousLocale;
    }
  }

  function buildReservationMessage(result) {
    return inFrench(function () {
      return frenchReservationMessage(result);
    });
  }

  function frenchReservationMessage(result) {
    var values = result.values;
    var lodging = computeLodging(result.rate.pricing, result.nights);
    var touristTax = computeTouristTax(result.rate, lodging.amount, result.nights, values.adults, values.guests);
    var lines = [
      "Demande de réservation depuis le site Les Célestins",
      "",
      "Logement : " + result.rate.label,
      "Arrivée : " + formatDate(values.start),
      "Départ : " + formatDate(values.end),
      "Nombre de nuits : " + result.nights,
      values.hasChildrenField ? "Adultes : " + values.adults : "Personnes : " + values.adults,
      values.hasChildrenField ? "Enfants mineurs : " + values.children : null,
      "",
      "Disponibilité : " + (STRINGS.fr["avail" + capitalize(result.availability.status)] || result.availability.message),
      "Hébergement estimé : " + formatCurrency(lodging.amount) + " (" + lodging.detail + ")",
      "Ménage : " + formatCurrency(lodging.cleaningFee),
      "Taxe de séjour estimée : " + formatCurrency(touristTax.amount) + " (" + touristTax.detail + ")",
      "Total estimatif : " + formatCurrency(result.total),
      "",
      "Contact",
      "Nom : " + values.name,
      "Email : " + values.email,
      "Téléphone : " + (values.phone || "Non renseigné"),
      "Langue du visiteur : " + (LANG_NAMES[LANG] || LANG)
    ];

    if (values.note) {
      lines.push("", "Message :", values.note);
    }

    lines.push("", "Le paiement n'a pas été effectué sur le site. Le montant et la réservation restent à confirmer manuellement.");
    return lines.filter(function (line) {
      return line !== null;
    }).join("\n");
  }

  function updateSubmitState(form, result) {
    var submit = form.querySelector('[type="submit"]');
    var hashcash = getField(form, "hashcash");
    var hashcashReady = !hashcash || Boolean(hashcash.value);

    // Covers dates typed straight into the fields, without the calendar.
    if (result.canSubmit && !hashcashReady) {
      ensureHashcash(form);
    }

    if (submit) {
      submit.disabled = !result.canSubmit || !hashcashReady;
    }
  }

  function updateReservationForm(form) {
    var result = calculateReservation(form);
    form._reservationResult = result;
    renderQuote(form, result);
    updateSubmitState(form, result);
  }

  function prepareReservationSubmission(form, event) {
    var result = calculateReservation(form);
    var subject = getField(form, "subject");
    var body = getField(form, "body");

    form._reservationResult = result;
    renderQuote(form, result);
    updateSubmitState(form, result);

    if (!result.canSubmit) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (subject) {
      subject.value = inFrench(function () {
        return "Demande de réservation - " + result.rate.label + " - " + formatDate(result.values.start);
      });
    }
    if (body) {
      body.value = buildReservationMessage(result);
    }
  }

  function initReservationForms() {
    var forms = Array.prototype.slice.call(document.querySelectorAll("[data-reservation-form]"));
    var minDate = dayToIso(todayDay());

    forms.forEach(function (form) {
      var dateFields = Array.prototype.slice.call(form.querySelectorAll('input[type="date"]'));
      dateFields.forEach(function (field) {
        field.min = minDate;
      });

      form.addEventListener("input", function () {
        updateReservationForm(form);
      });
      form.addEventListener("change", function () {
        updateReservationForm(form);
      });
      form.addEventListener("hashcash:minted", function () {
        updateReservationForm(form);
      });
      form.addEventListener("submit", function (event) {
        prepareReservationSubmission(form, event);
      }, true);

      updateReservationForm(form);
    });
  }

  function renderAvailabilityWidgets() {
    var widgets = Array.prototype.slice.call(document.querySelectorAll("[data-availability-widget]"));

    if (!state.availability) {
      widgets.forEach(function (widget) {
        var status = widget.querySelector("[data-availability-status]");
        if (status) {
          status.innerHTML = escapeHtml(T.statusUnavailable);
          status.className = "availability-status is-warning";
        }
      });
      return;
    }

    widgets.forEach(renderWidget);
  }

  function init() {
    var hasAvailabilityWidgets = document.querySelector("[data-availability-widget]");
    var hasReservationForms = document.querySelector("[data-reservation-form]");

    if (!window.fetch || (!hasAvailabilityWidgets && !hasReservationForms)) {
      return;
    }

    Promise.all([
      fetch(AVAILABILITY_URL, { cache: "no-store" })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Availability data unavailable");
          }
          return response.json();
        })
        .catch(function () {
          state.availabilityError = true;
          return null;
        }),
      fetch(RATES_URL, { cache: "no-store" })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Rate data unavailable");
          }
          return response.json();
        })
        .catch(function () {
          state.ratesError = true;
          return null;
        })
    ]).then(function (results) {
      state.availability = results[0];
      state.rates = results[1];

      renderAvailabilityWidgets();
      initReservationForms();
    }).catch(function () {
      state.availabilityError = true;
      state.ratesError = true;
      renderAvailabilityWidgets();
      initReservationForms();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
