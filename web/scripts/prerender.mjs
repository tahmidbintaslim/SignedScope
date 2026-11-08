// Writes static HTML for each React page into dist/ (e.g. dist/index.html, dist/kit.html),
// using the SSR build of src/entry-server.tsx and the client index.html as the template.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const { render, PRERENDER, META } = await import(pathToFileURL(resolve('dist-ssr/entry-server.js')).href);
const template = readFileSync('dist/index.html', 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

for (const url of PRERENDER) {
  const meta = META[url] ?? META['/'];
  const html = await render(url);
  const page = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(meta.description)}" />`
      + `\n    <meta property="og:title" content="${esc(meta.title)}" />\n    <meta property="og:description" content="${esc(meta.description)}" />`
      + (meta.noindex ? '\n    <meta name="robots" content="noindex" />' : ''))
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  const file = url === '/' ? 'dist/index.html' : `dist${url}.html`;
  writeFileSync(file, page);
  console.log(`prerendered ${url} -> ${file} (${(page.length / 1024).toFixed(1)} KB)`);
}
rmSync('dist-ssr', { recursive: true, force: true });
