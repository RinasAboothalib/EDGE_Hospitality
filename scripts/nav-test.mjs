// Routing & navigation tests against the running site (npm run dev):
// direct URLs/status codes, real clicks on header/logo/footer links, Back/Forward, refresh,
// legacy anchor redirects, mobile menu, keyboard focus, and the non-View-Transitions fallback.
//   node scripts/nav-test.mjs [baseUrl]
import { launch, sleep } from './lib/cdp.mjs';

const base = process.argv[2] ?? 'http://localhost:4173';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

/* ---------- HTTP-level routing ---------- */
const ROUTES = ['/', '/about/', '/leadership/', '/services/', '/approach/', '/training/', '/contact/'];
for (const r of ROUTES) {
  const res = await fetch(base + r, { redirect: 'manual' });
  check(`GET ${r} → 200`, res.status === 200, String(res.status));
}
for (const r of ['/about', '/services', '/contact']) {
  const res = await fetch(base + r, { redirect: 'manual' });
  check(`GET ${r} → 301 ${r}/`, res.status === 301 && res.headers.get('location') === r + '/', `${res.status} ${res.headers.get('location')}`);
}
{
  const res = await fetch(base + '/no-such-page', { redirect: 'manual' });
  check('Unknown URL → 404 page', res.status === 404 && (await res.text()).includes('This page has checked out'), String(res.status));
}

/* ---------- Browser-level ---------- */
const { openPage, shutdown } = await launch({ port: 9334 });

async function page({ width = 1280, height = 800, mobile = false, noVT = false } = {}) {
  const p = await openPage();
  await p.s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  if (noVT) await p.s('Page.addScriptToEvaluateOnNewDocument', { source: 'delete window.CSSViewTransitionRule;' });
  p.errors = [];
  return p;
}

// Wait until the intro loader (fresh loads) or arrival curtain has finished
async function settled(p, timeout = 6000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const ok = await p.evaluate(`document.documentElement.classList.contains('is-ready') && !document.querySelector('[data-intro-loader]')`).catch(() => false);
    if (ok) return true;
    await sleep(100);
  }
  return false;
}

async function go(p, url) {
  const loaded = p.waitFor('Page.loadEventFired');
  await p.s('Page.navigate', { url: base + url });
  await loaded;
  await settled(p);
  await sleep(700);
}

