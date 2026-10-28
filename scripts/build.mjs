// Assembles src/pages/*.html with the shared partials into dist/.
// Each page starts with a <!--meta {...} --> JSON block; every route is written
// as <route>/index.html so direct URLs and refreshes work on any static host.
import { readFile, writeFile, mkdir, cp, rm, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const out = join(root, 'dist');
const SITE = 'https://edgehospitalitygroups.com';

const NAV = [
  { id: 'about', label: 'About', href: '/about/' },
  { id: 'leadership', label: 'Leadership', href: '/leadership/' },
  { id: 'services', label: 'Services', href: '/services/' },
  { id: 'approach', label: 'Approach', href: '/approach/' },
  { id: 'training', label: 'Training', href: '/training/' },
  { id: 'contact', label: 'Contact', href: '/contact/' },
];

const ICON_ARROW =
  '<svg class="btn__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const ICON_ARROW_UP =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';

const navLinks = (active) =>
  NAV.map(({ id, label, href }) =>
    `<li><a href="${href}"${id === active ? ' aria-current="page"' : ''}>${label}</a></li>`
  ).join('\n          ');

async function partial(name) {
  return readFile(join(src, 'partials', `${name}.html`), 'utf8');
}

function fill(template, vars) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

export async function build() {
  const started = Date.now();
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(join(src, 'assets'), join(out, 'assets'), { recursive: true });
  await cp(join(src, 'public'), out, { recursive: true }); // root files: favicon.ico, manifest

  const [head, header, footer, scripts] = await Promise.all(
    ['head', 'header', 'footer', 'scripts'].map(partial)
  );
  const version = started.toString(36);
  const pages = (await readdir(join(src, 'pages'))).filter((f) => f.endsWith('.html'));
  const sitemap = [];

  for (const file of pages) {
    const raw = await readFile(join(src, 'pages', file), 'utf8');
    const match = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
    if (!match) throw new Error(`${file}: missing <!--meta {...} --> block`);
    const meta = JSON.parse(match[1]);
    const body = raw.slice(match[0].length);

    const vars = {
      ...meta,
      version,
      canonical: SITE + meta.path,
      ogImage: `${SITE}/assets/img/og-image.jpg`,
      navLinks: navLinks(meta.nav),
      headExtra: meta.headExtra ?? '',
      bodyClass: meta.bodyClass ?? '',
      arrow: ICON_ARROW,
      arrowUp: ICON_ARROW_UP,
    };

    const html = meta.raw
      ? fill(body, vars)
      : `<!DOCTYPE html>
<html lang="en">
<head>
${fill(head, vars)}
</head>
<body class="${vars.bodyClass}">
${fill(header, vars)}
<main id="main" class="page" tabindex="-1" data-page="${meta.nav ?? ''}">
${fill(body, vars)}
</main>
${fill(footer, vars)}
${fill(scripts, vars)}
</body>
</html>
`;

    const target = meta.output
      ? join(out, meta.output)
      : join(out, meta.path, 'index.html');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, html);
    if (meta.sitemap !== false) sitemap.push(SITE + meta.path);
  }

  await writeFile(
    join(out, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`
  );
  await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log(`Built ${pages.length} pages into dist/ in ${Date.now() - started}ms`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
