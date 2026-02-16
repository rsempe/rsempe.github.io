# Gîtes Les Célestins

Static bilingual (FR/EN) website for [giteslescelestins.com](https://giteslescelestins.com) — a vacation rental property in Carpentras, Provence.

Hosted on GitHub Pages. No build step, no framework, no dependencies.

## Structure

```
├── fr/                  # French pages
│   ├── index.html           # Accueil
│   ├── villa/index.html     # La Villa
│   ├── chambres-hotes/      # Les Chambres d'Hôtes
│   └── contact/             # Contact (Nicetouch form)
├── en/                  # English pages (same structure)
├── assets/
│   ├── css/             # Bootstrap, theme, fontello, custom
│   ├── js/              # jQuery, Vegas, utilities
│   └── images/          # All site images
├── index.html           # Root redirect (language detection)
├── 404.html             # Bilingual error page
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
