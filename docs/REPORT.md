# EDGE Hospitality — Final Verification Report

Date: 2026-10-27 · Audit & plan: [AUDIT.md](AUDIT.md)

## Pages audited and redesigned

The original site has **one page** (`/`, also served at `/home`; every other path 301s to `/home`). All its sections were split into a genuine multi-page site:

| New page | Built from original section(s) |
|---|---|
| `/` Home | Hero + condensed versions of every section, each linking to its page |
| `/about/` | Vision & Mission, The Four Pillars of EDGE |
| `/leadership/` | The People Behind EDGE |
| `/services/` | Services Built Around Your P&L (all 12) |
| `/approach/` | No Cookie-Cutter Solutions |
| `/training/` | EDGE Hospitality Level-Up Training |
| `/contact/` | Ready to Build Your Edge? |
| `/404.html` | New |

All original copy, names, titles, bios, email, website and address are preserved verbatim. The leadership "highlight" chips only restate facts from the original bios.

## Original assets & brand elements preserved

- Logo (PNG, extracted from the original page) — hero, Level-Up lockup, training band; WebP copy added for performance.
- Both leadership portraits (JPG originals + WebP copies).
- OG/social image (original kept; a 1200×800 JPG derivative is used for `og:image`).
- Favicon and Apple touch icon derived from the original logo (replacing the 2.2 MB PNG favicon).
- Colours `#080808`, `#D8A53D`, `#F2D27D`, `#C7C7C7`, `#BFC1C4`; Montserrat; "EDGE / HOSPITALITY" text wordmark; pillars tagline.
- Microsoft Clarity (`yx0jnm21pk`) and the LeadConnector "Edge AI" chat widget (`6a9112e623454f63fe7b563a`) — both load on every page (widget confirmed rendering in the browser).

## Animations & transitions implemented

**Latest revisions (9):**
- Home hero background: a slow "fly-through" zoom. Thin gold rounded frames (16:9 on desktop, 4:5 on phones) grow from the centre and fade every ~3 s over a faint dot field that keeps zooming in (two crossfading layers make it endless). A soft dark centre keeps the logo and headline crisp. CSS only, transform/opacity (no JS, no scroll cost); reduced motion shows a still, faint version.

**Latest revisions (8):**
- The intro loading screen (logo, counter, progress bar) is removed entirely: markup, head-script logic, main.js counter and its CSS. Every visit, refresh and back/forward opens straight on the page, with the hero and header animations starting immediately. The page-change curtain between pages is kept. nav-test updated to assert no loader on fresh visits and refreshes (56/56).

**Latest revisions (7):**
- The "EDGE / Hospitality" text in the intro loader and the page-transition curtain is replaced by the logo image (the same trimmed file as the header, so it is already cached). The loader keeps the tagline, bar and counter; the curtain keeps its progress bar.
- The chat greeting bubble ("Hello, Edge AI is here to help!") is themed dark with a gold border, matching pointer and a grey close × that turns gold on hover.

**Latest revisions (6):**
- Chat window themed to match the site: near-black panel with a thin gold border and 18 px corners, gold-tinted header with a gold-ringed avatar and gold close chevron, dark incoming bubbles, gold-gradient visitor bubbles, Montserrat throughout, a dark input with a gold focus ring, and a gold send button (dimmed while empty). The widget is built from nested shadow roots, so a sheet is injected into each layer and a MutationObserver re-applies it to new messages. Verified by screenshot on desktop and phone with a draft typed but not sent; the visitor-bubble style has not been seen live because sending would create a real conversation.

**Latest revisions (5):**
- Cursor tail (desktop mouse only): a tapered gold ribbon with a soft glow follows the pointer, stretching on fast moves and gathering back into a small glowing dot when the pointer stops. Over links, buttons and pillar cards the head opens into a gold ring so text stays readable. The native cursor stays visible, the effect never intercepts clicks, the animation sleeps when idle, and it is off for touch and reduced motion.
- Chat bot launcher anchored 18 px from the bottom-right corner (it had been shifted up/left by a positioning bug).
- Pillar card back headings enlarged (~31 px desktop / 25 px phone); cards 320 px tall.

**Latest revisions (4):**
- The text wordmark ("EDGE HOSPITALITY") in the header and footer is replaced by the logo image. A tightly trimmed transparent version (`edge-logo-tight.png`/`.webp`, 887×326) keeps it flush with the page edge: 38 px tall in the header, 32 px in the scrolled capsule, 34 px on phones, 62 px in the footer. It still links home.

**Latest revisions (3):**
- Removed the pillars tagline line from the home hero and the footer, and the leaders' names line from the footer.
- Logo replaced with the owner's uploaded version (saved as `edge-logo-upload.png`). It is the same artwork with tighter framing, so `edge-logo.png`/`.webp` were rebuilt with that exact framing from the high-resolution original (1101×431, about 2.4× the upload's resolution) and made transparent; the hero logo, leadership badge, Level-Up lockup and training band all use it.

