// Fails the build when the JavaScript needed for first paint grows past the budget.
// "Initial" = the entry chunk plus the chunks index.html preloads (not lazy pages or locales).
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 160;
const html = readFileSync('dist/index.html', 'utf8');
const files = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
let total = 0;
for (const f of new Set(files)) {
  const kb = gzipSync(readFileSync('dist/' + f)).length / 1024;
  total += kb;
  console.log(`${f.padEnd(44)} ${kb.toFixed(1)} KB gzip`);
}
console.log(`initial JS: ${total.toFixed(1)} KB gzip (budget ${BUDGET_KB} KB)`);
if (total > BUDGET_KB) { console.error('Over budget'); process.exit(1); }
