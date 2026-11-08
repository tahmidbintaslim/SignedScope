// Serves ../site like Vercel does (clean URLs: /privacy -> privacy.html). For local checks only.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = new URL('../../site/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const port = Number(process.env.PORT || 4173);

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  for (const cand of [path, path + '.html', join(path, 'index.html')]) {
    const file = join(root, cand);
    if (!file.startsWith(root)) break;
    try {
      if ((await stat(file)).isFile()) { res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file)); return; }
    } catch { /* try next */ }
  }
  res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found');
}).listen(port, '127.0.0.1', () => console.log(`site on http://127.0.0.1:${port}`));
