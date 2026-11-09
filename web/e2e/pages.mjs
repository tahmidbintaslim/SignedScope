// Browser check of /estimate, /verify, /privacy and /thanks on the assembled site with the API:
//   node web/e2e/serve-site.mjs & SIGNING_SECRET=... PORT=3100 node scripts/dev-server.js & node web/e2e/pages.mjs
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
const audit = async (p, name) => {
  await p.addScriptTag({ content: axe });
  const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`));
  check(v.length === 0, `${name}: axe ${v.join('; ') || 'clean'}`);
};
const page = async (opts = {}) => {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', ...opts });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/status of 503/.test(m.text())) p.errors.push(m.text()); });
  return p;
};

// Estimator: with AI off, the sample brief returns the labelled sample; edits update totals.
{
  const p = await page();
  await p.goto(BASE + '/estimate');
  await p.waitForLoadState('networkidle');
  await p.getByRole('button', { name: 'Use a sample brief' }).click();
  await p.getByRole('button', { name: 'Estimate my project' }).click();
  await p.getByText('Sample estimate for the sample brief').waitFor();
  const kpi = () => p.locator('.est-kpi').first().innerText();
  const before = await kpi();
  const first = p.locator('.est-hrs').first();
  await first.fill(String(Number(await first.inputValue()) + 20));
  check((await kpi()) !== before, `estimate: editing hours updates the price range (${before} -> ${await kpi()})`);
  check(before.includes('฿') || before.includes('THB'), 'estimate: sample uses THB');
  await p.getByRole('radio', { name: 'Yes, after edits' }).check();
  await p.getByRole('button', { name: 'Send feedback' }).click();
  await p.getByText('Thank you! This helps us improve.').waitFor({ timeout: 5000 }).then(() => check(true, 'estimate: feedback sent'), () => check(false, 'estimate: feedback sent'));
  await audit(p, 'estimate');
  if (OUT) await p.screenshot({ path: `${OUT}/estimate.png`, fullPage: true });
  await p.getByRole('button', { name: 'Turn into a scope link' }).click();
  await p.waitForURL('**/new');
  check(await p.getByText('Filled in from your AI estimate.').waitFor({ timeout: 8000 }).then(() => true, () => false), 'estimate: /new shows the estimate draft');
  check(await p.evaluate(() => { try { return JSON.parse(sessionStorage.getItem('ss-draft') || 'null') === null; } catch { return false; } }), 'estimate: /new picked up the draft (it clears it after reading)');
  check(p.errors.length === 0, `estimate: console ${p.errors.join(' | ') || 'clean'}`);
}

// Verify: a real link from the API checks out; a tampered one does not; /verify#token checks itself.
{
  const r = await fetch(BASE + '/api/seal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Lumen Café website', client: 'Rafi', agency: 'Mai Studio', items: [{ kind: 'scope', text: 'Home page', price: '1800' }] }) });
  const { token } = await r.json();
  const p = await page();
  await p.goto(BASE + '/verify');
  await p.getByLabel('Link or code').fill(`${BASE}/sign#${token}`);
  await p.getByRole('button', { name: 'Verify' }).click();
  await p.getByText('Valid sign-off link').waitFor().then(() => check(true, 'verify: genuine link is valid'), () => check(false, 'verify: genuine link is valid'));
  await audit(p, 'verify');
  await p.getByLabel('Link or code').fill(`${BASE}/sign#${token.slice(0, -3)}abc`);
  await p.getByRole('button', { name: 'Verify' }).click();
  await p.getByText('Not valid').waitFor().then(() => check(true, 'verify: tampered link is rejected'), () => check(false, 'verify: tampered link is rejected'));
  const q = await page();
  await q.goto(`${BASE}/verify#${token}`);
  await q.getByText('Valid sign-off link').waitFor({ timeout: 5000 }).then(() => check(true, 'verify: /verify#token checks on open'), () => check(false, 'verify: /verify#token checks on open'));
}

for (const [path, heading] of [['/privacy', 'Privacy'], ['/thanks', 'You’re in. Thank you.']]) {
  const p = await page();
  await p.goto(BASE + path);
  await p.waitForLoadState('networkidle');
  check(await p.getByRole('heading', { level: 1, name: heading }).isVisible(), `${path}: renders`);
  await audit(p, path);
  check(p.errors.length === 0, `${path}: console ${p.errors.join(' | ') || 'clean'}`);
}
// Header links work across React and old pages.
{
  const p = await page();
  await p.goto(BASE + '/privacy');
  await p.getByRole('link', { name: 'Free estimate' }).click();
  await p.waitForURL('**/estimate');
  check(await p.getByRole('heading', { level: 1 }).filter({ hasText: 'Paste a brief' }).waitFor({ timeout: 5000 }).then(() => true, () => false), 'navigation: /privacy -> /estimate in-app');
  await p.getByRole('link', { name: 'Sign in' }).click();
  await p.waitForURL('**/login');
  check(await p.getByRole('heading', { name: /Sign in or create your workspace|Accounts are coming soon/ }).first().waitFor({ timeout: 8000 }).then(() => true, () => false), 'navigation: /login opens the sign-in page');
}
await b.close();
process.exit(failed ? 1 : 0);
