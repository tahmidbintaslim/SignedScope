// Writes static HTML for each React page into dist/ (e.g. dist/index.html, dist/kit.html),
// using the SSR build of src/entry-server.tsx and the client index.html as the template.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const { render, PRERENDER, SHELLS, META } = await import(pathToFileURL(resolve('dist-ssr/entry-server.js')).href);
const template = readFileSync('dist/index.html', 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const head = (url) => {
  const meta = META[url] ?? META['/'];
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(meta.description)}" />`
      + `\n    <meta property="og:title" content="${esc(meta.title)}" />\n    <meta property="og:description" content="${esc(meta.description)}" />`
      + (meta.noindex ? '\n    <meta name="robots" content="noindex" />' : ''));
};

for (const url of PRERENDER) {
  const page = head(url).replace('<div id="root"></div>', `<div id="root">${await render(url)}</div>`);
  const file = url === '/' ? 'dist/index.html' : `dist${url}.html`;
  writeFileSync(file, page);
  console.log(`prerendered ${url} -> ${file} (${(page.length / 1024).toFixed(1)} KB)`);
}
// Vercel serves 404.html for any unknown URL; it renders the not-found page (and hydrates there).
writeFileSync('dist/404.html', head('/404').replace('<div id="root"></div>', `<div id="root">${await render('/404')}</div>`));
console.log('prerendered not found -> dist/404.html');
// Signed-in pages: the head only; the browser renders the page (an empty root means no hydration).
for (const url of SHELLS) {
  writeFileSync(`dist${url}.html`, head(url));
  console.log(`shell ${url} -> dist${url}.html`);
}
rmSync('dist-ssr', { recursive: true, force: true });
