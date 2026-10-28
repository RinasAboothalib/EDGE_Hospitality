# EDGE Hospitality — Website

Multi-page marketing site for EDGE Hospitality Sri Lanka, rebuilt from the original single-page
GoHighLevel site at edgehospitalitygroups.com. Static HTML/CSS/JS, no runtime framework, no npm dependencies.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Build to `dist/` and serve at http://localhost:4173, rebuilding on changes in `src/` |
| `npm run build` | Build to `dist/` |
| `npm run preview` | Build once and serve `dist/` |
| `npm run check` | Build and verify every internal link, asset and `#anchor` resolves |
| `node scripts/qa.mjs <outDir>` | Headless Chrome/Edge pass (dev server must be running): 7 pages × 1440/1280/768/430/375 — console errors, failed requests, broken images, horizontal overflow, scroll reveals, reduced motion, full-page screenshots |
| `node scripts/nav-test.mjs` | Headless routing tests: status codes, header/logo/footer/mobile-menu clicks, Back/Forward, refresh, legacy URLs, keyboard focus, transition fallback |

Changes to `scripts/build.mjs` need a dev-server restart (the build module is loaded once).

## Structure

```
src/
  pages/        one file per route; a <!--meta {...} --> JSON block sets title, description, path, nav
  partials/     head, header, footer, scripts (Clarity + LeadConnector chat widget)
  assets/
    css/main.css   design tokens, components, page styles, motion, page transitions
    js/main.js     header state, mobile menu, scroll reveals, timeline, transition fallback
    img/           original logo, leadership portraits, OG image (+ WebP / favicon derivatives)
scripts/        build, dev server, link check, QA and navigation tests
docs/           AUDIT.md (audit + plan), REPORT.md (verification report)
```

## Routes

`/` · `/about/` · `/leadership/` · `/services/` · `/approach/` · `/training/` · `/contact/` · `/404.html`

Each route is emitted as `route/index.html`, so direct URLs and refreshes work on any static host.
`/home/` (the original site's canonical URL) redirects to `/`, and the old single-page anchors
(`/#services`, `/#contact`, …) redirect to the matching page.

## Deploying

Upload `dist/` to any static host (Netlify, Cloudflare Pages, Vercel, GitHub Pages, S3) and point
the domain at it. Configure the host to serve `404.html` for unknown paths (Netlify and Cloudflare
Pages do this automatically).
