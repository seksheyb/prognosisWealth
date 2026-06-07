# Prognosis Wealth — static site

A self-hostable static clone of **Prognosis Wealth**
(original preview: `https://prognosis-invest.preview.emergentagent.com/`).

The original is a Next.js app. This version is a **dependency-free static site**:
plain HTML + one CSS file + one JS file. It renders identically and hosts anywhere
(Netlify, Vercel, GitHub Pages, S3, Cloudflare Pages, nginx, or any static host).

## What's here

```
site/
├── index.html          # Home
├── about.html          # About
├── services.html       # Services
├── insights.html       # Market Insights
├── calculators.html    # SIP / Retirement / Wealth Goal / EMI calculators
├── contact.html        # Contact
└── assets/
    ├── styles.css      # Tailwind-compiled styles + small additions
    └── app.js          # All interactivity (no framework, no build step)
```

**`site/` is the deployable artifact** — upload its contents to any static host.

## Run locally

```bash
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

(any static file server works — e.g. `npx serve site`)

## Deploy

- **Netlify / Cloudflare Pages / Vercel:** set the publish/output directory to `site`, no build command.
- **GitHub Pages:** push `site/`'s contents to the `gh-pages` branch (or a `/docs` folder).
- **S3 / nginx / Apache:** copy `site/` to the web root.

## What `app.js` provides

- Sticky header that gains a frosted background on scroll
- Mobile navigation menu (hamburger)
- Scroll-reveal fade-ins (CSS-backed so content is always visible)
- The four **fully interactive calculators** with live results and SVG charts
  (formulas ported 1:1 from the original — SIP output matches to the rupee)
- Inline SVGs for the decorative dashboard charts (allocation donut + sparklines)
- Decoding of the Cloudflare-obfuscated email address

## Notes

- Images load from their original Unsplash/Pexels CDN URLs (no local copies needed).
  To fully self-contain the site, download those images and rewrite the `src`/`href`
  attributes to local paths.
- Fonts load from Google Fonts (Inter).
- Content is verbatim from the source site; update copy/contact details as needed.

## Rebuilding from source

The downloaded pages were transformed by `build.py` (strips the Next.js runtime,
localizes CSS, rewrites internal links, swaps in the vanilla calculator mount).
It is idempotent-unsafe (it edits in place), so re-run it only against freshly
downloaded pages.