// Real mouse click on the first element matching selector (scrolled into view first)
async function click(p, selector, { waitLoad = true } = {}) {
  const box = await p.evaluate(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(e => e.offsetParent || getComputedStyle(e).position === 'fixed');
    if (!el) return null;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  if (!box) throw new Error(`No visible element for ${selector}`);
  await sleep(150);
  const loaded = waitLoad ? p.waitFor('Page.loadEventFired', 8000) : null;
  for (const type of ['mousePressed', 'mouseReleased']) {
    await p.s('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
  }
  if (loaded) await loaded;
  await sleep(waitLoad ? 2300 : 600); // curtain lift + page entrance
}

const state = (p) => p.evaluate(`({
  path: location.pathname,
  hash: location.hash,
  current: document.querySelector('.site-nav [aria-current="page"]')?.textContent ?? null,
  h1Visible: (() => { const h = document.querySelector('h1'); if (!h) return false; const r = h.getBoundingClientRect(); return r.height > 0 && parseFloat(getComputedStyle(h).opacity) > 0.95; })(),
  mainOpacity: parseFloat(getComputedStyle(document.querySelector('main')).opacity),
  loader: !!document.querySelector('[data-intro-loader]') || !document.documentElement.classList.contains('is-ready'),
  curtain: ['is-leaving', 'is-arriving'].some(c => document.documentElement.classList.contains(c)) || getComputedStyle(document.querySelector('.page-curtain')).visibility === 'visible',
  text: document.body.innerText.length
})`);

const visibleOK = (st) => st.h1Visible && st.mainOpacity > 0.95 && !st.curtain && !st.loader && st.text > 200;

// Header navigation with real clicks
{
  const p = await page();
  await go(p, '/');
  check('Cross-document View Transitions supported in test browser', await p.evaluate(`'CSSViewTransitionRule' in window`));
  const NAV = [['About', '/about/'], ['Leadership', '/leadership/'], ['Services', '/services/'], ['Approach', '/approach/'], ['Training', '/training/']];
  for (const [label, path] of NAV) {
    await click(p, `.site-nav a[href="${path}"]`);
    const st = await state(p);
    check(`Header "${label}" → ${path}`, st.path === path && st.current === label && visibleOK(st), JSON.stringify(st));
  }
  await click(p, '.site-nav a[href="/contact/"]');
  let st = await state(p);
  check('Header "Contact" → /contact/', st.path === '/contact/' && visibleOK(st), st.path);
  await click(p, '.site-header .wordmark');
  st = await state(p);
  check('Logo → /', st.path === '/' && visibleOK(st), st.path);

  // Back / Forward
  const hist = async (delta) => {
    const { currentIndex, entries } = await p.s('Page.getNavigationHistory');
    const loaded = p.waitFor('Page.loadEventFired', 4000);
    await p.s('Page.navigateToHistoryEntry', { entryId: entries[currentIndex + delta].id });
    await loaded; // bfcache restores fire no load event; the timeout covers that
    await settled(p);
    await sleep(800);
    return state(p);
  };
  st = await hist(-1);
  check('Back → /contact/ renders', st.path === '/contact/' && visibleOK(st), JSON.stringify(st));
  st = await hist(-1);
  check('Back again → /training/ renders', st.path === '/training/' && visibleOK(st), JSON.stringify(st));
  st = await hist(+1);
  check('Forward → /contact/ renders', st.path === '/contact/' && visibleOK(st), JSON.stringify(st));

  // Refresh
  const loaded = p.waitFor('Page.loadEventFired');
  await p.s('Page.reload', {});
  await loaded;
  const reloadLoader = await p.evaluate(`!!document.querySelector('[data-intro-loader]')`);
  check('Refresh shows no loading screen', reloadLoader === false, `loader=${reloadLoader}`);
  await settled(p);
  await sleep(800);
  st = await state(p);
  check('Refresh keeps /contact/', st.path === '/contact/' && visibleOK(st), st.path);

  // In-page links and footer links
  await go(p, '/');
  await click(p, '.pillar-flip[href="/about/#pillar-growth"]');
  st = await state(p);
  const anchorTop = await p.evaluate(`Math.round(document.getElementById('pillar-growth').getBoundingClientRect().top)`);
  check('Home pillar flip card → /about/#pillar-growth (scrolled to it)', st.path === '/about/' && st.hash === '#pillar-growth' && anchorTop >= 0 && anchorTop < 300, `top=${anchorTop}`);
  const footer = await p.evaluate(`[...document.querySelectorAll('.site-footer__nav a')].map(a => a.getAttribute('href'))`);
  for (const href of footer) {
    await go(p, '/about/');
    await click(p, `.site-footer__nav a[href="${href}"]`);
    st = await state(p);
    check(`Footer link ${href}`, st.path === href && visibleOK(st), st.path);
  }
  await go(p, '/services/');
  await click(p, '.next-page');
  st = await state(p);
  check('"Next page" pager on /services/ → /approach/', st.path === '/approach/' && visibleOK(st), st.path);
  await p.close();
}

// Legacy URLs from the original single-page site
{
  const p = await page();
  const LEGACY = [['/#vision', '/about/'], ['/#pillars', '/about/'], ['/#leadership', '/leadership/'], ['/#services', '/services/'], ['/#approach', '/approach/'], ['/#training', '/training/'], ['/#contact', '/contact/'], ['/home', '/'], ['/home/#services', '/services/']];
  for (const [from, to] of LEGACY) {
    await go(p, from);
    await sleep(300);
    await settled(p);
    const st = await state(p);
    check(`Legacy ${from} → ${to}`, st.path === to && visibleOK(st), st.path + st.hash);
  }
  await p.close();
}

// Fresh visit: no loading screen, hero animates straight in
{
  const p = await page();
  const loaded = p.waitFor('Page.loadEventFired');
  await p.s('Page.navigate', { url: base + '/' });
  await loaded;
  await sleep(250);
  const during = await p.evaluate(`({ loader: !!document.querySelector('[data-intro-loader]'), ready: document.documentElement.classList.contains('is-ready'), heroPaused: getComputedStyle(document.querySelector('.hero__logo')).animationPlayState, overflow: getComputedStyle(document.documentElement).overflow })`);
  check('Fresh visit has no loading screen (ready at once, hero animating, scroll free)', !during.loader && during.ready && during.heroPaused === 'running' && during.overflow !== 'hidden', JSON.stringify(during));
  const ok = await settled(p, 4000);
  await sleep(1400);
  const after = await p.evaluate(`({ lines: document.querySelectorAll('.hero__title .line').length, title: document.querySelector('.hero__title').textContent.trim(), header: getComputedStyle(document.querySelector('.site-header')).opacity })`);
  check('Hero title reveals; header fades in', ok && after.title === 'We Think Like The Owners' && parseFloat(after.header) > 0.95, JSON.stringify(after));
  await sleep(1500);
  const restored = await p.evaluate(`document.querySelector('.hero__title').innerHTML.includes('line__inner')`);
  check('Split headings are restored to their original markup after the reveal', !restored);
  await p.close();
}

// Mobile menu
{
  const p = await page({ width: 375, height: 812, mobile: true });
  await go(p, '/');
  await click(p, '[data-menu-toggle]', { waitLoad: false });
  let m = await p.evaluate(`({ open: document.querySelector('[data-mobile-menu]').classList.contains('is-open'), expanded: document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded'), focus: document.activeElement.textContent.trim(), locked: document.body.classList.contains('menu-open'), opacity: getComputedStyle(document.querySelector('[data-mobile-menu]')).opacity })`);
  check('Mobile menu opens (aria-expanded, scroll lock, focus moved)', m.open && m.expanded === 'true' && m.locked && m.focus === 'Home' && parseFloat(m.opacity) > 0.95, JSON.stringify(m));
  await p.s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(600);
  m = await p.evaluate(`({ hidden: document.querySelector('[data-mobile-menu]').hidden, expanded: document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded'), focusToggle: document.activeElement === document.querySelector('[data-menu-toggle]') })`);
  check('Mobile menu closes on Escape and returns focus', m.hidden && m.expanded === 'false' && m.focusToggle, JSON.stringify(m));
  await click(p, '[data-menu-toggle]', { waitLoad: false });
  await click(p, '.mobile-menu a[href="/services/"]');
  const st = await state(p);
  const after = await p.evaluate(`({ hidden: document.querySelector('[data-mobile-menu]').hidden, locked: document.body.classList.contains('menu-open') })`);
  check('Mobile menu link → /services/, menu closed on new page', st.path === '/services/' && after.hidden && !after.locked && visibleOK(st), JSON.stringify(after));
  await p.close();
}

// Keyboard
{
  const p = await page();
  await go(p, '/about/');
  const tab = async (shift = false) => {
    await p.s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: shift ? 8 : 0 });
    await p.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: shift ? 8 : 0 });
    await sleep(120);
    return p.evaluate(`({ text: document.activeElement.textContent.trim().slice(0, 30), outline: getComputedStyle(document.activeElement).outlineStyle, cls: document.activeElement.className })`);
  };
  let f = await tab();
  check('First Tab focuses "Skip to content"', f.text === 'Skip to content', JSON.stringify(f));
  await p.s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await sleep(300);
  const skipped = await p.evaluate(`document.activeElement.id`);
  check('Skip link moves focus to <main>', skipped === 'main', skipped);
  await go(p, '/about/');
  await tab(); // skip link
  await tab(); // wordmark
  f = await tab(); // first nav link
  check('Nav links show a visible focus ring', f.text === 'About' && f.outline !== 'none', JSON.stringify(f));
  await p.close();
}

