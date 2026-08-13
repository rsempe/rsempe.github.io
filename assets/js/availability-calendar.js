(function () {
  "use strict";

  var MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  var WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
  var DAY_MS = 24 * 60 * 60 * 1000;

  function toIsoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function dateOnlyToDay(value) {
    var parts = value.slice(0, 10).split("-").map(Number);
    return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / DAY_MS);
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

  function formatRange(range) {
    var start = new Date(range.start.slice(0, 10) + "T00:00:00Z");
    var endDay = range.allDay ? dateOnlyToDay(range.end) - 1 : timedToExclusiveDay(range.end) - 1;
    var end = new Date(endDay * DAY_MS);
    var formatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

    if (toIsoDate(start) === toIsoDate(end)) {
      return formatter.format(start);
    }
    return formatter.format(start) + " - " + formatter.format(end);
  }

  function renderMonth(year, month, busySet, todayDay) {
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

      if (currentDay < todayDay) {
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
    var today = new Date();
    var todayDay = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / DAY_MS);
    var busySet = buildBusySet(item);
    var html = "";

    for (var offset = 0; offset < months; offset += 1) {
      var monthDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() + offset, 1));
      html += renderMonth(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), busySet, todayDay);
    }

    calendars.innerHTML = html;
  }

  function renderUpcoming(widget, item) {
    var target = widget.querySelector("[data-availability-upcoming]");
    if (!target) {
      return;
    }

    var heading = target.querySelector("strong");
    var headingHtml = "<strong>" + (heading ? heading.textContent : "Prochaines périodes indisponibles") + "</strong>";
    var todayDay = dateOnlyToDay(toIsoDate(new Date()));
    var ranges = (item.busy || [])
      .filter(function (range) {
        var endDay = range.allDay ? dateOnlyToDay(range.end) : timedToExclusiveDay(range.end);
        return endDay >= todayDay;
      })
      .slice(0, 4);

    if (!ranges.length) {
      target.innerHTML = headingHtml + ' <span class="availability-empty">Aucune période indisponible à venir dans le calendrier public.</span>';
      return;
    }

    target.innerHTML = headingHtml + " " + ranges.map(function (range) {
      return "<span>" + formatRange(range) + "</span>";
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

  function renderWidget(widget, data) {
    var key = widget.getAttribute("data-availability-widget");
    var item = data.accommodations && data.accommodations[key];

    if (!item) {
      return;
    }

    var canRenderCalendar = renderStatus(widget, item, data.generatedAt);
    if (!canRenderCalendar) {
      return;
    }

    renderCalendars(widget, item);
    renderUpcoming(widget, item);
  }

  function init() {
    var widgets = Array.prototype.slice.call(document.querySelectorAll("[data-availability-widget]"));
    if (!widgets.length || !window.fetch) {
      return;
    }

    fetch("/assets/data/availability.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Availability data unavailable");
        }
        return response.json();
      })
      .then(function (data) {
        widgets.forEach(function (widget) {
          renderWidget(widget, data);
        });
      })
      .catch(function () {
        widgets.forEach(function (widget) {
          var status = widget.querySelector("[data-availability-status]");
          if (status) {
            status.innerHTML = "Calendrier indisponible pour le moment. Envoyez-nous vos dates pour confirmation.";
            status.className = "availability-status is-warning";
          }
        });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
