// Assembles what Vercel serves (outputDirectory "site"): the old static pages from public/,
// with the React build (web/dist) on top. Pre-rendered React pages replace their old HTML
// (e.g. dist/index.html replaces public/index.html); every other URL keeps its old page.
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';

if (!existsSync('web/dist/index.html')) { console.error('web/dist is missing: run the web build first'); process.exit(1); }
rmSync('site', { recursive: true, force: true });
cpSync('public', 'site', { recursive: true });
cpSync('web/dist', 'site', { recursive: true, filter: (src) => !src.endsWith('.map') });
const react = readdirSync('web/dist').filter((f) => f.endsWith('.html'));
console.log(`site/ ready: React pages ${react.join(', ')}; other pages from public/`);