// Branded page transition: curtain rises on the old page, new page starts covered, then it lifts
{
  const p = await page();
  await go(p, '/');
  const box = await p.evaluate(`(() => { const r = document.querySelector('.site-nav a[href="/services/"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  const loaded = p.waitFor('Page.domContentEventFired', 8000);
  for (const type of ['mousePressed', 'mouseReleased']) await p.s('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(350);
  const leaving = await p.evaluate(`({ cls: document.documentElement.classList.contains('is-leaving'), path: location.pathname, transform: getComputedStyle(document.querySelector('.page-curtain')).transform })`);
  check('Click raises the curtain before navigating', leaving.cls && leaving.path === '/', JSON.stringify(leaving));
  await loaded;
  const arriving = await p.evaluate(`({ arriving: document.documentElement.classList.contains('is-arriving'), path: location.pathname })`);
  check('New page starts covered by the curtain', arriving.arriving && arriving.path === '/services/', JSON.stringify(arriving));
  await sleep(2300);
  const st = await state(p);
  check('Curtain lifts and /services/ is fully visible', st.path === '/services/' && visibleOK(st), JSON.stringify(st));
  // Same-page anchors and external links don't trigger it
  await p.evaluate(`document.querySelector('a[href="mailto:hello@edgehospitalitygroups.com"]').addEventListener('click', e => e.preventDefault()); 1`);
  await click(p, '.site-footer a[href^="mailto:"]', { waitLoad: false });
  const mail = await p.evaluate(`document.documentElement.classList.contains('is-leaving')`);
  check('mailto: links do not trigger the curtain', !mail);
  await p.close();
}

// Reduced motion: no curtain, plain navigation
{
  const p = await page();
  await p.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await go(p, '/');
  await click(p, '.site-nav a[href="/about/"]');
  const st = await state(p);
  const shown = await p.evaluate(`getComputedStyle(document.querySelector('.page-curtain')).display`);
  check('Reduced motion: navigation without curtain', st.path === '/about/' && visibleOK(st) && shown === 'none', shown);
  await p.close();
}

await shutdown();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
