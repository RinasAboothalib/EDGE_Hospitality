# EDGE Hospitality — Website Audit & Implementation Plan

Audit date: 2026-10-27 · Source: https://edgehospitalitygroups.com/

## 1. Access & scope

- **Local project folder was empty** — no source code, assets or build config existed. The live site was audited directly and its assets extracted from the served HTML.
- The live site is built on **GoHighLevel / LeadConnector** (hosted funnel builder). There is no exportable source; the page is a single custom-HTML block inside the builder.
- **Only one real page exists.** `/` and `/home` return the page (200). Every other path probed (`/about`, `/services`, `/contact`, `/training`, `/leadership`, `/level-up`, `/blog`, `/privacy-policy`, `/terms`) returns **301 → /home**. `sitemap.xml` is empty; `robots.txt` is empty.

## 2. Brand identity

| Element | Finding |
|---|---|
| Logo | `EDGE / HOSPITALITY` wordmark, gold + brushed-silver letters on black. PNG 1344×385, embedded as base64 (not transparent — black background). |
| Social/OG image | 1536×1024 PNG: logo on grey with "A Subsidiary of plac.global". Also used as favicon (2.2 MB — far too large for a favicon). |
| Header wordmark | Text: **EDGE** (gold) + HOSPITALITY (white, tracked). |
| Colours | Background `#080808`, surfaces `#161616` / `#2A2A2A`, gold `#D8A53D`, light gold `#F2D27D`, text `#FFFFFF`, muted `#C7C7C7` / `#BFC1C4`. Radial gold glows (`rgba(216,165,61,.10)`). |
| Typography | **Montserrat** throughout. H2 ≈ 35px / 800, H3 ≈ 18px / 700. |
| Tagline | "We Think Like The Owners" · "EFFICIENCY • DISCIPLINE • GROWTH MINDSET • EXECUTION" |

## 3. Images & media

| Asset | Use | New location |
|---|---|---|
| Logo PNG | Hero + Level-Up block | `src/assets/img/edge-logo.png` |
| Thilanka Muthukumarana portrait (560×560 JPG) | Leadership | `src/assets/img/thilanka-muthukumarana.jpg` |
| Rohan Fernandopulle portrait (560×560 JPG) | Leadership | `src/assets/img/rohan-fernandopulle.jpg` |
| OG image (1536×1024 PNG) | Social share + favicon | `src/assets/img/og-image.png` (+ derived 64/180px favicons) |

No photography, video or background images exist on the original — visuals are typographic with gradient glows.

## 4. Page structure (single page, in order)

1. **Hero** (`#top`) — logo, "We Think Like The Owners", "Sri Lanka's Premium Hospitality Management Company", pillars strip, *Get In Touch*.
2. **Vision & Mission** (`#vision`)
3. **The Four Pillars of EDGE** (`#pillars`) — table: Pillar / What it means / How we streamline it / Result for you.
4. **The People Behind EDGE** (`#leadership`) — Thilanka Muthukumarana (Co-Founder & CEO), Rohan Fernandopulle (Group Managing Director).
5. **Services Built Around Your P&L** (`#services`) — 12 services in two groups.
6. **No Cookie-Cutter Solutions** (`#approach`) — 01 Listen / 02 Research, AI-assisted / 03 Recommend & Implement.
7. **EDGE Hospitality Level-Up Training** (`#training`) — 3 feature cards.
8. **Ready to Build Your Edge?** (`#contact`) — email, website, address (33 Park Street, Parkland Level 17, Colombo 02), leaders' names.

## 5. Navigation & routing

| Link | Destination |
|---|---|
| EDGE HOSPITALITY (logo) | `#top` |
| Vision · Pillars · Leadership · Services · Approach · Training | in-page anchors |
| Get In Touch (header + hero) | `#contact` |
| hello@edgehospitalitygroups.com | `mailto:` (Cloudflare-obfuscated) |
| www.edgehospitalitygroups.com | external, self-link |

Mobile: links collapse into a hamburger menu.

## 6. Existing functionality

