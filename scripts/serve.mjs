// Minimal static server for dist/ that mirrors a typical static host:
// /route/ -> /route/index.html, /route -> 301 /route/, unknown paths -> 404.html.
// `--watch` rebuilds on changes in src/.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const port = Number(process.env.PORT) || 4173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

async function isFile(p) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

async function isDir(p) {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

// Requests wait for an in-flight rebuild, which clears dist/ before writing it again.
let building = Promise.resolve();

const server = createServer(async (req, res) => {
  await building;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(dist, path);

  if (!file.startsWith(dist)) {
    res.writeHead(403).end();
    return;
  }
  if (await isDir(file)) {
    if (!url.pathname.endsWith('/')) {
      res.writeHead(301, { Location: url.pathname + '/' + url.search }).end();
      return;
    }
    file = join(file, 'index.html');
  }

  let status = 200;
  if (!(await isFile(file))) {
    status = 404;
    file = join(dist, '404.html');
  }
  try {
    const body = await readFile(file);
    res.writeHead(status, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(500).end('Server error');
  }
});

building = build();
await building;
if (process.argv.includes('--watch')) {
  let timer;
  watch(join(root, 'src'), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      building = building.then(build).catch((e) => console.error(e));
    }, 120);
  });
}
server.listen(port, () => console.log(`EDGE site running at http://localhost:${port}`));
