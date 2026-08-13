(function () {
  "use strict";

  var AVAILABILITY_URL = "/assets/data/availability.json";
  var RATES_URL = "/assets/data/reservation-rates.json";
  var MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  var WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
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

  function formatRange(range) {
    var start = new Date(range.start.slice(0, 10) + "T00:00:00Z");
    var endDay = range.allDay ? dateOnlyToDay(range.end) - 1 : timedToExclusiveDay(range.end) - 1;
    var end = new Date(endDay * DAY_MS);
    var formatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

    if (dayToIso(Math.floor(start.getTime() / DAY_MS)) === dayToIso(Math.floor(end.getTime() / DAY_MS))) {
      return formatter.format(start);
    }
    return formatter.format(start) + " - " + formatter.format(end);
  }

  function nightsBetween(start, end) {
    return dateOnlyToDay(end) - dateOnlyToDay(start);
  }

  function renderMonth(year, month, busySet, currentTodayDay) {
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
      } else if (busySet.has(currentDay)) {
        classes.push("is-busy");
        label += " indisponible";
      } else {
        classes.push("is-free");
        label += " disponible";
      }

      html += '<span class="' + classes.join(" ") + '" aria-label="' + label + '">' + date + "</span>";
    }

    html += "</div></div>";
    return html;
  }

  function renderCalendars(widget, item) {
    var months = Number(widget.getAttribute("data-availability-months") || 4);
    var calendars = widget.querySelector("[data-availability-calendars]");
    var currentTodayDay = todayDay();
    var busySet = buildBusySet(item);
    var today = new Date();
    var html = "";

    for (var offset = 0; offset < months; offset += 1) {
      var monthDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() + offset, 1));
      html += renderMonth(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), busySet, currentTodayDay);
    }

    calendars.innerHTML = html;
  }

  function renderUpcoming(widget, item) {
    var target = widget.querySelector("[data-availability-upcoming]");
    if (!target) {
      return;
    }

    var heading = target.querySelector("strong");
    var headingHtml = "<strong>" + escapeHtml(heading ? heading.textContent : "Prochaines périodes indisponibles") + "</strong>";
    var currentTodayDay = todayDay();
    var ranges = (item.busy || [])
      .filter(function (range) {
        var endDay = range.allDay ? dateOnlyToDay(range.end) : timedToExclusiveDay(range.end);
        return endDay >= currentTodayDay;
      })
      .slice(0, 4);

    if (!ranges.length) {
      target.innerHTML = headingHtml + ' <span class="availability-empty">Aucune période indisponible à venir dans le calendrier public.</span>';
      return;
    }

    target.innerHTML = headingHtml + " " + ranges.map(function (range) {
      return "<span>" + escapeHtml(formatRange(range)) + "</span>";
    }).join("");
  }

  function renderStatus(widget, item, generatedAt) {
    var status = widget.querySelector("[data-availability-status]");
    var updatedAt = item.updatedAt || generatedAt;

    if (item.error) {
      status.innerHTML = "Mise à jour momentanément indisponible. Envoyez-nous vos dates pour confirmation.";
      status.className = "availability-status is-warning";
      return false;
    }

    if (!item.sourceConfigured) {
      status.innerHTML = "Synchronisation Booking en cours de configuration. Envoyez-nous vos dates pour confirmation.";
      status.className = "availability-status is-warning";
      return false;
    }

    if (updatedAt) {
      var date = new Date(updatedAt);
      status.innerHTML = "Mis à jour depuis Booking le " + date.toLocaleDateString("fr-FR") + ".";
      status.className = "availability-status is-ready";
    }

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
    renderUpcoming(widget, item);
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
        message: "Disponibilité à confirmer : le calendrier Booking n'est pas encore synchronisé."
      };
    }

    var busySet = buildBusySet(item);
    for (var day = startDay; day < endDay; day += 1) {
      if (busySet.has(day)) {
        return {
          status: "busy",
          message: "Indisponible selon le calendrier Booking pour au moins une nuit sélectionnée."
        };
      }
    }

    return {
      status: "free",
      message: "Disponible selon le calendrier Booking synchronisé."
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
      return "Indiquez au moins un adulte.";
    }
    if (values.guests > rate.maxGuests) {
      return "La capacité maximale est de " + rate.maxGuests + " personne" + (rate.maxGuests > 1 ? "s" : "") + ".";
    }
    if (nights < rate.minNights) {
      return "Le séjour minimum est de " + rate.minNights + " nuits.";
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
      '<strong>' + escapeHtml(result.availability.message) + "</strong>",
      '<dl>',
      '<dt>Hébergement</dt><dd>' + escapeHtml(formatCurrency(result.lodging.amount)) + " <span>" + escapeHtml(result.lodging.detail) + "</span></dd>",
      '<dt>Ménage</dt><dd>' + escapeHtml(formatCurrency(result.lodging.cleaningFee)) + "</dd>",
      '<dt>Taxe de séjour estimée</dt><dd>' + escapeHtml(formatCurrency(result.touristTax.amount)) + " <span>" + escapeHtml(result.touristTax.detail) + "</span></dd>",
      '<dt>Total estimatif</dt><dd><strong>' + escapeHtml(formatCurrency(result.total)) + "</strong></dd>",
      '</dl>',
      '<p>Prix estimatif, hors options éventuelles, à confirmer lors de notre réponse.</p>'
    ].join("");
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
      canSubmit: availability.status !== "busy",
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
      "Adultes : " + values.adults,
      "Enfants mineurs : " + values.children,
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
    return lines.join("\n");
  }

  function updateSubmitState(form, result) {
    var submit = form.querySelector('[type="submit"]');
    var hashcash = getField(form, "hashcash");
    var hashcashReady = !hashcash || Boolean(hashcash.value);

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