**Latest revisions (2):**
- Hero buttons ("Get In Touch" / "Explore Services") removed, and the header "Get In Touch" pill replaced by a regular "Contact" nav link (desktop nav and mobile menu), so Contact stays one click away.
- Pillar flip-card letters E · D · G · E are now filled with a slowly shifting gold gradient.
- Home leadership: Thilanka on the left, Rohan on the right, the EDGE logo in a ringed badge between them, joined by gold lines that draw in and carry a light pulse toward the badge. On phones the badge sits above with a bracket branching to both portraits.

**Latest revisions:**
- Roadmap redesigned as a winding gold road: descriptions removed (step number + title only); scrolling draws the road, a glowing orb rides its tip, and each milestone pin ignites with a burst and heartbeat when reached, its label sliding in. Horizontal on desktop, vertical switchback on phones.
- Chat launcher: the LeadConnector widget's own button is restyled from inside its shadow root (dark shell, gold border, pulse ring) with an animated EDGE AI bot (`/assets/img/ai-bot.svg`: blinking eyes, glowing antenna, voice bars, gentle bob). Clicking it still opens the chat (verified).
- Hero side lines and the light beam removed; all gold/orange background glows removed (hero, page heroes, sections, CTA bands, menu, transition curtain, Level-Up lockup, Vision panel, flip cards). Gold remains on text, borders, buttons and accents.

**Home page structure & scroll design:**
- The moving pillars marquee is removed. In its place is a roadmap section, "No Cookie-Cutter Solutions", with four steps (We Listen → We Research → We Recommend → We Implement) on a line that fills as you scroll, each node lighting up when reached. It runs horizontally on desktop and vertically on phones. It replaces the home page's separate three-card approach section, which repeated the same content.
- Four Pillars: flip cards that show only the letters E · D · G · E; hovering (or keyboard focus) turns a card to show its pillar, result line and a "Learn more" link. On touch screens the first tap flips, the second opens the About page.
- Every section after the first has curved top corners and overlaps the one before it; while it rises, the section underneath eases back (scales to 94%) and dims. The footer joins the stack.

**Hero content transitions:**
- Home: logo unveils from the centre outward (clip + blur), title lines tilt up out of their clip while sharpening, subtitle sharpens in from a blur, pillars line reveals word by word, buttons pop in one after another with a single shine on the primary, side rails draw down, scroll cue last. Desktop pointer adds layered depth (logo, title and light beam drift at different rates).
- Inner pages: eyebrow rule draws and the label slides in, title lines tilt up, lead sharpens from a blur, buttons pop, the large page numeral wipes upward.
- All held until the intro loader/curtain has gone; none under reduced motion.

**Modern interaction layer:**
- Header condenses into a floating glass capsule once scrolled, hides while scrolling down and returns on scroll up (always shown on keyboard focus); gold reading-progress hairline across the top.
- Cards: cursor-following border light and inner spotlight. Buttons and the "next page" arrow are magnetic (pull up to 10px toward the pointer). Desktop pointers only.
- Subtle static film grain across the site.
- Parallax on page-hero numerals, leadership portraits and the Level-Up lockup; the home hero drifts down and fades as it scrolls away.
- Pillars marquee is driven by scroll velocity (speeds up and leans with fast scrolling).
- About: the four pillars become sticky stacking cards on large screens (≥1025×720); covered cards shrink and dim.
- Page transition is now a five-column staggered wipe with the EDGE wordmark.

