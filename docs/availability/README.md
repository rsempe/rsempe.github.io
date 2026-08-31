# Booking availability calendars

`scripts/generate-availability.js` builds the public availability file used by the static site:

```sh
node scripts/generate-availability.js
```

The script has no external dependency. It reads private Booking iCal sources from environment variables and writes only normalized busy ranges to `assets/data/availability.json`.

## GitHub Pages / CI secrets

Store the private calendar URLs as GitHub Actions secrets, never in the repository:

- `BOOKING_ICAL_VILLA_URL`
- `BOOKING_ICAL_CABANON_URL`
- `BOOKING_ICAL_ROSERAIE_URL`

The workflow in `.github/workflows/update-availability.yml` runs every 6 hours and can also be started manually from the GitHub Actions tab. It exposes those secrets as environment variables before running:

```sh
node scripts/generate-availability.js
```

If the generated JSON changed, the workflow commits only `assets/data/availability.json`.

Do not print these variables in logs, fixtures, examples, or tests.

## What Booking exports

The extranet's calendar export has an option — **"booked dates only"** or **"booked and closed
dates"**. It must be on the second one, otherwise dates closed by hand in the extranet never reach
the site. Change it under *Rates & Availability → Sync calendars → Export calendar*; the link
itself does not change.

Booking also exports the months it has not opened for sale as a single enormous closure (493 to 543
nights, ending well into the following year). That is not a booking, and the opening seasons in
`assets/data/reservation-rates.json` already say when direct requests are accepted, so the
generator drops any block longer than 60 nights:

```sh
node scripts/generate-availability.js --max-busy-nights 60   # default
```

Dropped blocks are reported on stderr and appear in the workflow log.

## Closures Booking does not export

`assets/data/manual-closures.json` is the fallback for anything missing from the feed:

```json
{ "closures": { "roseraie": [{ "start": "2026-09-02", "end": "2026-09-08", "note": "why" }] } }
```

Ranges are `[start, end)` — `end` is the first night that is free again. They are merged into the
generated file, deduplicated against the feed, and survive a failed calendar fetch. Empty each
entry once the Booking export carries it.

## Local usage without secrets

For offline tests, pass local `.ics` files instead of URLs:

```sh
node scripts/generate-availability.js \
  --villa-file /path/to/villa.ics \
  --cabanon-file /path/to/cabanon.ics \
  --roseraie-file /path/to/roseraie.ics
```

Equivalent environment variables are also supported:

- `BOOKING_ICAL_VILLA_FILE`
- `BOOKING_ICAL_CABANON_FILE`
- `BOOKING_ICAL_ROSERAIE_FILE`

Use `--out /path/to/availability.json` or `AVAILABILITY_OUTPUT` to write somewhere other than `assets/data/availability.json`.

## Public display

`assets/js/availability-calendar.js` renders the public busy ranges on the Villa and Studios pages of all six languages. It reads `assets/data/availability.json` in the browser and never reads the private iCal URLs.

Guest-facing strings live in a `STRINGS` table inside that file; month names, weekday initials, dates and amounts come from `Intl` using the page's `<html lang>`. The e-mail built for the hosts is always rebuilt in French, whatever the page language.

The widget uses these public keys:

- `villa`
- `cabanon`
- `roseraie`

After creating the GitHub Actions secrets, run the workflow manually once (`gh workflow run update-availability.yml`) and check that each calendar shows the expected busy dates. The workflow fails fast when a secret is missing: an early run without them published empty calendars over real availability.

## Direct booking requests

The same browser script also powers the direct booking request forms on the Villa and Studios pages of every language.

It loads public pricing rules from:

```text
assets/data/reservation-rates.json
```

The estimate includes:

- accommodation price
- cleaning fee when configured
- estimated tourist tax
- total estimate
- availability status based on the Booking calendar busy ranges

The site does not take payment and does not create a Booking reservation. The submitted NiceTouch message explicitly says that the amount and reservation must be confirmed manually.

If selected dates overlap a busy Booking range, the visitor still sees the estimate and can still send the request. The message clearly marks the stay as already reserved according to Booking so the hosts can reply with alternatives.

Tourist tax notes:

- Studios currently use the fixed public rate shown on the site: `0.70 EUR / adult / night`.
- Villa currently uses the 2026 CoVe proportional rule for unclassified furnished accommodation: `4.00%` plus the Vaucluse `10%` additional tax, capped at `2.30 EUR` plus additional tax per adult per night.
