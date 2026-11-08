// Browser check of /login, onboarding and the dashboard against a fake Supabase.
// Needs `npm run dev` (BASE, default http://localhost:5173).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { installFake, seed, USER } from './fake-supabase.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE || 'http://localhost:5173';
const OUT = process.env.OUT || '';
const b = await chromium.launch();
let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failed++; };
const visible = (loc, ms = 5000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);
const audit = async (p, name) => {
  await p.addScriptTag({ content: axe });
  const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`));
  check(v.length === 0, `${name}: axe ${v.join('; ') || 'clean'}`);
};
async function page(tables, opts = {}, ctxOpts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce', ...ctxOpts });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/React DevTools|HydrateFallback/.test(m.text())) p.errors.push(m.text()); });
  await installFake(p, tables, opts);
  return p;
}

// Signed out: /app sends you to /login and back.
{
  const p = await page(seed(), { signedIn: false });
  await p.goto(BASE + '/app/projects');
  await p.waitForURL('**/login?next=*');
  check(new URL(p.url()).searchParams.get('next') === '/app/projects', 'signed out: /app redirects to /login with next');
  check(await visible(p.getByRole('button', { name: 'Continue with Google' })), 'login: provider buttons');
  await audit(p, 'login');
  if (OUT) await p.screenshot({ path: `${OUT}/login.png` });
  await p.getByLabel('Work email').fill('mai@studio.test');
  await p.getByRole('button', { name: 'Email me a sign-in link' }).click();
  check(await visible(p.getByText('We sent a sign-in link to mai@studio.test')), 'login: email link sent');
  check(p.errors.length === 0, `login: console ${p.errors.join(' | ') || 'clean'}`);
}

// New account: onboarding runs once, saves each step and creates the first project.
{
  const t = seed();
  const p = await page(t);
  await p.goto(BASE + '/app');
  await p.waitForURL('**/app/welcome');
  check(await visible(p.getByRole('heading', { name: 'Welcome to SignedScope' })), 'onboarding: shown for a new account');
  await audit(p, 'onboarding');
  if (OUT) await p.screenshot({ path: `${OUT}/onboarding-1.png` });
  await p.getByLabel('Your name').fill('Mai Tanaka');
  await p.getByLabel('Business or studio name').fill('Mai Studio');
  await p.getByRole('button', { name: 'Continue' }).click();
  await p.getByRole('heading', { name: 'Where you work' }).waitFor();
  check(t.profiles[0].name === 'Mai Tanaka' && t.profiles[0].business_name === 'Mai Studio', 'onboarding: step 1 saved');
  await p.getByLabel('Country').selectOption('TH');
  await p.getByLabel('Default currency').selectOption('THB');
  if (OUT) await p.screenshot({ path: `${OUT}/onboarding-2.png` });
  await p.getByRole('button', { name: 'Continue' }).click();
  await p.getByRole('heading', { name: 'How you charge' }).waitFor();
  check(t.profiles[0].country === 'TH' && t.profiles[0].currency === 'THB' && t.profiles[0].time_zone === 'Asia/Bangkok', `onboarding: step 2 saved (country, currency, time zone ${t.profiles[0].time_zone})`);
  await p.getByLabel('Hourly rate (THB)').fill('900');
  await p.getByRole('button', { name: 'Continue' }).click();
  await p.getByRole('heading', { name: 'Your first project' }).waitFor();
  check(Number(t.profiles[0].hourly_rate) === 900, 'onboarding: step 3 saved');
  await p.getByLabel('Client name').fill('Lumen Café');
  await p.getByLabel('Project title').fill('Café website');
  await p.getByRole('button', { name: 'Go to my workspace' }).click();
  await p.waitForURL(/\/app$/);
  check(!!t.profiles[0].onboarded_at, 'onboarding: marked done');
  check(t.projects.length === 1 && t.clients.length === 1 && t.projects[0].client_id === t.clients[0].id && t.projects[0].currency === 'THB', 'onboarding: client and project created');
  check(await visible(p.getByRole('heading', { name: 'Hi, Mai' })), 'dashboard: greets by first name');
  check(await visible(p.getByRole('link', { name: 'Café website' })), 'dashboard: lists the new project');
  check(p.errors.length === 0, `onboarding: console ${p.errors.join(' | ') || 'clean'}`);
}

// Returning user: dashboard numbers, attention list, activity; old hash links; phone layout.
{
  const day = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
  const P = 'aaaaaaaa-0000-4000-8000-000000000001';
  const t = seed({
    profile: { name: 'Mai Tanaka', business_name: 'Mai Studio', onboarded_at: new Date().toISOString(), currency: 'THB', country: 'TH', time_zone: 'Asia/Bangkok' },
    clients: [{ id: 'c1', name: 'Lumen Café' }],
    projects: [{ id: P, client_id: 'c1', title: 'Lumen Café website', status: 'in_progress', currency: 'THB', updated_at: new Date().toISOString() }],
    documents: [{ id: 'd1', project_id: P, kind: 'change_request', title: 'Booking page', revision: 2, status: 'viewed', created_at: new Date().toISOString() }],
    payments: [
      { id: 'p1', project_id: P, label: 'Deposit', amount: 12000, currency: 'THB', status: 'requested', due_date: day(-3), created_at: new Date().toISOString() },
      { id: 'p2', project_id: P, label: 'Design', amount: 800, currency: 'USD', status: 'paid_manual', paid_at: new Date().toISOString(), created_at: new Date().toISOString() },
    ],
    activity: [{ id: 1, project_id: P, kind: 'document_signed', detail: { signer: 'Rafi', outcome: 'approved', title: 'Phase 1' }, created_at: new Date().toISOString() }],
  });
  const p = await page(t);
  await p.goto(BASE + `/app#/projects/${P}`);
  await p.waitForURL(`**/app/projects/${P}`);
  check(true, 'hash links: /app#/projects/<id> moves to /app/projects/<id>');
  await p.goto(BASE + '/app');
  await p.getByRole('heading', { name: 'Hi, Mai' }).waitFor();
  const kpis = await p.locator('.kpi').allInnerTexts();
  check(kpis[0].includes('1') && kpis[1].includes('1'), 'dashboard: active and waiting counts');
  check(/12,000/.test(kpis[2]) && /1 overdue/.test(kpis[2]), `dashboard: outstanding with overdue (${kpis[2].replace(/\n/g, ' ')})`);
  check(/\$800/.test(kpis[3]), 'dashboard: paid this month');
  check(await visible(p.getByRole('link', { name: /Overdue: Deposit/ })), 'dashboard: overdue payment needs attention');
  check(await visible(p.getByRole('link', { name: 'Opened, not signed: Booking page' })), 'dashboard: opened link needs attention');
  check(await visible(p.getByText('Rafi approved and signed “Phase 1”')), 'dashboard: activity text');
  await audit(p, 'dashboard');
  if (OUT) await p.screenshot({ path: `${OUT}/dashboard.png`, fullPage: true });
  // Sign out returns home.
  await p.locator('.app-side').getByRole('button', { name: 'Account' }).click();
  await p.getByRole('menuitem', { name: 'Sign out' }).click();
  await p.waitForURL((u) => u.pathname === '/', { waitUntil: 'commit' }).catch(() => {});
  await p.waitForLoadState('load');
  check(await p.evaluate(() => !localStorage.getItem('sb-test-auth-token')), 'sign out: session cleared');
  check(p.errors.length === 0, `dashboard: console ${p.errors.join(' | ') || 'clean'}`);

  const m = await page(t, {}, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.goto(BASE + '/app');
  await m.getByRole('heading', { name: 'Hi, Mai' }).waitFor();
  check(await m.locator('.app-tabs').isVisible() && !(await m.locator('.app-side').isVisible()), 'phone: tab bar instead of sidebar');
  check(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'phone: no horizontal scroll');
  await audit(m, 'dashboard phone');
  if (OUT) await m.screenshot({ path: `${OUT}/dashboard-phone.png`, fullPage: true });
}
await b.close();
process.exit(failed ? 1 : 0);
