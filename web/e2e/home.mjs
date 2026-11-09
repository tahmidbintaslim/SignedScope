// Browser check of the production home page (pre-rendered + hydrated), served like Vercel:
//   node scripts/build-site.mjs && node web/e2e/serve-site.mjs & BASE=http://127.0.0.1:4173 node web/e2e/home.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const OUT = process.env.OUT || '';
const b = await chromium.launch();
let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failed++; };

// Without JavaScript the page is complete (pre-rendered).
{
  const ctx = await b.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto(BASE + '/');
  check(await p.getByRole('heading', { level: 1 }).innerText().then((t) => t.includes('Get the scope signed')), 'no-JS: hero heading present');
  check(await p.getByRole('heading', { name: 'Questions', exact: true }).isVisible(), 'no-JS: lower sections visible');
  check((await p.title()).startsWith('SignedScope'), 'no-JS: title set');
  await ctx.close();
}

for (const [name, opts] of [['desktop', { viewport: { width: 1280, height: 900 }, colorScheme: 'light' }], ['dark', { viewport: { width: 1280, height: 900 }, colorScheme: 'dark' }], ['phone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }]]) {
  const ctx = await b.newContext({ ...opts, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' || /hydrat/i.test(m.text())) errors.push(m.text()); });
  await p.goto(BASE + '/');
  await p.waitForLoadState('networkidle');
  // Reveal everything for the audit and screenshot.
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(400);
  await p.addScriptTag({ content: axe });
  const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(' ')).slice(0, 4).join(', ')}`));
  check(v.length === 0, `${name}: axe ${v.join('; ') || 'clean'}`);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${name}: no horizontal scroll`);
  if (OUT) await p.screenshot({ path: `${OUT}/home-${name}.png`, fullPage: true });

  // Live demo: add the ask, price it, approve, sign by typing, see the receipt.
  await p.locator('#demo').scrollIntoViewIfNeeded();
  await p.getByRole('button', { name: 'Add to the scope' }).click();
  await p.getByRole('slider', { name: 'Price' }).fill('1200');
  await p.getByRole('button', { name: 'Send the change request' }).click();
  await p.getByRole('button', { name: 'Approve', exact: true }).click();
  await p.getByRole('button', { name: 'Continue to sign' }).click();
  await p.getByRole('textbox', { name: 'Or type your name' }).fill('Rafi Ahmed');
  await p.getByRole('button', { name: 'Sign revision 2' }).click();
  await p.getByText('Signed. Nobody had to bring up money.').waitFor();
  check(await p.locator('.demo-receipt').innerText().then((t) => t.includes('$4,400')), `${name}: demo receipt shows $3,200 + $1,200 = $4,400`);
  if (OUT && name === 'desktop') await p.locator('#demo').screenshot({ path: `${OUT}/home-demo-done.png` });
  check(errors.length === 0, `${name}: console ${errors.join(' | ') || 'clean'}`);
  await ctx.close();
}

// Drag the ask onto the scope with a pointer.
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(BASE + '/#demo');
  await p.waitForLoadState('networkidle');
  const ask = await p.locator('.demo-ask').boundingBox();
  const drop = await p.locator('.demo-drop').boundingBox();
  await p.mouse.move(ask.x + 30, ask.y + 20); await p.mouse.down();
  await p.mouse.move(drop.x + drop.width / 2, drop.y + drop.height / 2, { steps: 20 }); await p.mouse.up();
  check(await p.getByRole('slider', { name: 'Price' }).waitFor({ timeout: 3000 }).then(() => true, () => false), 'drag and drop adds the ask');
  // Language switch to Thai updates the page.
  await p.getByLabel('Language').selectOption('th');
  await p.getByRole('heading', { level: 1 }).filter({ hasText: 'ให้ลูกค้าเซ็น' }).waitFor({ timeout: 3000 }).then(() => check(true, 'switching to Thai translates the page'), () => check(false, 'switching to Thai translates the page'));
  await p.close();
}
await b.close();
process.exit(failed ? 1 : 0);
