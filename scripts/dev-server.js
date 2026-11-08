'use strict';
// Minimal local server: static files from public/ (clean URLs) and Vercel-style handlers from api/.
// Usage: SIGNING_SECRET=$(openssl rand -base64 32) npm run dev
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const port = Number(process.env.PORT) || 3000;
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z]/g, '');
    const file = path.join(root, 'api', name + '.js');
    if (!name || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = raw; }
      req.query = Object.fromEntries(url.searchParams);
      res.status = (s) => { res.statusCode = s; return res; };
      res.json = (j) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(j)); };
      require(file)(req, res);
    });
    return;
  }
  if (url.pathname.startsWith('/_vercel/')) { res.writeHead(204).end(); return; }
  let p = path.normalize(path.join(root, 'public', url.pathname === '/' ? 'index.html' : url.pathname));
  if (!p.startsWith(path.join(root, 'public'))) { res.writeHead(403).end(); return; }
  if (!path.extname(p)) p += '.html';
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }).end(data);
  });
}).listen(port, process.env.HOST || '127.0.0.1', () => console.log(`SignedScope on http://localhost:${port}`));
