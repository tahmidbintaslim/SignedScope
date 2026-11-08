// Browser check of /new against the real API (dev server on :3100 behind serve-site or Vite):
// blank scope with a pasted brief, an AI-estimate hand-off, and a change request from a receipt.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.OUT || '';
const b = await chromium.launch();
let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failed++; };
const visible = (loc, ms = 8000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);
const audit = async (p, name) => {
  await p.waitForTimeout(300);
  await p.addScriptTag({ content: axe });
  const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`));
  check(v.length === 0, `${name}: axe ${v.join('; ') || 'clean'}`);
};
const post = async (path, body) => (await fetch(BASE + '/api/' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
async function page(ctxOpts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', ...ctxOpts });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/React DevTools|status of 4\d\d|status of 503/.test(m.text())) p.errors.push(m.text()); });
  return p;
}

// Blank: paste a brief, turn it into lines, price them, create the link, open it as the client.
{
  const p = await page();
  await p.goto(BASE + '/new');
  check(await visible(p.getByRole('heading', { name: 'New scope' })), 'new: page shown');
  check(await p.locator('.item').count() === 3, 'new: starts with one line of each kind');
  await audit(p, 'new');
  await p.getByLabel('Project or milestone').fill('Siam Spa booking');
  await p.getByLabel('Client name').fill('Siam Spa');
  await p.getByLabel('Your business or name').fill('Mai Studio');
  await p.getByLabel('Paste the client’s message or brief').fill('- Online booking page\n- LINE notifications for new bookings');
  await p.getByRole('button', { name: 'Turn into lines' }).click();
  check(await visible(p.getByText(/Added 2 lines/)), 'new: brief turned into lines');
  check(await p.locator('.item').count() === 2, `new: empty lines replaced by drafted ones (${await p.locator('.item').count()})`);
  await p.getByLabel('Line 1 price').fill('12000');
  await p.getByLabel('Line 2 price').fill('3000');
  // Pasting a list into one line splits it.
  await p.getByRole('button', { name: 'Out of scope' }).click();
  await p.getByLabel('Line 3', { exact: true }).focus();
  await p.evaluate(() => { const dt = new DataTransfer(); dt.setData('text/plain', '- Hosting\n- Photography'); document.activeElement.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
  check(await p.locator('.item.is-out').count() === 2, 'new: pasted list becomes one line per row');
  check(/15,000/.test(await p.locator('.items-total').innerText()), 'new: running total');
  await p.getByLabel('Currency').selectOption('THB');
  await p.getByRole('button', { name: 'Create sign-off link' }).click();
  check(await visible(p.getByRole('heading', { name: 'Your link is ready' })), 'new: link created');
  const link = await p.getByLabel('Sign-off link').inputValue();
  check(/\/sign#v1\./.test(link), 'new: sign link given');
  const { data } = await post('verify', { token: new URL(link).hash.slice(1) });
  check(data.items.length === 4 && data.currency === 'THB' && data.items.filter((i) => i.price != null).length === 2 && data.anon === true, `new: sealed lines, prices and currency (${data.items.length} lines)`);
  if (OUT) await p.screenshot({ path: `${OUT}/new-done.png` });
  check(p.errors.length === 0, `new: console ${p.errors.join(' | ') || 'clean'}`);
}

// Hand-off from the AI estimator: the draft fills the form once.
{
  const p = await page();
  await p.goto(BASE + '/');
  await p.evaluate(() => sessionStorage.setItem('ss-draft', JSON.stringify({ title: 'Café site', currency: 'BDT', notes: 'From the estimate', client: 'Lumen', items: [{ kind: 'scope', text: 'Menu page', price: 5000 }, { kind: 'out', text: 'Hosting', price: 0 }] })));
  await p.goto(BASE + '/new');
  check(await visible(p.getByText('Filled in from your AI estimate.')), 'draft: banner');
  check(await p.getByLabel('Project or milestone').inputValue() === 'Café site' && await p.getByLabel('Currency').inputValue() === 'BDT' && await p.getByLabel('Line 1 price').inputValue() === '5000', 'draft: fields, currency and prices filled');
  check(await p.getByLabel('Line 2 price').isDisabled(), 'draft: exclusions carry no price');
  check(await p.evaluate(() => sessionStorage.getItem('ss-draft') === null), 'draft: used once');
}

// Change request from a signed receipt: same lines with their ids, currency locked.
{
  const doc = (await post('seal', { title: 'Phase 1', client: 'Lumen', agency: 'Mai Studio', currency: 'USD', items: [{ kind: 'scope', text: 'Home page', price: '800' }, { kind: 'out', text: 'Hosting' }] })).token;
  const { data: d } = await post('verify', { token: doc });
  const decisions = Object.fromEntries(d.items.map((i) => [i.id, { status: i.kind === 'out' ? 'acknowledged' : 'accepted' }]));
  const { receipt } = await post('sign', { token: doc, name: 'Rafi', email: '', agree: true, decisions });
  const p = await page({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await p.goto(`${BASE}/new#cr=${receipt}`);
  check(await visible(p.getByRole('heading', { name: 'Change request (revision 2)' })), 'change request: heading');
  check(await p.getByLabel('Currency').isDisabled() && await p.getByLabel('Line 1', { exact: true }).inputValue() === 'Home page', 'change request: lines loaded, currency locked');
  await p.getByRole('button', { name: 'In scope' }).click();
  await p.getByLabel('Line 3', { exact: true }).fill('Blog');
  await p.getByLabel('Line 3 price').fill('300');
  await p.getByRole('button', { name: 'Create sign-off link' }).click();
  check(await visible(p.getByRole('heading', { name: 'Your link is ready' })), 'change request: link created');
  const { data: cr } = await post('verify', { token: new URL(await p.getByLabel('Sign-off link').inputValue()).hash.slice(1) });
  check(cr.parent && cr.revision === 2 && cr.parent.total === 800 && cr.items[0].id === d.items[0].id, 'change request: sealed against the baseline, ids kept');
  check(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'phone: no horizontal scroll');
  await audit(p, 'new phone');
  if (OUT) await p.screenshot({ path: `${OUT}/new-cr-phone.png`, fullPage: true });
}
await b.close();
process.exit(failed ? 1 : 0);
