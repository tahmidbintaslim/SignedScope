// Serves ../site like Vercel does (clean URLs: /privacy -> privacy.html, /app/* -> app.html). For local checks only.
import { createServer, request } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = new URL('../../site/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const port = Number(process.env.PORT || 4173);
const API = Number(process.env.API_PORT || 3100); // scripts/dev-server.js, for /api calls

createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    const up = request({ host: '127.0.0.1', port: API, path: req.url, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    up.on('error', () => { res.writeHead(502); res.end('{"error":"API not running"}'); });
    req.pipe(up); return;
  }
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  for (const cand of [path, path + '.html', join(path, 'index.html')]) {
    const file = join(root, cand);
    if (!file.startsWith(root)) break;
    try {
      if ((await stat(file)).isFile()) { res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file)); return; }
    } catch { /* try next */ }
  }
  // Same as the vercel.json rewrite: every /app/* URL gets the workspace shell.
  if (path.startsWith('/app/')) { res.writeHead(200, { 'content-type': TYPES['.html'] }); res.end(await readFile(join(root, 'app.html'))); return; }
  res.writeHead(404, { 'content-type': TYPES['.html'] }); res.end(await readFile(join(root, '404.html')).catch(() => 'not found'));
}).listen(port, '127.0.0.1', () => console.log(`site on http://127.0.0.1:${port}`));
