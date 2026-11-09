// Browser check of the client pages: /sign and /receipt, against the real API (dev server on
// :3100 behind serve-site or Vite). Seals a scope, signs it, opens the receipt, then signs a
// change request against it. BASE defaults to http://localhost:4173 (the built site).
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
const seal = async (body) => {
  const r = await fetch(BASE + '/api/seal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error);
  return j.token;
};
async function page(ctxOpts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'], ...ctxOpts });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/React DevTools|status of 4\d\d/.test(m.text())) p.errors.push(m.text()); });
  return p;
}

const token = await seal({
  title: 'Lumen Café website: Phase 1', client: 'Lumen Café', agency: 'Mai Studio', agencyEmail: 'mai@studio.test', currency: 'THB', notes: 'Launch by March.',
  payLink: 'https://buy.stripe.com/test_123', payInstructions: 'PromptPay: 081-234-5678', deposit: 30,
  items: [
    { kind: 'scope', text: 'Home page with menu', price: '20000' },
    { kind: 'scope', text: 'Online booking', price: '15000' },
    { kind: 'uat', text: 'Booking works on iPhone Safari' },
    { kind: 'out', text: 'Hosting and domain' },
  ],
});

// Sign: decide every line, see the total change, sign, get a receipt with payment.
let receipt;
{
  const p = await page();
  await p.goto(`${BASE}/sign#${token}`);
  check(await visible(p.getByRole('heading', { name: 'Lumen Café website: Phase 1' })), 'sign: document shown');
  check(await p.getByRole('note').filter({ hasText: 'not verified' }).isVisible(), 'sign: unverified sender warning for links made without an account');
  check(/35,000/.test(await p.locator('.doc-total').innerText()), 'sign: proposed total starts at the full price');
  check(/Due when you sign \(30%\)[\s\S]*10,500/.test(await p.locator('.doc-due').innerText()), 'sign: deposit shown live (30% of 35,000)');
  await audit(p, 'sign');
  if (OUT) await p.screenshot({ path: `${OUT}/sign.png`, fullPage: true });
  // Signing with undecided lines is blocked with a count.
  await p.getByLabel('Your full name').fill('Rafi Ahmed');
  await p.getByLabel(/I’ve reviewed every line/).check();
  await p.getByRole('button', { name: 'Sign off' }).click();
  check(await visible(p.getByText('Decide 4 more lines before you sign.')), 'sign: undecided lines are flagged');
  const group = (text) => p.getByRole('group', { name: text });
  await group('Home page with menu').getByLabel('Accept').check();
  await group('Online booking').getByLabel('Reject').check();
  check(/20,000/.test(await p.locator('.doc-total').innerText()), 'sign: rejecting a priced line lowers the total');
  check(/6,000/.test(await p.locator('.doc-due').innerText()), 'sign: deposit follows the approved total');
  await group('Online booking').getByLabel('What needs to change?').fill('Next phase please');
  await group('Booking works on iPhone Safari').getByLabel('Accept').check();
  await group('Hosting and domain').getByLabel('Understood: not included').check();
  check(/Total you are approving/.test(await p.locator('.doc-total').innerText()), 'sign: total label once all lines are decided');
  await p.getByRole('button', { name: 'Sign off' }).click();
  check(await visible(p.getByRole('heading', { name: 'Signed with requested changes' })), 'sign: signed');
  const pay = p.getByRole('link', { name: /Pay now/ });
  check(await pay.getAttribute('href') === 'https://buy.stripe.com/test_123' && await p.getByText('through buy.stripe.com').isVisible(), 'sign: pay link with its host named');
  check(await p.getByText('PromptPay: 081-234-5678').isVisible(), 'sign: payment instructions shown');
  check(/Due now \(30%\)[\s\S]*6,000[\s\S]*Balance later:.*14,000/.test(await p.locator('.doc-due').innerText()), 'sign: due now and balance after signing');
  receipt = new URL(await p.getByLabel('Receipt link').inputValue()).hash.slice(1);
  check(receipt.startsWith('v1.'), 'sign: receipt link given');
  await audit(p, 'sign done');
  check(p.errors.length === 0, `sign: console ${p.errors.join(' | ') || 'clean'}`);
}

// Receipt: decisions, total, evidence, verify badge.
{
  const p = await page();
  await p.goto(`${BASE}/receipt#${receipt}`);
  check(await visible(p.getByRole('heading', { name: 'Lumen Café website: Phase 1' })), 'receipt: shown');
  check(await p.getByText('Changes requested', { exact: true }).isVisible(), 'receipt: outcome');
  check(await p.getByText('Comment: Next phase please').isVisible(), 'receipt: rejection comment');
  check(/20,000/.test(await p.locator('.doc-total').innerText()), 'receipt: approved total');
  check(/Due now \(30%\)[\s\S]*6,000/.test(await p.locator('.doc-due').innerText()), 'receipt: what is due now');
  const badge = p.getByRole('link', { name: /Signature verified/ });
  check((await badge.getAttribute('href')).startsWith('/verify#v1.'), 'receipt: verify badge links to /verify');
  check(await p.getByRole('link', { name: /Pay approved amount/ }).isVisible(), 'receipt: pay button when something payable was approved');
  const ev = await p.locator('.doc-evidence').innerText();
  check(/Signed by\s+Rafi Ahmed/.test(ev) && /Signed at \(UTC\)\s+\d{4}-\d{2}-\d{2}T/.test(ev) && /Link created \(UTC\)/.test(ev) && /\/verify and paste the receipt link/.test(ev), 'receipt: audit record (signer, UTC times, how to verify)');
  // Print / PDF: the site chrome and buttons drop out, the audit note appears, and a PDF renders.
  await p.emulateMedia({ media: 'print' });
  check(!(await p.locator('.site-header').isVisible()) && !(await p.getByRole('button', { name: 'Download audit PDF' }).isVisible()) && await p.getByText(/Audit record printed/).isVisible(), 'receipt: print layout for the audit PDF');
  const pdf = await p.pdf({ format: 'A4' });
  check(pdf.length > 20000 && pdf.subarray(0, 4).toString() === '%PDF', `receipt: audit PDF renders (${Math.round(pdf.length / 1024)} KB)`);
  if (OUT) (await import('node:fs')).writeFileSync(`${OUT}/receipt-audit.pdf`, pdf);
  await p.emulateMedia({ media: 'screen' });
  await audit(p, 'receipt');
  if (OUT) await p.screenshot({ path: `${OUT}/receipt.png`, fullPage: true });
  await badge.click();
  await p.waitForURL('**/verify#*');
  check(await visible(p.getByText('Valid receipt')), 'receipt: badge opens a passing verify check');
  check(p.errors.length === 0, `receipt: console ${p.errors.join(' | ') || 'clean'}`);
}

// Change request against the receipt: diff bars, removed lines, total against the baseline.
{
  // Like /new does, keep the baseline's item ids so unchanged lines aren't shown as new.
  const base = (await (await fetch(BASE + '/api/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: receipt }) })).json()).data.doc.items;
  const id = (text) => base.find((i) => i.text === text).id;
  const cr = await seal({
    title: 'Lumen Café website: Phase 1', client: 'Lumen Café', agency: 'Mai Studio', currency: 'THB', parent: receipt, deposit: 100,
    items: [
      { id: id('Home page with menu'), kind: 'scope', text: 'Home page with menu', price: '20000' },
      { kind: 'scope', text: 'LINE booking button', price: '4000' },
      { id: id('Hosting and domain'), kind: 'out', text: 'Hosting and domain' },
    ],
  });
  const p = await page({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await p.goto(`${BASE}/sign#${cr}`);
  check(await visible(p.getByText(/Change request against “Lumen Café website: Phase 1”, signed by Rafi Ahmed/)), 'change request: baseline banner');
  check(await p.locator('.decide.is-added').count() === 1, 'change request: added line marked');
  check(await p.getByText('Removed since the signed version').isVisible(), 'change request: removed lines listed');
  check(/Due when you sign \(100%\)[\s\S]*4,000[\s\S]*of the approved increase/.test(await p.locator('.doc-due').innerText()), 'change request: 100% of the increase is due');
  check(/Signed before: THB\s?20,000|Signed before: ฿20,000/.test(await p.locator('.doc-total').innerText()), `change request: total against the baseline (${(await p.locator('.doc-total').innerText()).replace(/\n/g, ' ')})`);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'phone: no horizontal scroll');
  await audit(p, 'change request phone');
  if (OUT) await p.screenshot({ path: `${OUT}/sign-cr-phone.png`, fullPage: true });
}

// Broken links get a clear page, not a blank one.
{
  const p = await page();
  await p.goto(`${BASE}/sign#v1.broken`);
  check(await visible(p.getByRole('heading', { name: 'This link can’t be opened' })), 'sign: broken link explained');
  await p.goto(`${BASE}/receipt`);
  await p.reload();
  check(await visible(p.getByRole('heading', { name: 'This receipt can’t be opened' })), 'receipt: missing token explained');
  await p.goto(`${BASE}/receipt#${token}`);
  check(await visible(p.getByText('This is not a receipt link.')), 'receipt: a sign-off link is refused');
}
await b.close();
process.exit(failed ? 1 : 0);