- Anchor-scroll navigation, mobile hamburger menu.
- Hero intro animation (logo fade-in), IntersectionObserver reveal-on-scroll, `prefers-reduced-motion` handling.
- **LeadConnector chat widget** ("Hello, Edge AI is here to help!") — widget id `6a9112e623454f63fe7b563a`.
- **Microsoft Clarity** analytics — project `yx0jnm21pk`.
- No forms.

## 7. Problems & opportunities

- Single long page — no shareable URLs per topic; weak SEO (empty sitemap, every path redirects to `/home`).
- 1.25 MB HTML: images inlined as base64 (no caching, no lazy loading); the builder ships ~40 unused animation keyframe sets.
- Favicon is a 2.2 MB PNG.
- Logo PNG has a solid black background, limiting placement.
- Four Pillars presented as a dense 4-column table that is hard to read on mobile.
- Hero is mostly empty black on load until the intro finishes (seen at 375px).
- Duplicate/conflicting `og:title` / `og:type` meta tags; trailing spaces in titles.

## 8. Implementation plan

### Pages & URLs (genuine multi-page)

| Page | URL | Content (all original copy) |
|---|---|---|
| Home | `/` | Hero, pillars strip, condensed intro to every section with links to its page, CTA |
| About | `/about/` | Vision & Mission + Four Pillars |
| Leadership | `/leadership/` | Both leaders, full bios |
| Services | `/services/` | All 12 services, two groups |
| Approach | `/approach/` | 3-step method + closing line |
| Training | `/training/` | Level-Up programme |
| Contact | `/contact/` | Email, website, address, leaders |
| Legacy | `/home/` | Redirects to `/` (the old canonical URL keeps working) |

Old anchor links (`/#vision`, `/#pillars`, `/#leadership`, `/#services`, `/#approach`, `/#training`, `/#contact`) are redirected client-side to the matching new page/section.

**Nav:** Logo → `/` · About · Leadership · Services · Approach · Training · **Get In Touch** (`/contact/`). Footer repeats all links plus email, address and pillars line.

### Visual direction

Keep the black + gold + Montserrat identity; push it to a quieter luxury register: generous spacing, fine gold hairlines, large display type, gold-glow surfaces, numbered editorial sections.

- **Home** — full-viewport hero: logo reveals from a gold light sweep, headline words rise in sequence, pillar marquee, then section "doors" to each page.
- **About** — split Vision / Mission panels; pillars as four stacked cards (meaning → method → result) replacing the table.
- **Leadership** — large portrait cards with gold-frame image reveal (clip-path wipe), credentials highlighted.
- **Services** — two grouped grids with numbered cards and hover lift + gold edge.
- **Approach** — vertical timeline 01–03 with a progress line that draws on scroll.
- **Training** — logo + "Level-Up" lockup, three feature columns.
- **Contact** — large CTA, contact cards, map link, chat widget prompt.

### Motion

- Home intro (≤1.6 s, skippable by scrolling, never blocks content).
- Scroll reveals via IntersectionObserver (fade/rise, staggered), portrait clip-path reveals, timeline line drawing.
- Hover: buttons sweep, cards lift, nav underline.
- **Page transitions:** cross-document View Transitions API (`@view-transition`) — header persists, content cross-fades/slides. Fallback for browsers without it: a gold-edged curtain overlay on link click. Real page loads, so direct URLs, refresh and Back/Forward work natively.
- Everything disabled or reduced under `prefers-reduced-motion`; content is visible without JS.

### Technical approach

- Static multi-page site, no runtime framework. A dependency-free Node build (`build.mjs`) assembles pages from shared header/footer partials into `dist/`, each route as `route/index.html` so it works on any static host.
- `npm run dev` / `npm run build` / `npm run preview`.
- Assets as real files (cacheable, lazy-loaded, sized), favicons derived from the original OG image.
- Chat widget and Clarity snippets carried over unchanged.

### Risks

- View Transitions for cross-document navigation are Chromium/Safari 18.2+ only — fallback curtain covers Firefox.
- LeadConnector widget and Clarity load third-party scripts; they're deferred so they don't block render.
- Deploying requires a static host (the GoHighLevel builder can't host this source as-is; it could be pasted back as custom HTML per page, or hosted on Netlify/Vercel/Cloudflare Pages with the domain pointed at it).
