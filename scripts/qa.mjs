// Headless QA pass over the running site (npm run dev) using Chrome DevTools Protocol.
// For each page × viewport: console errors, failed requests, broken images, horizontal
// overflow, and a full-page screenshot. Also checks reduced-motion and scroll-reveal behaviour.
//   node scripts/qa.mjs [outDir] [baseUrl]
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, sleep } from './lib/cdp.mjs';

const outDir = process.argv[2] ?? 'qa-output';
const base = process.argv[3] ?? 'http://localhost:4173';
const PAGES = ['/', '/about/', '/leadership/', '/services/', '/approach/', '/training/', '/contact/'];
const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900, mobile: false },
  { name: '1280', width: 1280, height: 800, mobile: false },
  { name: '768', width: 768, height: 1024, mobile: true },
  { name: '430', width: 430, height: 932, mobile: true },
  { name: '375', width: 375, height: 812, mobile: true },
];

const { send, listeners, openPage, shutdown } = await launch();

const isOwn = (url) => url.startsWith(base);
const report = [];
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const vp of VIEWPORTS) {
  for (const path of PAGES) {
    const { s, sessionId, targetId, evaluate, waitFor } = await openPage();
    const errors = [];
    const failed = [];
    const onMsg = (msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
      if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400 && isOwn(msg.params.response.url)) failed.push(`${msg.params.response.status} ${msg.params.response.url}`);
      if (msg.method === 'Network.loadingFailed' && !msg.params.canceled) failed.push(`failed ${msg.params.errorText}`);
    };
    listeners.add(onMsg);

    await s('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
    if (vp.mobile) await s('Emulation.setTouchEmulationEnabled', { enabled: true });
    const loaded = waitFor('Page.loadEventFired');
    await s('Page.navigate', { url: base + path });
    await loaded;
    await sleep(3600); // intro loader (≈2s) + hero intro

    // Scroll through the page so IntersectionObserver reveals fire, as a visitor would.
    const scroll = await evaluate(`(async () => {
      const step = innerHeight * 0.6;
      for (let y = 0; y < document.body.scrollHeight; y += step) { scrollTo(0, y); await new Promise(r => setTimeout(r, 140)); }
      await new Promise(r => setTimeout(r, 1600));
      const hidden = [...document.querySelectorAll('[data-reveal]')].filter(e => !e.classList.contains('is-visible')).map(e => e.tagName + '.' + [...e.classList].join('.') + '@' + Math.round(e.getBoundingClientRect().top + scrollY));
      scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 300));
      return { hidden };
    })()`);

    const metrics = await evaluate(`(() => {
      const vw = document.documentElement.clientWidth;
      const overflowX = document.documentElement.scrollWidth > vw + 1;
      const offenders = overflowX ? [...document.querySelectorAll('body *')].filter(e => {
        const r = e.getBoundingClientRect(); return r.width && (r.right > vw + 1 || r.left < -1) && getComputedStyle(e).position !== 'fixed';
      }).slice(0, 5).map(e => e.tagName + '.' + [...e.classList].join('.')) : [];
      const brokenImgs = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && !i.src.startsWith('data:')).map(i => i.src);
      const h1 = document.querySelectorAll('h1').length;
      const smallTargets = [...document.querySelectorAll('main a, main button, header a, header button')].filter(e => {
        const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 24 && getComputedStyle(e).display !== 'inline';
      }).length;
      return { vw, overflowX, offenders, brokenImgs, h1, title: document.title, smallTargets, height: document.documentElement.scrollHeight };
    })()`);

    // Freeze in the final state for the full-page capture
    await evaluate(`document.querySelectorAll('[data-reveal]').forEach(e => e.classList.add('is-visible')); document.getAnimations().forEach(a => { try { a.finish() } catch {} }); 1`);
    await sleep(1500);
    const shot = await s('Page.captureScreenshot', { format: 'jpeg', quality: 70, captureBeyondViewport: true });
    const file = `${vp.name}${path === '/' ? '-home' : path.replace(/\//g, '-').replace(/-$/, '')}.jpg`;
    await writeFile(join(outDir, file), Buffer.from(shot.data, 'base64'));

    listeners.delete(onMsg);
    report.push({ viewport: vp.name, path, ...metrics, hiddenAfterScroll: scroll.hidden, errors, failed, file });
    await send('Target.closeTarget', { targetId });
  }
}

// Reduced motion: every reveal element must be visible without scrolling
{
  const { s, sessionId, targetId, evaluate, waitFor } = await openPage();
  await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const rm = [];
  for (const path of PAGES) {
    const loaded = waitFor('Page.loadEventFired');
    await s('Page.navigate', { url: base + path });
    await loaded;
    await sleep(400);
    rm.push({ path, ...(await evaluate(`({
      invisible: [...document.querySelectorAll('[data-reveal], [data-hero], .hero__title .word, .hero__logo')].filter(e => parseFloat(getComputedStyle(e).opacity) < 0.99).length,
      runningAnimations: document.getAnimations().filter(a => a.playState === 'running' && (a.effect?.getComputedTiming().duration ?? 0) > 50).length
    })`)) });
  }
  report.push({ reducedMotion: rm });
  await send('Target.closeTarget', { targetId });
}

await writeFile(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
const issues = report.filter((r) => r.path && (r.overflowX || r.brokenImgs.length || r.errors.length || r.failed.length || r.hiddenAfterScroll.length || r.h1 !== 1));
console.log(`QA: ${report.length - 1} page/viewport runs, ${issues.length} with issues`);
issues.forEach((r) => console.log(JSON.stringify({ vp: r.viewport, path: r.path, overflowX: r.overflowX, offenders: r.offenders, brokenImgs: r.brokenImgs, errors: r.errors, failed: r.failed, hidden: r.hiddenAfterScroll, h1: r.h1 })));
console.log('Reduced motion:', JSON.stringify(report.at(-1).reducedMotion));

await shutdown();