**Lumora motion system (applied without changing layout, content or styling):**
- Intro loader on fresh visits/reloads: dark panel with rounded bottom corners, EDGE wordmark + tagline, 1px gold progress bar, `000 → 100` counter (1300 ms, easeInOutCubic), then slides up (0.7 s) while its content fades up 12 px. Scroll is locked and every intro animation is held until it leaves. Skipped for in-site navigations (the curtain covers those), Back/Forward, and reduced motion; a 6 s failsafe removes it if scripts fail.
- Lenis smooth scrolling (`lenis@1.3.23` via importmap), stopped while the loader, mobile menu or transition curtain is active.
- Line-by-line heading reveals (lines slide up out of a clip, 900 ms easeOutCubic; hero titles 250 ms delay with 120 ms line stagger; section headings 120 ms) and a word-by-word reveal on the home vision statement (24 px rise, 35 ms stagger, 700 ms easeOutQuart). Original markup is restored after each reveal.
- Lumora entrance order on heroes (logo 300 ms, eyebrow 200, title 250, subtitle 650, pillars 700, buttons 750, scroll cue 900); header fades down 14 px at 150 ms.
- Spring-style hovers (desktop pointers only): buttons scale 1.04 with arrow nudge, wordmark 1.04, menu button 1.05, nav links lift 2 px, cards lift 8 px + scale 1.012, footer links slide 4 px.
- Scroll reveals retimed to Lumora distances and curve (cards 48 px, rows 24 px, panels 40 px + scale .99; 90 ms stagger); mobile menu items stagger at index×45 ms + 80 ms.
- (The liquid cursor trail on the home hero was removed at the owner's request.)
- Logo: the original black-backed PNG is kept as `edge-logo-original.png`; `edge-logo.png`/`.webp` are now transparent (black keyed out by colour-to-alpha), so the logo sits directly on the gold glow. The hero light sweep is masked to the letters.

- Home intro: logo blur-in with a light sweep, light beam, staggered headline words, then subtitle/pillars/buttons (≈1.6 s, content never blocked).
- Inner page heroes: staggered rise, outlined page index numeral, gold rule drawing in.
- Scroll reveals (fade/rise/scale, staggered grids), clip-path portrait reveals, Approach timeline line that draws with scroll progress, pillars marquee.
- Hover: button shine sweep, card lift + gold edge, nav underline, service list slide, pager arrow rotation.
- Page transitions (all browsers): on an internal link click a dark curtain with gold edges and the EDGE wordmark rises over the page (0.6 s), the browser navigates normally, and the new page starts covered and the curtain lifts away while the content rises in. mailto/external/same-page links and reduced-motion users skip it; a back/forward-cache restore clears it.
- Favicons: `favicon.ico` (16/32/48), 16/32 px PNGs, 180 px Apple touch icon, 192/512 px app icons and `site.webmanifest`, all cut from the original logo.
- `prefers-reduced-motion`: all motion removed, everything visible immediately.

## Tests performed (headless Chrome via DevTools Protocol, against the running dev server)

**Visual/technical QA — 35 runs (7 pages × 1440, 1280, 768, 430, 375 px): 0 issues**
- No console errors or failed requests, no broken images, no horizontal overflow, exactly one `<h1>` per page.
- After scrolling each page, every reveal element is visible (none left hidden).
- Full-page screenshots reviewed for every page at every width.

**Navigation & routing — 49/49 checks pass** (`scripts/nav-test.mjs`)
- All 7 routes return 200 by direct URL; `/about` → 301 `/about/`; unknown URLs → 404 page.
- Real mouse clicks on every header link, the Get In Touch button, logo, every footer link, the "next page" pager and a deep link (`/about/#pillar-growth`, scrolls to the anchor). Active nav item set correctly.
- Back, Back, Forward and Refresh — correct page, fully visible, no blank screen or stuck curtain.
- Legacy URLs: `/#vision`, `/#pillars`, `/#leadership`, `/#services`, `/#approach`, `/#training`, `/#contact`, `/home`, `/home/#services` all land on the right page.
- Mobile menu (375 px): opens with `aria-expanded`, scroll lock and focus on first link; Escape closes and returns focus; menu link navigates and the new page loads with the menu closed.
- Keyboard: first Tab = "Skip to content", Enter moves focus to `<main>`; nav links show a visible focus ring.
- Transition fallback forced on (View Transitions removed): curtain plays, next page loads fully visible.

**Reduced motion:** all 7 pages — 0 invisible elements, 0 running animations.

**Link integrity:** 273 internal links/assets across 9 HTML files resolve (`npm run check`).

## Bugs found and fixed during testing

1. Clip-path portrait reveals never triggered (fully-clipped elements don't intersect in Chrome) → observed via their wrapper.
2. Fast jumps (End key, anchors) could skip reveal elements → throttled catch-up reveals anything already passed.
3. Original logo's black background showed as a box during the hero intro → blend mode moved to the logo group.
4. Portrait `<picture>` wrappers weren't sized, leaving empty frame space → fixed.
5. Pillars tagline had no break points at 375 px, widening the page → spaces added around bullets.
6. Email address wrapped mid-word on Contact; contact links greyed by card text colour → fixed.
7. Misaligned card headings (pillars, services), oversized Approach step titles, page-hero rule offset → fixed.
8. Dev server could serve a half-written `dist/` during rebuild ("Server error") → requests now wait for the build.
9. Skip link didn't move focus → `<main tabindex="-1">`.

## Limitations / not verified

- **Motion smoothness and the look of the transitions mid-animation were not watched by eye** — the in-app browser pane was hidden for this session, and headless captures show end states. Logic, timing completion and end states were verified; perceived smoothness should get a quick manual look.
- Only Chromium was tested. The View Transitions path is Chromium/Safari 18.2+; Firefox uses the fallback (its logic was tested by simulation in Chromium, not in Firefox itself). Safari, Firefox and real phones/tablets were not tested.
- Touch was emulated (mobile viewport + touch emulation), not tested on hardware.
- The chat widget was only confirmed to load and render; its conversations and Clarity data collection were not exercised.
- The original site has no photography; none was added (no original source to preserve). Adding real property/team photography would lift the design most.
- The live site's original form/CRM wiring (if any lived in GoHighLevel outside the page) was not visible; the original page has no forms.

## Build & deployment readiness

- `npm run build` produces a self-contained `dist/` (HTML ≈ 20 KB/page, CSS 42 KB, JS 7 KB, images WebP 19–27 KB each). No dependencies to install.
- Ready to deploy to any static host. **Not deployed** — pointing edgehospitalitygroups.com at a new host (away from GoHighLevel) is a decision for the owner, along with configuring the host's 404 page.
- Not a git repository yet; nothing committed.
