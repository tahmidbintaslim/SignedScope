'use strict';
// Minimal local server: static files from public/ (clean URLs) and Vercel-style handlers from api/.
// Usage: SIGNING_SECRET=$(openssl rand -base64 32) npm run dev
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const port = Number(process.env.PORT) || 3000;
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt' };

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
    const type = types[path.extname(p)] || 'application/octet-stream';
    // Byte ranges, so video seeking works like it does on Vercel.
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m) {
      const start = m[1] ? Number(m[1]) : Math.max(0, data.length - Number(m[2]));
      const end = m[1] && m[2] ? Math.min(Number(m[2]), data.length - 1) : data.length - 1;
      if (start > end || start >= data.length) { res.writeHead(416, { 'content-range': `bytes */${data.length}` }).end(); return; }
      res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${data.length}`, 'content-length': end - start + 1 }).end(data.subarray(start, end + 1));
      return;
    }
    res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes' }).end(data);
  });
}).listen(port, () => console.log(`SignedScope on http://localhost:${port}`));
