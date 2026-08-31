# Gîtes Les Célestins — working notes

Static site for giteslescelestins.com (Carpentras, Provence): one villa for 6, two studios
run as chambres d'hôtes (**Le Cabanon**, pool view, 130 €/night; **La Roseraie**, garden view,
120 €/night). GitHub Pages, no build step, no framework. Push to `main` deploys.

## Golden rules

- **Six languages, always all six**: `fr en de nl it es`. Any content change must land in the six
  copies of the page, plus `hreflang` (7 entries incl. `x-default`) and `sitemap.xml`.
- **`git pull --rebase -q origin main` before every push** — the availability bot commits to `main`.
- Commit messages: short, imperative, English, no `Co-Authored-By` (disabled globally).
- Never commit `.env` (the three private Booking iCal URLs) and never print those URLs.
- **No booking engine and no payment.** The site takes *requests* (NiceTouch forms) and the hosts
  confirm by hand. This is a deliberate decision, not a missing feature.

## Layout

30 content pages: `{fr,en,de,nl,it,es}/{index,villa/,chambres-hotes/,contact/,decouvrir/}`.
`villa/`, `chambres-hotes/`, `contacts/new/` at the root are `noindex` redirect stubs for legacy URLs.

## Booking flow

Booking iCal → GitHub Actions (`update-availability.yml`, cron `17 */6 * * *` + manual) →
`assets/data/availability.json` → `assets/js/availability-calendar.js` renders, on all six
languages, a season accordion (2 months per page), click-to-select dates, a live estimate
(lodging + cleaning + tourist tax) and pre-fills the request form.

| File | Role |
|---|---|
| `assets/data/availability.json` | **generated** — never hand-edit |
| `assets/data/manual-closures.json` | hand-written closures Booking does not export |
| `assets/data/reservation-rates.json` | prices, opening seasons, min nights, restrictions, tax |

See `docs/availability/README.md` for the full pipeline.

## Business rules in force (in `reservation-rates.json`)

- Villa: 2 nights min; **26 June → 29 August 2027 = full weeks only, arrival Saturday or Sunday**;
  season 2026 ends 30 August (Booking closes it then), season 2027 = 16 April → 17 October.
- Studios: 2 nights min, **4 nights min in July and August**; seasons 2026 → 18 October,
  2027 = 30 April → 3 October.
- A season's `end` is the **last departure**: a night is open when `start <= night < end`.

## Booking gotchas (learned the hard way)

- The extranet's calendar export must be set to **"booked and closed dates"**, not "booked dates
  only" — otherwise closures set by hand never reach the site. Verified on all three units.
- Booking exports the months it has not opened for sale as one huge closure (493–543 nights).
  `generate-availability.js` drops any block over 60 nights (`--max-busy-nights`) so next season
  does not black out. Dropped blocks are logged in CI.
- The workflow fails fast if a secret is missing — an earlier run published empty calendars over
  real availability.

## Translations

`availability-calendar.js` holds a `STRINGS` table for the six languages; month names, weekday
initials, dates and currency come from `Intl` using the page's `<html lang>`.
**The e-mail sent to the hosts is always rebuilt in French** (subject, body, amounts, and a
"Langue du visiteur" line) whatever the visitor's language — it lands in a French inbox.

## Scripts

```bash
node scripts/generate-availability.js --help          # Booking iCal → availability.json
node scripts/update-review-awards.js --year 2026 --villa 9.3 --studios 9.6   # home page review cards
gh workflow run update-availability.yml               # force a sync
```

A scheduled task (`~/.claude/scheduled-tasks/refresh-booking-review-awards`) refreshes the review
cards three times a year (1 Jan / 1 May / 1 Sep).

## Verifying a change

The Browser pane reports a zero-width viewport here, so screenshots and layout measurements
through it are useless. What works:

```bash
python3 -m http.server 8777            # via preview_start, never Bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --hide-scrollbars --window-size=1280,1100 --screenshot=out.png --virtual-time-budget=6000 URL
```

For a section deep in a page, extract it into a temporary standalone page (site CSS + the section
only) and shoot that; for phone widths, load it in a 390px-wide `<iframe>` (headless Chrome ignores
the viewport meta). DOM assertions via `javascript_tool` are reliable and are the best way to test
the calendar (click cells, read `is-busy` / `is-too-soon`, submit the form and read the message).

After pushing: `gh run list --limit 1`, then `curl` the live URL — the CDN sometimes serves a stale
copy, so add a cache-busting query string.
