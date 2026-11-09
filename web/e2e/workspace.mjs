// Browser check of projects, project detail, clients and settings against a fake Supabase.
// Needs `npm run dev` (BASE, default http://localhost:5173).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { installFake, seed } from './fake-supabase.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE || 'http://localhost:5173';
const OUT = process.env.OUT || '';
const b = await chromium.launch();
let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failed++; };
const visible = (loc, ms = 5000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);
const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 50)); } return false; };
const audit = async (p, name) => {
  await p.waitForTimeout(400); // let toasts finish fading in
  await p.addScriptTag({ content: axe });
  const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`));
  check(v.length === 0, `${name}: axe ${v.join('; ') || 'clean'}`);
};
async function page(tables, ctxOpts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'], ...ctxOpts });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/React DevTools|HydrateFallback|status of 422/.test(m.text())) p.errors.push(m.text()); });
  await installFake(p, tables);
  return p;
}

const P = 'aaaaaaaa-0000-4000-8000-000000000001';
const now = new Date().toISOString();
const t = seed({
  profile: { name: 'Mai Tanaka', business_name: 'Mai Studio', onboarded_at: now, currency: 'THB', country: 'TH', time_zone: 'Asia/Bangkok' },
  clients: [{ id: 'c1', name: 'Lumen Café', company: 'Lumen Co', email: 'hi@lumen.test', created_at: now }],
  projects: [
    { id: P, client_id: 'c1', title: 'Lumen Café website', status: 'in_progress', currency: 'THB', created_at: now, updated_at: now },
    { id: 'p-old', client_id: null, title: 'Old logo', status: 'completed', currency: 'USD', created_at: now, updated_at: now },
  ],
  documents: [{ id: 'd1', project_id: P, kind: 'scope', title: 'Phase 1', revision: 1, status: 'signed', currency: 'THB', total: 40000, token: 'v1.tok.sig', receipt_token: 'r1.tok.sig', signer_name: 'Rafi', signed_at: now, created_at: now }],
  payments: [{ id: 'pay1', project_id: P, label: 'Deposit', amount: 12000, currency: 'THB', status: 'requested', due_date: '2020-01-01', created_at: now }],
});
t.estimates.push({ id: 'e1', project_id: P, currency: 'THB', rate: 900, buffer_pct: 20, data: { features: [{ name: 'Menu', stories: [{ title: 'See the menu', hoursLow: 4, hoursHigh: 6 }] }], outOfScope: ['Hosting'] }, hours_low: 4, hours_high: 6, price_low: 3600, price_high: 5400, created_at: now });

// Projects list: filter, new-project dialog with a new client, then the project opens.
{
  const p = await page(t);
  await p.goto(BASE + '/app/projects');
  check(await visible(p.getByRole('link', { name: 'Lumen Café website' })), 'projects: lists projects');
  await p.getByLabel('Filter by status').selectOption('completed');
  check(await until(async () => (await p.locator('tbody tr').count()) === 1) && await p.getByRole('link', { name: 'Old logo' }).isVisible(), 'projects: status filter');
  await p.getByLabel('Filter by status').selectOption('');
  await audit(p, 'projects');
  if (OUT) await p.screenshot({ path: `${OUT}/projects.png` });

  await p.getByRole('button', { name: 'New project' }).first().click();
  const d = p.getByRole('dialog', { name: 'New project' });
  check(await visible(d) && new URL(p.url()).searchParams.get('new') === '1', 'projects: dialog opens with ?new=1');
  await d.getByLabel('Title').fill('Booking app');
  await d.getByLabel('Client').selectOption('__new');
  await d.getByLabel('Client name').fill('Noodle Bar');
  await d.getByRole('button', { name: 'Create project' }).click();
  await p.waitForURL(/\/app\/projects\/[0-9a-f-]{36}$/);
  const made = t.projects.find((x) => x.title === 'Booking app');
  const nc = t.clients.find((c) => c.name === 'Noodle Bar');
  check(made && nc && made.client_id === nc.id && made.currency === 'THB', 'projects: created with a new client and default currency');
  check(await visible(p.getByRole('heading', { name: 'Booking app' })), 'projects: new project opens');
  // ?new=1 from the dashboard opens the dialog directly.
  await p.goto(BASE + '/app/projects?new=1');
  check(await visible(p.getByRole('dialog', { name: 'New project' })), 'projects: ?new=1 opens the dialog');
  await p.keyboard.press('Escape');
  check(await until(() => !new URL(p.url()).searchParams.has('new')), 'projects: closing clears ?new');
  check(p.errors.length === 0, `projects: console ${p.errors.join(' | ') || 'clean'}`);
}

// Project detail: status, documents, payments, files, delete.
{
  const p = await page(t);
  await p.goto(BASE + `/app/projects/${P}`);
  await p.getByRole('heading', { name: 'Lumen Café website' }).waitFor();
  check(await visible(p.getByText(/3,600/).first()), 'detail: estimate listed');
  check(await visible(p.getByRole('link', { name: 'Change request' })), 'detail: change request offered for a signed scope');
  await p.getByLabel('Project status').selectOption('completed');
  check(await visible(p.getByText('Status updated')) && t.projects.find((x) => x.id === P).status === 'completed', 'detail: status saved');
  check(await until(() => t.activity.some((a) => a.kind === 'status_changed' && a.detail.to === 'completed')), 'detail: status change logged');

  await p.getByRole('button', { name: 'Copy client link' }).click();
  check(await until(async () => (await p.evaluate(() => navigator.clipboard.readText())).endsWith('/sign#v1.tok.sig')), 'detail: client link copied');

  // Payments: mark paid with a reference, then request a new one.
  await p.getByRole('button', { name: 'Mark paid' }).click();
  const md = p.getByRole('dialog', { name: 'Mark “Deposit” as paid' });
  await md.getByLabel('Reference or note').fill('KBank 7781');
  await md.getByRole('button', { name: 'Mark paid' }).click();
  check(await until(() => t.payments[0].status === 'paid_manual' && t.payments[0].reference === 'KBank 7781'), 'detail: payment marked paid with reference');
  check(await visible(p.getByText('Marked paid by you')), 'detail: paid status shown');
  await p.getByRole('button', { name: 'Request a payment' }).click();
  const rd = p.getByRole('dialog', { name: 'Request a payment' });
  await rd.getByLabel('What for').fill('Final 70%');
  await rd.getByLabel('Amount').fill('28000');
  await rd.getByRole('button', { name: 'Add request' }).click();
  check(await until(() => t.payments.some((x) => x.label === 'Final 70%' && Number(x.amount) === 28000 && x.document_id === 'd1')), 'detail: payment requested against the signed scope');
  check(await visible(p.getByRole('cell', { name: /Final 70%/ })), 'detail: new request listed');

  // Files: upload, blocked type, delete.
  await p.locator('#vault-file').setInputFiles([{ name: 'brief.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') }, { name: 'page.html', mimeType: 'text/html', buffer: Buffer.from('<p>x</p>') }]);
  check(await visible(p.getByText('page.html: this file type can’t be stored')), 'files: web pages are refused');
  check(await visible(p.getByRole('cell', { name: /brief\.pdf/ }).first()), 'files: upload listed');
  check(t._files.length === 1 && new RegExp(`^${t.profiles[0].id}/${P}/\\d+-brief\\.pdf$`).test(t._files[0].path), `files: stored under user/project (${t._files[0]?.path})`);
  await audit(p, 'project detail');
  if (OUT) await p.screenshot({ path: `${OUT}/project.png`, fullPage: true });
  await p.getByRole('button', { name: 'Delete brief.pdf' }).click();
  await p.getByRole('dialog', { name: 'Delete brief.pdf' }).getByRole('button', { name: 'Delete' }).click();
  check(await until(() => t._files.length === 0), 'files: deleted');

  // "New scope from estimate" hands a draft to /new.
  await p.getByRole('button', { name: 'New scope from estimate' }).click();
  await p.waitForURL(/\/new\?project=/);
  // /new picks the draft up: lines priced from the estimate, exclusions unpriced, client filled in.
  await p.getByText('Filled in from your AI estimate.').waitFor({ timeout: 8000 }).catch(() => {});
  check(await p.getByLabel('Line 1 price').inputValue() === '5400' && await p.getByLabel('Line 2 price').isDisabled() && await p.getByLabel('Client name').inputValue() === 'Lumen Café', 'detail: new scope filled from the estimate');
  check(p.errors.length === 0, `detail: console ${p.errors.join(' | ') || 'clean'}`);
}

// Delete a project: confirm, then back to the list.
{
  const p = await page(t);
  await p.goto(BASE + `/app/projects/p-old`);
  await p.getByRole('button', { name: 'Delete project' }).click();
  const d = p.getByRole('dialog', { name: 'Delete “Old logo”?' });
  await d.getByRole('button', { name: 'Delete project' }).click();
  await p.waitForURL(/\/app\/projects$/);
  check(!t.projects.some((x) => x.id === 'p-old'), 'detail: project deleted');
  await p.goto(BASE + '/app/projects/nope');
  check(await visible(p.getByRole('heading', { name: 'Project not found' })), 'detail: unknown id shows not found');
}

// Clients: list, add, edit, delete.
{
  const p = await page(t);
  await p.goto(BASE + '/app/clients');
  check(await visible(p.getByRole('link', { name: 'Lumen Café' })), 'clients: listed');
  await audit(p, 'clients');
  await p.getByRole('button', { name: 'Add client' }).first().click();
  const d = p.getByRole('dialog', { name: 'Add client' });
  await d.getByLabel('Name').fill('Siam Spa');
  await d.getByLabel('Country').fill('th');
  await d.getByRole('button', { name: 'Add client' }).click();
  await p.waitForURL(/\/app\/clients\/[0-9a-f-]{36}$/);
  const c = t.clients.find((x) => x.name === 'Siam Spa');
  check(c && c.country === 'TH', 'clients: added with country upper-cased');
  check(await until(() => t.activity.some((a) => a.kind === 'client_created' && a.detail.name === 'Siam Spa')), 'clients: logged');
  await p.getByLabel('Email').fill('owner@siam.test');
  await p.getByRole('button', { name: 'Save' }).click();
  check(await until(() => c.email === 'owner@siam.test'), 'client: edits saved');
  await audit(p, 'client detail');
  await p.getByRole('button', { name: 'Delete client' }).click();
  await p.getByRole('dialog', { name: 'Delete Siam Spa?' }).getByRole('button', { name: 'Delete client' }).click();
  await p.waitForURL(/\/app\/clients$/);
  check(!t.clients.some((x) => x.name === 'Siam Spa'), 'client: deleted');
  check(p.errors.length === 0, `clients: console ${p.errors.join(' | ') || 'clean'}`);
}

// Settings: profile save updates the locale; two-step sign-in on and off; export.
{
  const p = await page(t);
  await p.goto(BASE + '/app/settings');
  await p.getByLabel('Business or studio name').waitFor();
  await p.getByLabel('Business or studio name').fill('Mai Design Co');
  await p.getByLabel('Country').selectOption('BD');
  check(await p.getByLabel('Time zone').inputValue() === 'Asia/Dhaka', 'settings: country picks its time zone');
  await p.getByLabel('a client opens a link').check();
  await p.getByRole('button', { name: 'Save settings' }).click();
  check(await until(() => t.profiles[0].business_name === 'Mai Design Co' && t.profiles[0].country === 'BD' && t.profiles[0].time_zone === 'Asia/Dhaka' && t.profiles[0].notify_viewed === true), 'settings: profile saved');
  await audit(p, 'settings');
  if (OUT) await p.screenshot({ path: `${OUT}/settings.png`, fullPage: true });

  await p.getByRole('button', { name: 'Sign-in and security' }).click();
  check(await until(() => p.evaluate(() => window.__ssOpenedProfile === true)), 'security: opens the Clerk account panel (2-step, sign-in methods)');

  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Export my data' }).click()]);
  const data = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  check(/^signedscope-export-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()) && data.projects.length === t.projects.length && Array.isArray(data.files), 'settings: export downloads every table');
  check(p.errors.length === 0, `settings: console ${p.errors.join(' | ') || 'clean'}`);
}

// Composer: proposal from the latest estimate, AI sections, schedule, terms, then the link.
{
  const p = await page(t);
  let sealed = null;
  await p.route('**/api/proposal', (r) => r.fulfill({ json: { intro: 'AI intro text.', approach: 'AI approach.', nextSteps: 'AI next steps.' } }));
  await p.route('**/api/seal', (r) => { sealed = JSON.parse(r.request().postData()); return r.fulfill({ json: { token: 'v1.test.sig', documentId: 'doc1' } }); });
  await p.goto(BASE + `/app/projects/${P}/compose`);
  await p.getByRole('heading', { name: 'Proposal or agreement' }).waitFor();
  check(await p.getByLabel('Line 1', { exact: true }).inputValue() === 'Menu: See the menu' && await p.getByLabel('Line 1 price').inputValue() === '5400', 'compose: lines from the latest estimate');
  check(await p.getByRole('textbox', { name: 'Payment 1' }).inputValue() === 'Deposit 50%' && await p.getByLabel('Amount').first().inputValue() === '2700', 'compose: 50/50 schedule from the total');
  await p.getByRole('button', { name: 'Write with AI' }).click();
  check(await visible(p.getByText('Draft written. Check it before sending.')) && await p.getByLabel('Section 1 text').inputValue() === 'AI intro text.', 'compose: AI writes the sections');
  await p.getByLabel('Document type').selectOption('agreement');
  check(await p.getByLabel('Title').inputValue() === 'Lumen Café website: Agreement' && await p.getByLabel('Include terms').isChecked(), 'compose: agreement turns on terms');
  check(await p.getByText('not legal advice').isVisible(), 'compose: terms carry the not-legal-advice note');
  await p.getByLabel('Payment schedule').selectOption('30-40-30');
  check(await p.locator('.comp-pay').count() === 3, 'compose: schedule preset');
  await audit(p, 'compose');
  if (OUT) await p.screenshot({ path: `${OUT}/compose.png`, fullPage: true });
  await p.getByRole('button', { name: 'Preview' }).click();
  check(await visible(p.locator('.comp-preview').getByRole('heading', { name: 'Terms' })), 'compose: preview shows the terms');
  await p.getByRole('button', { name: 'Create link for client' }).click();
  check(await visible(p.getByRole('heading', { name: 'Your link is ready' })), 'compose: link created');
  check(sealed && sealed.kind === 'agreement' && sealed.projectId === P && sealed.schedule.length === 3 && sealed.items.some((i) => i.kind === 'out') && sealed.sections.some((x) => x.heading === 'Terms' && /Governing law/.test(x.body)), 'compose: sealed payload (kind, project, schedule, lines, terms)');
  check(!sealed.items.find((i) => i.kind === 'out').price, 'compose: exclusions sent without a price');
  check(p.errors.length === 0, `compose: console ${p.errors.join(' | ') || 'clean'}`);
}

// Before the onboarding migration is applied: settings still save, without the new columns.
{
  const t2 = seed({ profile: { name: 'Mai', onboarded_at: undefined } });
  delete t2.profiles[0].country; delete t2.profiles[0].time_zone; delete t2.profiles[0].onboarded_at;
  t2._missing = ['country', 'time_zone', 'onboarded_at'];
  const p = await page(t2);
  await p.goto(BASE + '/app/settings');
  check(await visible(p.getByLabel('Business or studio name')) && new URL(p.url()).pathname === '/app/settings', 'no migration: no onboarding redirect');
  await p.getByLabel('Business or studio name').fill('Mai Studio');
  await p.getByRole('button', { name: 'Save settings' }).click();
  check(await visible(p.getByText('Settings saved')) && t2.profiles[0].business_name === 'Mai Studio' && !('country' in t2.profiles[0]), 'no migration: settings save without the new columns');
}

// Phone: detail page fits.
{
  const m = await page(t, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.goto(BASE + `/app/projects/${P}`);
  await m.getByRole('heading', { name: 'Lumen Café website' }).waitFor();
  check(await m.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'phone: project detail has no horizontal scroll');
  await audit(m, 'project detail phone');
  if (OUT) await m.screenshot({ path: `${OUT}/project-phone.png`, fullPage: true });
}
await b.close();
process.exit(failed ? 1 : 0);
