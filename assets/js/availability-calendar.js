(function () {
  "use strict";

  var AVAILABILITY_URL = "/assets/data/availability.json";
  var RATES_URL = "/assets/data/reservation-rates.json";
  var MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  var WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
  var WEEKDAY_NAMES = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  var DAY_MS = 24 * 60 * 60 * 1000;

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
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: state.rates && state.rates.currency ? state.rates.currency : "EUR"
    }).format(Math.round((amount + Number.EPSILON) * 100) / 100);
  }

  function formatDate(value) {
    var date = new Date(String(value).slice(0, 10) + "T00:00:00Z");
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function formatDayMonth(value) {
    var date = new Date(String(value).slice(0, 10) + "T00:00:00Z");
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long"
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
    }).join(" ou le ");
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
    var label = restriction.label ? capitalize(restriction.label) : "Sur cette période";

    if (Array.isArray(restriction.arrivalWeekdays) &&
        restriction.arrivalWeekdays.indexOf(weekdayOfDay(startDay)) === -1) {
      return label + ", l'arrivée se fait le " + listWeekdays(restriction.arrivalWeekdays) + ".";
    }
    if (restriction.minNights && nights < restriction.minNights) {
      return label + ", le séjour minimum est de " + restriction.minNights + " nuits.";
    }
    if (restriction.nightsMultiple && nights % restriction.nightsMultiple !== 0) {
      return label + ", les séjours se font à la semaine (" + restriction.nightsMultiple +
        ", " + (restriction.nightsMultiple * 2) + " nuits...).";
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
          return "jusqu'au " + formatDate(season.end);
        }
        return "du " + formatDate(season.start) + " au " + formatDate(season.end);
      });
    return "Séjours possibles " + parts.join(", puis ") + " (date de départ incluse).";
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
      var label = date + " " + MONTHS[month] + " " + year;

      if (currentDay < currentTodayDay) {
        classes.push("is-past");
        label += " passé";
      } else if (openSet && !openSet.has(currentDay)) {
        classes.push("is-closed");
        label += " hors période d'ouverture";
      } else if (busySet.has(currentDay)) {
        classes.push("is-busy");
        label += " indisponible";
      } else {
        classes.push("is-free");
        label += " disponible";
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
        var title = "Saison " + endDate.getUTCFullYear() + " · " +
          (seasonStart <= currentTodayDay
            ? "jusqu'au " + formatDayMonth(season.end)
            : "du " + formatDayMonth(season.start) + " au " + formatDayMonth(season.end));

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
          '<button type="button" class="availability-nav" data-nav="prev" aria-label="Mois précédents">&#8249;</button>' +
          '<button type="button" class="availability-nav" data-nav="next" aria-label="Mois suivants">&#8250;</button>' +
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
      status.innerHTML = "Mise à jour momentanément indisponible. Envoyez-nous vos dates pour confirmation.";
      status.className = "availability-status is-warning";
      return false;
    }

    if (!item.sourceConfigured) {
      status.innerHTML = "Calendrier en cours de synchronisation. Envoyez-nous vos dates pour confirmation.";
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
        message: "Disponibilité à confirmer : le calendrier n'est pas encore synchronisé."
      };
    }

    var busySet = buildBusySet(item);
    for (var day = startDay; day < endDay; day += 1) {
      if (busySet.has(day)) {
        return {
          status: "busy",
          message: "Déjà réservé pour au moins une nuit sélectionnée. Vous pouvez tout de même envoyer la demande, nous regarderons les alternatives possibles."
        };
      }
    }

    return {
      status: "free",
      message: "Disponible selon notre calendrier."
    };
  }

  function computeLodging(pricing, nights) {
    var lodging = 0;
    var detail = "";

    if (pricing.model === "nightly") {
      lodging = nights * pricing.nightlyRate;
      detail = nights + " nuit" + (nights > 1 ? "s" : "") + " x " + formatCurrency(pricing.nightlyRate);
    } else if (pricing.model === "villa_bundle") {
      if (nights < pricing.weekNights) {
        lodging = pricing.weekendPrice + Math.max(0, nights - pricing.weekendNights) * pricing.extraNightPrice;
        detail = "Forfait week-end " + formatCurrency(pricing.weekendPrice);
        if (nights > pricing.weekendNights) {
          detail += " + " + (nights - pricing.weekendNights) + " nuit" + (nights - pricing.weekendNights > 1 ? "s" : "") + " supp.";
        }
      } else {
        var weeks = Math.floor(nights / pricing.weekNights);
        var extraNights = nights % pricing.weekNights;
        lodging = weeks * pricing.weekPrice + extraNights * pricing.extraNightPrice;
        detail = weeks + " semaine" + (weeks > 1 ? "s" : "") + " x " + formatCurrency(pricing.weekPrice);
        if (extraNights) {
          detail += " + " + extraNights + " nuit" + (extraNights > 1 ? "s" : "") + " supp.";
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
        detail: "Aucune taxe estimée si aucun adulte assujetti n'est indiqué."
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
      detail: taxableGuests + " adulte" + (taxableGuests > 1 ? "s" : "") + " x " + nights + " nuit" + (nights > 1 ? "s" : "") + " x " + formatCurrency(perAdultNight)
    };
  }

  function validateReservation(rate, values, nights) {
    if (!values.start || !values.end) {
      return "Sélectionnez une date d'arrivée et une date de départ.";
    }
    if (!Number.isFinite(nights) || nights <= 0) {
      return "La date de départ doit être après la date d'arrivée.";
    }
    if (dateOnlyToDay(values.start) < todayDay()) {
      return "La date d'arrivée ne peut pas être dans le passé.";
    }
    if (!values.adults || values.adults < 1) {
      return values.hasChildrenField ? "Indiquez au moins un adulte." : "Indiquez au moins une personne.";
    }
    if (values.guests > rate.maxGuests) {
      return "La capacité maximale est de " + rate.maxGuests + " personne" + (rate.maxGuests > 1 ? "s" : "") + ".";
    }
    if (nights < rate.minNights) {
      return "Le séjour minimum est de " + rate.minNights + " nuits.";
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
        return "Dates hors période d'ouverture. " + formatSeasonsPhrase(rate.seasons, todayDay());
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
      '<dt>Hébergement</dt><dd>' + escapeHtml(formatCurrency(result.lodging.amount)) + " <span>" + escapeHtml(result.lodging.detail) + "</span></dd>",
      result.lodging.cleaningFee
        ? '<dt>Ménage</dt><dd>' + escapeHtml(formatCurrency(result.lodging.cleaningFee)) + "</dd>"
        : null,
      '<dt>Taxe de séjour</dt><dd>' + escapeHtml(formatCurrency(result.touristTax.amount)) + " <span>" + escapeHtml(result.touristTax.detail) + "</span></dd>",
      '<dt>Total estimatif</dt><dd><strong>' + escapeHtml(formatCurrency(result.total)) + "</strong></dd>",
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
        message: "Tarifs momentanément indisponibles. Vous pouvez nous contacter depuis la page contact."
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

  function buildReservationMessage(result) {
    var values = result.values;
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
      "Disponibilité : " + result.availability.message,
      "Hébergement estimé : " + formatCurrency(result.lodging.amount) + " (" + result.lodging.detail + ")",
      "Ménage : " + formatCurrency(result.lodging.cleaningFee),
      "Taxe de séjour estimée : " + formatCurrency(result.touristTax.amount) + " (" + result.touristTax.detail + ")",
      "Total estimatif : " + formatCurrency(result.total),
      "",
      "Contact",
      "Nom : " + values.name,
      "Email : " + values.email,
      "Téléphone : " + (values.phone || "Non renseigné")
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
      subject.value = "Demande de réservation - " + result.rate.label + " - " + formatDate(result.values.start);
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
          status.innerHTML = "Calendrier indisponible pour le moment. Envoyez-nous vos dates pour confirmation.";
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
