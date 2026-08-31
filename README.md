# Gîtes Les Célestins

Static multilingual website (FR, EN, DE, NL, IT, ES) for [giteslescelestins.com](https://giteslescelestins.com) — a vacation rental property in Carpentras, Provence.

Hosted on GitHub Pages. No build step, no framework, no dependencies.

## Structure

```
├── fr/                  # French pages
│   ├── index.html           # Accueil
│   ├── villa/index.html     # La Villa
│   ├── chambres-hotes/      # Les Chambres d'Hôtes
│   ├── decouvrir/           # Découvrir la région
│   └── contact/             # Contact (NiceTouch form)
├── en/ de/ nl/ it/ es/  # Same structure, one folder per language
├── assets/
│   ├── css/             # Bootstrap, theme, fontello, custom
│   ├── js/              # jQuery, Vegas, availability calendar, utilities
│   ├── data/            # Availability, rates, manual closures
│   └── images/          # All site images
├── scripts/             # Availability generator, review-card updater
├── docs/availability/   # How the Booking sync works
├── index.html           # Root redirect (language detection)
├── 404.html             # Error page
├── sitemap.xml          # With hreflang alternates
├── robots.txt
└── CNAME                # Custom domain
```

## Local development

Serve the site locally with any static file server:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000

## Deployment

Push to `main` — GitHub Pages deploys automatically.

DNS: CNAME record pointing to `rsempe.github.io` (or A records to GitHub Pages IPs).

Booking availability is synced by a scheduled workflow — see `docs/availability/README.md`.
Conventions and business rules are in `CLAUDE.md`.
