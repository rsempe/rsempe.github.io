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

`assets/js/availability-calendar.js` renders the public busy ranges on the French Villa and Studios pages. It reads `assets/data/availability.json` in the browser and never reads the private iCal URLs.

The widget uses these public keys:

- `villa`
- `cabanon`
- `roseraie`

After creating the GitHub Actions secrets, run the workflow manually once and verify that each widget shows a green "Mis à jour depuis Booking" status.

## Direct booking requests

The same browser script also powers the direct booking request forms on the French Villa and Studios pages.

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

Tourist tax notes:

- Studios currently use the fixed public rate shown on the site: `0.70 EUR / adult / night`.
- Villa currently uses the 2026 CoVe proportional rule for unclassified furnished accommodation: `4.00%` plus the Vaucluse `10%` additional tax, capped at `2.30 EUR` plus additional tax per adult per night.
