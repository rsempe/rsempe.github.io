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
