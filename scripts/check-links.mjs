// Verifies every internal href/src in dist/ resolves to a file, and every #fragment to an id.
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'dist');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))
  );
  return files.flat();
}

async function exists(p) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

const pages = (await walk(dist)).filter((f) => f.endsWith('.html'));
const ids = new Map();
for (const page of pages) {
  const html = await readFile(page, 'utf8');
  ids.set(page, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
}

const problems = [];
let checked = 0;
for (const page of pages) {
  const html = await readFile(page, 'utf8');
  for (const [, url] of html.matchAll(/\s(?:href|src|srcset)="(\/[^"]*|#[^"]*)"/g)) {
    checked++;
    const [pathPart, hash] = url.split('#');
    const clean = pathPart.split('?')[0];
    const target = clean === '' ? page : join(dist, clean.endsWith('/') ? clean + 'index.html' : clean);
    if (!(await exists(target))) {
      problems.push(`${relative(dist, page)}: missing ${url}`);
      continue;
    }
    if (hash && target.endsWith('.html') && !ids.get(target)?.has(hash)) {
      problems.push(`${relative(dist, page)}: missing anchor ${url}`);
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`OK — ${checked} internal links/assets across ${pages.length} pages resolve.`);
