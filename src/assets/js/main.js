/* EDGE Hospitality — site behaviour (no dependencies; Lenis smooth scroll loads separately) */
(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const lenis = () => window.edgeLenis;

  /* ---------- Ready ----------
     Intro animations and scroll reveals wait for `ready` (.is-ready / edge:ready). There is no
     loading screen, so the page is ready as soon as this script runs. */
  let markReady;
  const ready = new Promise((resolve) => (markReady = resolve));
  root.classList.add('is-ready');
  window.dispatchEvent(new Event('edge:ready'));
  markReady();

  /* ---------- Header state + reading progress ----------
     Past 24px the header condenses into a floating capsule; it slides away while scrolling
     down and returns on any scroll up. The gold hairline tracks reading progress. */
  const header = document.querySelector('[data-header]');
  const progressBar = document.querySelector('[data-scroll-progress]');
  let lastY = window.scrollY;
  let scrollTick = false;
  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 24);
    const goingDown = y > lastY + 4;
    const goingUp = y < lastY - 4;
    if (goingDown && y > 400 && !body.classList.contains('menu-open')) header?.classList.add('is-hidden');
    else if (goingUp || y < 400) header?.classList.remove('is-hidden');
    if (goingDown || goingUp) lastY = y;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar?.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);
    scrollTick = false;
  };
  onScroll();
  window.addEventListener('scroll', () => {
    if (!scrollTick) {
      scrollTick = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  // keyboard users always get the header back
  header?.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  /* ---------- Pointer effects (desktop only) ----------
     Cards light up under the cursor (border + inner spotlight); buttons pull toward it. */
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer && !reduceMotion.matches) {
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest?.('.card');
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      }
    }, { passive: true });

    // Home hero depth: layers drift with the pointer (values -1…1, eased by CSS transitions)
    const hero = document.querySelector('.hero');
    if (hero) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        hero.style.setProperty('--py', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      }, { passive: true });
      hero.addEventListener('pointerleave', () => {
        hero.style.setProperty('--px', 0);
        hero.style.setProperty('--py', 0);
      });
    }

    /* Cursor tail: a tapered gold ribbon trails the pointer. Each point eases toward the one
       ahead of it, so fast moves stretch the tail and it gathers back in when the pointer
       stops. The native cursor stays visible; the loop sleeps once the tail has settled. */
    const tail = document.createElement('canvas');
    tail.className = 'cursor-tail';
    tail.setAttribute('aria-hidden', 'true');
    document.body.append(tail);
    const tctx = tail.getContext('2d');
    const TAIL_POINTS = 26;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pts = Array.from({ length: TAIL_POINTS }, () => ({ x: -100, y: -100 }));
    const mouse = { x: -100, y: -100 };
    let tailActive = false;
    let tailRunning = false;
    let overLink = 0;

    const sizeTail = () => {
      tail.width = Math.round(innerWidth * dpr);
      tail.height = Math.round(innerHeight * dpr);
      tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeTail();
    window.addEventListener('resize', sizeTail);

    const drawTail = () => {
      const head = pts[0];
      head.x += (mouse.x - head.x) * 0.42;
      head.y += (mouse.y - head.y) * 0.42;
      for (let i = 1; i < TAIL_POINTS; i++) {
        pts[i].x += (pts[i - 1].x - pts[i].x) * 0.48;
        pts[i].y += (pts[i - 1].y - pts[i].y) * 0.48;
      }
      tctx.clearRect(0, 0, innerWidth, innerHeight);
      if (tailActive) {
        tctx.lineCap = 'round';
        tctx.lineJoin = 'round';
        // tapered ribbon: thick and bright at the head, thin and faint at the end
        for (let i = 1; i < TAIL_POINTS; i++) {
          const t = 1 - i / TAIL_POINTS;
          const rgb = `${Math.round(169 + 73 * t)}, ${Math.round(122 + 88 * t)}, ${Math.round(34 + 91 * t)}`;
          tctx.beginPath();
          tctx.moveTo(pts[i - 1].x, pts[i - 1].y);
          tctx.lineTo(pts[i].x, pts[i].y);
          // soft glow pass, then the bright core
          tctx.lineWidth = 2 + t * 18;
          tctx.strokeStyle = `rgba(${rgb}, ${(t * 0.16).toFixed(3)})`;
          tctx.stroke();
          tctx.lineWidth = 1 + t * 8;
          tctx.strokeStyle = `rgba(${rgb}, ${(0.1 + t * 0.85).toFixed(3)})`;
          tctx.stroke();
        }
        // glowing head; swells over links and buttons
        overLink += ((overLink > 0.5 ? 1 : 0) - overLink) * 0.2;
        const r = 4 + overLink * 14;
        const g = tctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 12);
        g.addColorStop(0, `rgba(242, 210, 125, ${(0.5 - overLink * 0.35).toFixed(3)})`);
        g.addColorStop(1, 'rgba(242, 210, 125, 0)');
        tctx.fillStyle = g;
        tctx.beginPath();
        tctx.arc(head.x, head.y, 12, 0, Math.PI * 2);
        tctx.fill();
        // over links the head opens into a ring so the text underneath stays readable
        if (overLink > 0.05) {
          tctx.lineWidth = 1.5;
          tctx.strokeStyle = `rgba(242, 210, 125, ${(overLink * 0.9).toFixed(3)})`;
          tctx.beginPath();
          tctx.arc(head.x, head.y, r, 0, Math.PI * 2);
          tctx.stroke();
        }
        tctx.fillStyle = '#f2d27d';
        tctx.beginPath();
        tctx.arc(head.x, head.y, 3 - overLink * 1.2, 0, Math.PI * 2);
        tctx.fill();
      }
      const last = pts[TAIL_POINTS - 1];
      const settled = Math.hypot(mouse.x - last.x, mouse.y - last.y) < 0.3 && Math.abs(overLink - Math.round(overLink)) < 0.01;
      if (settled && !tailActive) {
        tailRunning = false;
        return;
      }
      if (settled) {
        tailRunning = false; // stays drawn as a resting dot until the next move
        return;
      }
      requestAnimationFrame(drawTail);
    };
    const wakeTail = () => {
      if (!tailRunning) {
        tailRunning = true;
        requestAnimationFrame(drawTail);
      }
    };

    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!tailActive) pts.forEach((pt) => { pt.x = e.clientX; pt.y = e.clientY; });
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      tailActive = true;
      const target = e.target.closest?.('a, button, [role="button"], .pillar-flip');
      overLink = target ? Math.max(overLink, 0.51) : Math.min(overLink, 0.49);
      wakeTail();
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => {
      tailActive = false;
      wakeTail();
    });

    const MAGNET = 0.28;
    document.querySelectorAll('.btn, .next-page__icon').forEach((el) => {
      const host = el.classList.contains('next-page__icon') ? el.closest('.next-page') : el;
      host.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * MAGNET;
        const dy = (e.clientY - (r.top + r.height / 2)) * MAGNET;
        el.style.setProperty('--tx', `${Math.max(-10, Math.min(10, dx)).toFixed(1)}px`);
        el.style.setProperty('--ty', `${Math.max(-8, Math.min(8, dy)).toFixed(1)}px`);
      });
      host.addEventListener('pointerleave', () => {
        el.style.removeProperty('--tx');
        el.style.removeProperty('--ty');
      });
    });
  }

  /* ---------- Scroll-linked motion ----------
     Parallax ([data-parallax] = speed), the home hero drifting and fading as it scrolls away,
     the About pillars stacking, and each page section rising over the one before it
     (the covered section eases back and dims). */
  if (!reduceMotion.matches) {
    const parallax = [...document.querySelectorAll('[data-parallax]')].map((el) => ({ el, speed: parseFloat(el.dataset.parallax) || 0.1 }));
    const heroInner = document.querySelector('.hero__inner');
    const pillars = [...document.querySelectorAll('.pillar-row')];
    pillars.forEach((row, i) => row.style.setProperty('--i', i));
    const stackQuery = window.matchMedia('(min-width: 1025px) and (min-height: 720px)');
    const layers = [...document.querySelectorAll('.page > *'), document.querySelector('.site-footer')].filter(Boolean);

    const update = () => {
      const vh = window.innerHeight;
      parallax.forEach(({ el, speed }) => {
        const r = el.getBoundingClientRect();
        const current = parseFloat(el.dataset.shift || 0);
        const center = r.top - current + r.height / 2;
        if (center < -vh || center > vh * 2) return;
        const shift = (center - vh / 2) * -speed;
        el.dataset.shift = shift;
        el.style.translate = `0 ${shift.toFixed(1)}px`;
      });
      if (heroInner) {
        const p = Math.min(1, window.scrollY / (vh * 0.85));
        heroInner.style.translate = `0 ${(p * vh * 0.18).toFixed(1)}px`;
        heroInner.style.opacity = (1 - p * 0.9).toFixed(3);
      }
      // as a section's top rises through the viewport, the section above recedes
      layers.forEach((el, i) => {
        const next = layers[i + 1];
        if (!next) return;
        const covered = Math.min(1, Math.max(0, 1 - next.getBoundingClientRect().top / vh));
        if (covered > 0 && covered < 1) {
          el.style.scale = (1 - covered * 0.06).toFixed(4);
          el.style.opacity = (1 - covered * 0.55).toFixed(3);
        } else if (el.style.scale) {
          el.style.scale = '';
          el.style.opacity = '';
        }
      });
      if (stackQuery.matches) {
        // each pillar card shrinks and dims as the next one slides over it
        pillars.forEach((row, i) => {
          const next = pillars[i + 1];
          if (!next) return;
          const r = row.getBoundingClientRect();
          const covered = Math.min(1, Math.max(0, 1 - (next.getBoundingClientRect().top - r.top) / r.height));
          row.style.scale = (1 - covered * 0.05).toFixed(4);
          row.style.filter = covered > 0 ? `brightness(${(1 - covered * 0.45).toFixed(3)})` : '';
        });
      } else {
        pillars.forEach((row) => {
          row.style.scale = '';
          row.style.filter = '';
        });
      }
    };
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          update();
          ticking = false;
        });
      }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

  }

  /* ---------- Mobile menu ---------- */
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-mobile-menu]');
  let closeTimer;

  const focusables = () => [toggle, ...menu.querySelectorAll('a[href]')];
  menu?.querySelectorAll('li').forEach((li, i) => li.style.setProperty('--i', i));

  function openMenu() {
    clearTimeout(closeTimer);
    menu.hidden = false;
    void menu.offsetWidth; // let the browser apply the start state before animating
    menu.classList.add('is-open');
    body.classList.add('menu-open');
    lenis()?.stop();
    toggle.setAttribute('aria-expanded', 'true');
    toggle.querySelector('.visually-hidden').textContent = 'Close menu';
    menu.querySelector('a')?.focus({ preventScroll: true });
  }

  function closeMenu({ returnFocus = true } = {}) {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    body.classList.remove('menu-open');
    lenis()?.start();
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.visually-hidden').textContent = 'Menu';
    closeTimer = setTimeout(() => (menu.hidden = true), 450);
    if (returnFocus) toggle.focus({ preventScroll: true });
  }

  if (toggle && menu) {
    toggle.addEventListener('click', () =>
      menu.classList.contains('is-open') ? closeMenu() : openMenu()
    );
    document.addEventListener('keydown', (e) => {
      if (!menu.classList.contains('is-open')) return;
      if (e.key === 'Escape') {
        closeMenu();
      } else if (e.key === 'Tab') {
        const items = focusables();
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => {
      if (e.matches) closeMenu({ returnFocus: false });
    });
  }

  /* ---------- Text reveals ----------
     [data-lines]: split into visual lines, each slides up out of a clip (900ms easeOutCubic,
     optional per-line stagger). [data-words]: words rise 24px with a 35ms stagger (700ms
     easeOutQuart). Inline markup (e.g. gradient spans) is preserved per word, and the
     original markup is restored once the reveal has played. */
  function collectWords(el) {
    const words = [];
    const walk = (node, wrap) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            words.push(/^\s+$/.test(part) ? null : wrap(document.createTextNode(part)));
          });
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child, (n) => {
            const copy = child.cloneNode(false);
            copy.removeAttribute('id');
            copy.appendChild(n);
            return wrap(copy);
          });
        }
      });
    };
    walk(el, (n) => n);
    // collapse runs of whitespace markers; drop leading/trailing ones
    return words.filter((w, i, a) => w || (i > 0 && i < a.length - 1 && a[i - 1]));
  }

  function splitWords(el) {
    const words = collectWords(el);
    el.textContent = '';
    const spans = [];
    words.forEach((w) => {
      if (!w) return el.append(' ');
      const span = document.createElement('span');
      span.className = 'word-reveal';
      span.append(w);
      el.append(span);
      spans.push(span);
    });
    const step = 0.035;
    const delay = (parseFloat(el.dataset.delay) || 0) / 1000;
    spans.forEach((s, i) => s.style.setProperty('--d', `${(delay + i * step).toFixed(3)}s`));
    return delay + spans.length * step + 0.75;
  }

  function splitLines(el) {
    const words = collectWords(el);
    el.textContent = '';
    const probes = [];
    words.forEach((w) => {
      if (!w) return el.append(' ');
      const span = document.createElement('span');
      span.append(w);
      el.append(span);
      probes.push(span);
    });
    const lines = [];
    let top = null;
    probes.forEach((p) => {
      if (p.offsetTop !== top) {
        lines.push([]);
        top = p.offsetTop;
      }
      lines.at(-1).push(p);
    });
    el.textContent = '';
    const delay = (parseFloat(el.dataset.delay) || 0) / 1000;
    const stagger = (parseFloat(el.dataset.staggerLines) || 80) / 1000;
    lines.forEach((line, i) => {
      const outer = document.createElement('span');
      outer.className = 'line';
      const inner = document.createElement('span');
      inner.className = 'line__inner';
      inner.style.setProperty('--d', `${(delay + i * stagger).toFixed(3)}s`);
      line.forEach((p, j) => {
        if (j) inner.append(' ');
        inner.append(...p.childNodes);
      });
      outer.append(inner);
      el.append(outer);
      if (i < lines.length - 1) el.append(' '); // keeps the text readable while split
    });
    return delay + lines.length * stagger + 0.95;
  }

  const splitTargets = document.querySelectorAll('[data-lines], [data-words]');
  if (reduceMotion.matches) {
    splitTargets.forEach((el) => el.classList.add('is-split', 'is-in'));
  } else {
    const fontsReady = Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1000))]);
    fontsReady.then(() => {
      const pending = new Map();
      splitTargets.forEach((el) => {
        const original = el.innerHTML;
        const duration = 'lines' in el.dataset ? splitLines(el) : splitWords(el);
        el.classList.add('is-split');
        pending.set(el, { original, duration });
      });
      const play = (el) => {
        const info = pending.get(el);
        if (!info) return;
        pending.delete(el);
        el.classList.add('is-in');
        setTimeout(() => (el.innerHTML = info.original), info.duration * 1000 + 100);
      };
      ready.then(() => {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              play(entry.target);
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
        pending.forEach((_, el) => io.observe(el));
        // same catch-up as the block reveals below, for fast jumps past a heading
        window.addEventListener('scroll', () => {
          pending.forEach((_, el) => {
            if (el.getBoundingClientRect().top < window.innerHeight * 0.94) play(el);
          });
        }, { passive: true });
      });
      window.addEventListener('beforeprint', () => pending.forEach((_, el) => play(el)));
    });
  }

  /* ---------- Scroll reveals ---------- */
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    const step = parseFloat(group.dataset.stagger) || 0.09;
    [...group.querySelectorAll(':scope > [data-reveal]')].forEach((el, i) => {
      el.style.setProperty('--delay', `${(i * step).toFixed(2)}s`);
    });
  });

  const revealables = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    // A clip-path reveal starts fully clipped, which Chrome treats as never intersecting,
    // so those are triggered by their parent instead.
    const targets = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            targets.get(entry.target)?.forEach((el) => el.classList.add('is-visible'));
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    revealables.forEach((el) => {
      const trigger = el.classList.contains('img-reveal') ? el.parentElement : el;
      if (!targets.has(trigger)) targets.set(trigger, []);
      targets.get(trigger).push(el);
    });
    ready.then(() => targets.forEach((_, trigger) => io.observe(trigger)));

    // Fast jumps (End key, anchor links) can carry an element past the viewport between
    // observer checks; reveal anything that is already above the fold line.
    let catchUp;
    window.addEventListener('scroll', () => {
      clearTimeout(catchUp);
      catchUp = setTimeout(() => {
        if (!root.classList.contains('is-ready')) return;
        const fold = window.innerHeight * 0.94;
        targets.forEach((els, trigger) => {
          if (trigger.getBoundingClientRect().top < fold) {
            els.forEach((el) => el.classList.add('is-visible'));
            io.unobserve(trigger);
            targets.delete(trigger);
          }
        });
      }, 120);
    }, { passive: true });
  } else {
    revealables.forEach((el) => el.classList.add('is-visible'));
  }
  window.addEventListener('beforeprint', () =>
    revealables.forEach((el) => el.classList.add('is-visible'))
  );

  /* ---------- Home roadmap: winding road ----------
     Scroll progress draws the gold road; an orb rides the tip of the drawn line (eased toward
     the scroll target), and each milestone ignites when the orb passes it. Desktop uses a
     horizontal path, small screens a vertical switchback (both stored on the <svg>). */
  const road = document.querySelector('[data-road]');
  if (road) {
    const svg = road.querySelector('.road__svg');
    const paths = [...svg.querySelectorAll('path')];
    const measure = svg.querySelector('.road__trail');
    const stops = [...road.querySelectorAll('.road__stop')];
    const vertical = window.matchMedia('(max-width: 860px)');
    let stopAt = [];
    let target = 0;
    let shown = 0;
    let running = false;

    const layout = () => {
      const v = vertical.matches;
      svg.setAttribute('viewBox', v ? '0 0 300 1000' : '0 0 1000 300');
      paths.forEach((path) => path.setAttribute('d', v ? svg.dataset.v : svg.dataset.h));
      // where along the path each milestone sits (fraction of length), by sampling
      const len = measure.getTotalLength();
      stopAt = stops.map((stop) => {
        const cs = getComputedStyle(stop);
        const tx = (parseFloat(v ? cs.getPropertyValue('--mx') : cs.getPropertyValue('--x')) / 100) * (v ? 300 : 1000);
        const ty = (parseFloat(v ? cs.getPropertyValue('--my') : cs.getPropertyValue('--y')) / 100) * (v ? 1000 : 300);
        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i <= 400; i++) {
          const pt = measure.getPointAtLength((len * i) / 400);
          const d = Math.hypot(pt.x - tx, pt.y - ty);
          if (d < bestD) { bestD = d; best = i / 400; }
        }
        return best;
      });
      render();
    };

    const render = () => {
      paths.forEach((path) => (path.style.strokeDashoffset = String(1 - shown)));
      const v = vertical.matches;
      const pt = measure.getPointAtLength(measure.getTotalLength() * shown);
      road.style.setProperty('--ox', `${(pt.x / (v ? 300 : 1000)) * 100}%`);
      road.style.setProperty('--oy', `${(pt.y / (v ? 1000 : 300)) * 100}%`);
      road.classList.toggle('is-moving', shown > 0.01 && shown < 0.995);
      stops.forEach((stop, i) => stop.classList.toggle('is-reached', shown >= stopAt[i] - 0.004));
    };

    const loop = () => {
      shown += (target - shown) * 0.09;
      if (Math.abs(target - shown) < 0.0005) shown = target;
      render();
      if (shown !== target) requestAnimationFrame(loop);
      else running = false;
    };

    const onScroll = () => {
      const r = road.getBoundingClientRect();
      const vh = window.innerHeight;
      target = reduceMotion.matches ? 1 : Math.min(1, Math.max(0, (vh * 0.82 - r.top) / (vh * 0.5 + r.height * 0.6)));
      if (!running) {
        running = true;
        requestAnimationFrame(loop);
      }
    };

    layout();
    vertical.addEventListener('change', layout);
    ready.then(onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  /* ---------- Pillar flip cards ----------
     Pointer devices flip on hover (CSS). Touch devices have no hover, so the first tap turns
     the card over and the second follows the link. */
  if (!window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.pillar-flip').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (card.classList.contains('is-flipped')) return;
        e.preventDefault();
        document.querySelectorAll('.pillar-flip.is-flipped').forEach((c) => c.classList.remove('is-flipped'));
        card.classList.add('is-flipped');
      });
    });
  }

  /* ---------- Approach timeline progress ---------- */
  const steps = document.querySelector('[data-steps]');
  if (steps) {
    const line = steps.querySelector('.steps__line span');
    let ticking = false;
    const update = () => {
      const rect = steps.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.min(1, Math.max(0, (vh * 0.7 - rect.top) / rect.height));
      line.style.setProperty('--progress', reduceMotion.matches ? 1 : progress.toFixed(3));
      ticking = false;
    };
    update();
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    window.addEventListener('resize', update);
  }

  /* ---------- Page transitions ----------
     Clicking an internal link raises the branded curtain, then navigates normally (so URLs,
     refresh and Back/Forward behave natively). A sessionStorage flag tells the next page's
     <head> script to start covered; here the curtain then lifts off the new page. */
  const LEAVE_MS = 800; // last column: 4 × 55ms stagger + 550ms wipe

  if (root.classList.contains('is-arriving')) {
    const reveal = () =>
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-revealing')));
    // Wait for the webfont (briefly) so the page doesn't reflow as the curtain lifts
    Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 400))]).then(reveal);
    setTimeout(() => root.classList.remove('is-arriving', 'is-revealing'), 2000);
  }

  if (!reduceMotion.matches) {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (
        !link ||
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
        link.target && link.target !== '_self' ||
        link.hasAttribute('download')
      ) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same-page / hash links
      e.preventDefault();
      root.classList.remove('is-arriving', 'is-revealing');
      root.classList.add('is-leaving');
      lenis()?.stop();
      try {
        sessionStorage.setItem('edge-transition', '1');
      } catch {}
      setTimeout(() => (location.href = url.href), LEAVE_MS);
      // Never leave the curtain down if the navigation is cancelled or stalls
      setTimeout(() => {
        root.classList.remove('is-leaving');
        lenis()?.start();
      }, 5000);
    });
  }

  // Restore the page when it comes back from the back/forward cache
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      root.classList.remove('is-leaving', 'is-arriving', 'is-revealing');
      body.classList.remove('menu-open');
      menu?.classList.remove('is-open');
      if (menu) menu.hidden = true;
      toggle?.setAttribute('aria-expanded', 'false');
      lenis()?.start();
    }
  });

  /* ---------- Chat launcher: animated AI bot ----------
     The LeadConnector "Edge AI" widget renders in an open shadow root. Its own launcher button
     keeps all behaviour (open/close, placement); we only restyle it: dark/gold shell, a pulse
     ring, and the animated bot (/assets/img/ai-bot.svg) in place of the stock icon while closed. */
  const BOT_CSS = `
    /* sit low in the corner, close to the footer */
    #lc_text-widget { bottom: 18px !important; right: 18px !important; }
    #lc_text-widget--btn {
      position: absolute !important;
      bottom: 0 !important;
      right: 0 !important;
      background: radial-gradient(circle at 50% 35%, #2a2418, #0b0b0b 72%) !important;
      border: 1px solid rgba(216, 165, 61, 0.6) !important;
      box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.85) !important;
      transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
      overflow: visible !important;
    }
    #lc_text-widget--btn:hover { transform: scale(1.07); }
    #lc_text-widget--btn::before {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: 50%;
      border: 1px solid rgba(216, 165, 61, 0.6);
      animation: edge-bot-ring 2.6s ease-out infinite;
      pointer-events: none;
    }
    #lc_text-widget--btn:has(.widget-open-icon.active) .widget-open-icon { opacity: 0 !important; }
    #lc_text-widget--btn:has(.widget-open-icon.active)::after {
      content: '';
      position: absolute;
      inset: 4%;
      background: url('/assets/img/ai-bot.svg') center / contain no-repeat;
      pointer-events: none;
    }
    @keyframes edge-bot-ring { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(1.45); opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { #lc_text-widget--btn::before { animation: none; opacity: 0; } }

    /* chat window: dark surface, gold accents, site typography */
    #lc_text-widget--box {
      --ion-background-color: #0c0c0c; --ion-item-background: transparent; --ion-text-color: #fff;
      background: #0c0c0c !important;
      border: 1px solid rgba(216, 165, 61, 0.32) !important;
      border-radius: 18px !important;
      box-shadow: 0 30px 70px -20px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(0, 0, 0, 0.6) !important;
      overflow: hidden !important;
      font-family: 'Montserrat', ui-sans-serif, system-ui, sans-serif !important;
    }
    .lc_text-widget_heading--root {
      background: radial-gradient(120% 140% at 0% 0%, rgba(216, 165, 61, 0.22), transparent 55%), linear-gradient(180deg, #17140d, #0c0c0c) !important;
      border-bottom: 1px solid rgba(216, 165, 61, 0.28) !important;
    }
    .header-circular-image-container { border-color: #d8a53d !important; box-shadow: 0 0 16px -2px rgba(216, 165, 61, 0.45) !important; }
    .lc_text-widget_prompt--avatar { background: #000 !important; }
    .lc_text-widget_heading--content, .lc_text-widget_heading--content * {
      color: #fff !important; font-family: inherit !important; font-weight: 700 !important; letter-spacing: 0.02em !important;
    }
    .lc_text-widget_heading_close--btn { --color: #d8a53d; --color-hover: #f2d27d; color: #d8a53d !important; }
    .lc_text-widget_heading_close--btn path { stroke: #d8a53d !important; }
    #pane, .chat-pane { background: #0c0c0c !important; }
    chat-message p { color: inherit !important; font-family: inherit !important; }
    .lc_text-widget--agency-branding {
      background: #0a0a0a !important; color: #8f8f8f !important;
      border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
    }
    .lc_text-widget--agency-branding a { color: #d8a53d !important; }
    /* greeting bubble above the launcher */
    .lc_text-widget_prompt--msg-bubble {
      background: #111 !important; color: #f1f1f1 !important;
      border: 1px solid rgba(216, 165, 61, 0.4) !important; border-radius: 14px !important;
      box-shadow: 0 18px 40px -16px rgba(0, 0, 0, 0.9) !important;
      font-family: 'Montserrat', ui-sans-serif, system-ui, sans-serif !important;
    }
    .lc_text-widget_prompt--prompt-text { color: #f1f1f1 !important; font-family: inherit !important; }
    .lc_text-widget_prompt--prompt-text::after {
      background: #111 !important;
      border-right: 1px solid rgba(216, 165, 61, 0.4); border-bottom: 1px solid rgba(216, 165, 61, 0.4);
    }
    .lc_text-widget_prompt--prompt-close svg { fill: #8f8f8f !important; transition: fill 0.2s; }
    .lc_text-widget_prompt--prompt-close:hover svg { fill: #d8a53d !important; }
  `;
  // the chat window is built from nested open shadow roots; each gets its own sheet (keyed by host tag)
  const CHAT_CSS = {
    'chat-pane': `.footer { background: #0c0c0c !important; }`,
    'chat-conversation': `ion-content { --background: #0c0c0c; } ion-list { background: transparent !important; }`,
    'ion-content': `.inner-scroll { scrollbar-width: thin; scrollbar-color: #2e2a20 transparent; }`,
    'chat-message': `
      ion-item { --background: transparent; --color: #fff; }
      .thumbnail-img { background: #000 !important; border: 1px solid rgba(216, 165, 61, 0.55); border-radius: 50%; }
      .bubble { font-family: 'Montserrat', ui-sans-serif, system-ui, sans-serif !important; border-radius: 14px !important; }
      .bubble.incoming {
        background: #161616 !important; color: #f1f1f1 !important;
        border: 1px solid rgba(255, 255, 255, 0.07); border-top-left-radius: 4px !important;
      }
      .bubble.outgoing {
        background: linear-gradient(135deg, #f2d27d, #d8a53d 55%, #a97a22) !important; color: #111 !important;
        border-top-right-radius: 4px !important;
      }
      .bubble, .bubble * { color: inherit; }
      .bubble.incoming .footer-text { color: #8f8f8f !important; }
      .bubble.outgoing .footer-text { color: rgba(17, 17, 17, 0.65) !important; }
    `,
    'chat-input': `
      .input-container { background: #0c0c0c !important; border-top: 1px solid rgba(255, 255, 255, 0.06); }
      .input-container-textarea {
        background: #141414 !important; border-color: #2a2a2a !important; border-radius: 12px !important;
        transition: border-color 0.25s, box-shadow 0.25s;
      }
      .input-container-textarea:focus-within { border-color: rgba(216, 165, 61, 0.7) !important; box-shadow: 0 0 0 3px rgba(216, 165, 61, 0.14); }
      ion-textarea { --color: #fff; --placeholder-color: #8f8f8f; --placeholder-opacity: 1; font-family: 'Montserrat', ui-sans-serif, system-ui, sans-serif !important; }
      textarea { color: #fff !important; caret-color: #d8a53d; }
      textarea::placeholder { color: #8f8f8f !important; opacity: 1 !important; }
      .live-chat-send-button {
        background: linear-gradient(135deg, #f2d27d, #d8a53d 55%, #a97a22) !important; color: #111 !important;
        box-shadow: 0 8px 20px -8px rgba(216, 165, 61, 0.6); transition: transform 0.25s, filter 0.25s, opacity 0.25s;
      }
      .live-chat-send-button:not(:disabled):hover { transform: scale(1.06); filter: brightness(1.08); }
      .live-chat-send-button:disabled { background: #1c1c1c !important; color: rgba(216, 165, 61, 0.45) !important; box-shadow: none; }
      .live-chat-send-button path { stroke: #111 !important; }
      .live-chat-send-button:disabled path { stroke: rgba(216, 165, 61, 0.55) !important; }
    `,
  };
  const styleShadow = (root, css) => {
    if (!css || root.getElementById('edge-bot-style')) return;
    const style = document.createElement('style');
    style.id = 'edge-bot-style';
    style.textContent = css;
    root.append(style);
  };
  const observed = new WeakSet();
  const styleTree = (root) => {
    root.querySelectorAll('*').forEach((el) => {
      if (!el.shadowRoot) return;
      styleShadow(el.shadowRoot, CHAT_CSS[el.localName]);
      styleTree(el.shadowRoot);
    });
    // messages and views are added later; restyle whatever appears
    if (!observed.has(root)) {
      observed.add(root);
      let queued = false;
      new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; styleChatLauncher(); });
      }).observe(root, { childList: true, subtree: true });
    }
  };
  const styleChatLauncher = () => {
    const root = document.querySelector('chat-widget')?.shadowRoot;
    if (!root) return false;
    styleShadow(root, BOT_CSS);
    styleTree(root);
    return true;
  };
  // the widget loads asynchronously; poll until it exists, then observers keep it themed
  let botChecks = 0;
  const botTimer = setInterval(() => {
    if (styleChatLauncher() || ++botChecks > 40) clearInterval(botTimer);
  }, 500);

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
})();
