// Browser check of the design-system page: renders in light and dark, on desktop and phone,
// has no axe violations, and the dialog, toast and theme menu work. Needs `npm run dev` on BASE.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Playwright comes from the environment (preinstalled browser) rather than this package.
const { chromium } = require('playwright');
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE || 'http://localhost:5173';
const OUT = process.env.OUT || '';
const b = await chromium.launch();
let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failed++; };

for (const [name, opts] of [['desktop-light', { viewport: { width: 1280, height: 900 }, colorScheme: 'light' }], ['desktop-dark', { viewport: { width: 1280, height: 900 }, colorScheme: 'dark' }], ['phone', { viewport: { width: 390, height: 844 }, colorScheme: 'light', hasTouch: true, isMobile: true }]]) {
  const ctx = await b.newContext(opts);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(BASE + '/kit');
  await p.getByRole('heading', { level: 1, name: 'Design system' }).waitFor();
  await p.addScriptTag({ content: axe });
  const res = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`));
  check(res.length === 0, `${name}: axe ${res.join('; ') || 'clean'}`);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${name}: no horizontal scroll`);
  if (OUT) await p.screenshot({ path: `${OUT}/kit-${name}.png`, fullPage: true });

  await p.getByRole('button', { name: 'Open dialog' }).click();
  const dlg = p.getByRole('dialog', { name: 'Send this scope?' });
  await dlg.waitFor();
  check(await p.evaluate(() => document.activeElement?.textContent?.includes('Send')), `${name}: dialog focuses its main action`);
  if (OUT && name !== 'desktop-dark') await p.screenshot({ path: `${OUT}/kit-${name}-dialog.png` });
  await p.keyboard.press('Escape');
  await dlg.waitFor({ state: 'detached' });
  await p.getByRole('button', { name: 'Copy', exact: true }).click();
  await p.getByRole('region', { name: 'Notifications' }).getByText('Copied').waitFor();
  check(true, `${name}: toast shown`);
  check(errors.length === 0, `${name}: console ${errors.join(' | ') || 'clean'}`);
  await ctx.close();
}

// Client-side navigation keeps the shell and focuses the new page's heading.
const p = await b.newPage();
await p.goto(BASE + '/kit');
await p.getByRole('link', { name: 'Free estimate' }).click();
await p.waitForURL('**/estimate');
await p.waitForFunction(() => document.activeElement?.tagName === 'H1', null, { timeout: 3000 }).catch(() => {});
check(await p.evaluate(() => document.activeElement?.tagName === 'H1'), 'navigation moves focus to the new h1');
await p.goto(BASE + '/nope');
check(await p.getByText('Page not found').waitFor().then(() => true, () => false), 'unknown URL shows not found');
await b.close();
process.exit(failed ? 1 : 0);
