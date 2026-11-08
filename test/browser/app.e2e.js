// Browser test of the workspace with an in-memory Supabase (test/fake-supabase.js).
// Needs the dev server: SIGNING_SECRET=... PORT=3100 node scripts/dev-server.js
// Run: node test/browser/app.e2e.js   (BASE defaults to http://localhost:3100)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const B = process.env.BASE || 'http://localhost:3100';
const fake = fs.readFileSync(path.join(__dirname, '..', 'fake-supabase.js'), 'utf8');
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('  ok', m); };

async function setup(ctx) {
  await ctx.route('**/vendor/supabase-2.119.0.js', (r) => r.fulfill({ contentType: 'application/javascript', body: fake }));
  await ctx.route('**/api/config', (r) => r.fulfill({ json: { enabled: true, supabaseUrl: 'https://fake.supabase.co', supabaseAnonKey: 'anon' } }));
}

(async () => {
  const b = await chromium.launch();
  const errors = [];
  for (const [name, opts] of [['desktop', { viewport: { width: 1280, height: 860 } }], ['mobile', devices['iPhone 13']]]) {
    console.log(name);
    const ctx = await b.newContext(opts);
    await setup(ctx);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));

    // Signed out: /app sends you to /login, which offers OAuth and an email link.
    await p.goto(B + '/app');
    await p.waitForURL('**/login?next=*');
    await p.fill('#email', 'nok@studio.co'); await p.click('#email-f button');
    ok(await p.isVisible('#step-sent'), 'email link sent screen');

    // Sign in (the fake has no email; set the user directly) and land on the dashboard.
    await p.evaluate(() => { const s = window.__fakeDb; s.user = { id: '11111111-1111-4111-8111-111111111111', email: 'nok@studio.co' }; s.tables.profiles = [{ id: s.user.id, email: s.user.email, name: 'Nok', currency: 'THB', lang: 'en' }]; localStorage.setItem('__fakeDb', JSON.stringify(s)); });
    await p.goto(B + '/app');
    await p.waitForSelector('.kpis');
    ok((await p.textContent('h1')).includes('Nok'), 'dashboard greets the user');
    ok((await p.textContent('.empty')).length > 0, 'empty state shown');

    // Client, then a project for them.
    await p.goto(B + '/app#/clients');
    await p.waitForSelector('form.card');
    await p.fill('form.card input >> nth=0', 'Café Lumi'); await p.fill('form.card input >> nth=2', 'owner@lumi.co');
    await p.click('form.card button[type=submit]');
    await p.waitForURL('**#/clients/*'); await p.waitForSelector('h1:has-text("Café Lumi")');
    ok(true, 'client created');
    await p.click('button:has-text("New project")');
    await p.fill('form.card >> nth=1 >> input >> nth=0', 'Lumi website');
    await p.click('button:has-text("Create project")');
    await p.waitForURL('**#/projects/*'); await p.waitForSelector('h1:has-text("Lumi website")');
    const projectId = p.url().split('/').pop();
    ok((await p.textContent('.head')).includes('Café Lumi'), 'project linked to client');

    // AI estimate (sample, AI off) saved into the project.
    await p.goto(B + '/estimate?project=' + projectId);
    await p.waitForSelector('#save-in:not([hidden])', { state: 'attached' });
    await p.click('#sample'); await p.click('#go'); await p.waitForSelector('#out:not([hidden])');
    ok(await p.inputValue('#save-project') === projectId, 'estimator preselects the project');
    await p.click('#save'); await p.waitForSelector('#saved-link:not(.hidden)');
    ok((await p.textContent('#save-ok')) === 'Saved', 'estimate saved');

    // Back in the project: estimate listed; new scope pre-filled from it.
    await p.goto(B + '/app#/projects/' + projectId);
    await p.waitForSelector('text=New scope from estimate');
    ok(await p.locator('.sect >> nth=0 >> tbody tr').count() === 1, 'estimate listed');
    // Simulate the server filing the document (covered for real in test/app.test.js).
    await p.route('**/api/seal', async (r) => {
      const body = r.request().postDataJSON();
      const real = await (await fetch(B + '/api/seal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, projectId: undefined }) })).json();
      r.fulfill({ json: { ...real, documentId: 'doc-1' }, headers: { 'x-filed': '1' } });
      await p.evaluate(([t, pid]) => { const s = window.__fakeDb; (s.tables.documents = s.tables.documents || []).push({ id: 'doc-1', owner: s.user.id, project_id: pid, kind: 'scope', title: 'Lumi website', revision: 1, token: t, status: 'viewed', total: 50000, currency: 'THB', created_at: new Date().toISOString() }); localStorage.setItem('__fakeDb', JSON.stringify(s)); }, [real.token, projectId]);
    });
    await p.click('text=New scope from estimate');
    await p.waitForURL('**/new?project=*'); await p.waitForSelector('#items .item');
    ok(await p.inputValue('#client') === 'Café Lumi', 'client name carried over');
    ok(await p.locator('#items .item').count() >= 6, 'feature lines carried over');
    await p.fill('#agency', 'Nok Studio'); await p.fill('#payInstructions', 'PromptPay 081-234-5678');
    await p.click('#f button[type=submit]'); await p.waitForSelector('#done:not(.hidden)');
    ok(await p.isVisible('#filed'), 'scope filed to the project');

    // Agreement from the composer: outline from the estimate, terms, schedule; the client sees it all.
    await p.goto(B + '/app#/projects/' + projectId);
    await p.click('text=Proposal or agreement'); await p.waitForSelector('text=Written sections');
    await p.selectOption('[aria-label="Document type"]', 'agreement');
    ok(await p.isChecked('#terms-on'), 'agreement turns terms on');
    ok((await p.inputValue('.comp-sec input >> nth=0')) === 'Parties', 'agreement outline');
    ok(await p.locator('.comp-pay').count() === 2, '50/50 schedule from the estimate total');
    await p.click('text=Preview'); await p.waitForSelector('.comp-preview');
    ok((await p.textContent('.comp-preview')).includes('Governing law'), 'preview shows the terms');
    let sealed;
    p.on('request', (r) => { if (r.url().endsWith('/api/seal')) sealed = r.postDataJSON(); });
    await p.click('text=Create link for client'); await p.waitForSelector('text=Your link is ready');
    ok(sealed.kind === 'agreement' && sealed.schedule.length === 2 && sealed.sections.some((x) => x.heading === 'Terms'), 'sealed as an agreement');
    const signUrl = await p.inputValue('.share input');
    const cp = await ctx.newPage(); await cp.goto(signUrl); await cp.waitForSelector('#doc:not(.hidden)');
    ok((await cp.textContent('#parts')).includes('Payment schedule') && (await cp.textContent('#parts')).includes('Electronic signature'), 'client sees sections, schedule and terms');
    ok((await cp.textContent('#agree-t')).includes('I agree to the terms'), 'agreement wording on the signature checkbox');
    await cp.close();

    // Payments: request a deposit, mark it paid.
    await p.goto(B + '/app#/projects/' + projectId);
    await p.waitForSelector('text=Copy client link');
    ok((await p.textContent('.sect >> nth=1')).includes('Viewed'), 'document status shows Viewed');
    const pay = p.locator('.sect >> nth=2');
    await pay.locator('input >> nth=0').fill('Deposit 30%'); await pay.locator('input >> nth=1').fill('15000');
    await pay.locator('button:has-text("Add request")').click();
    await p.waitForSelector('text=Mark paid');
    p.once('dialog', (d) => d.accept('KBank ref 7781'));
    await p.click('text=Mark paid');
    await p.waitForSelector('text=Marked paid by you');
    ok(true, 'payment marked paid manually');

    // Vault: upload, see it listed, share a 7-day link, delete.
    await p.setInputFiles('#vault-file', { name: 'Client brief (v2).pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') });
    await p.waitForSelector('text=Client_brief_v2_.pdf');
    ok(true, 'file uploaded with a safe name');
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: B }).catch(() => {});
    await p.click('text=Share link (7 days)');
    await p.waitForSelector('#toast:not([hidden])');
    ok(true, 'share link created');
    p.once('dialog', (d) => d.accept());
    await p.click('.sect:has(h2:text("Files")) >> text=Delete');
    await p.waitForSelector('text=Keep briefs, contracts');
    ok(true, 'file deleted');

    // Dashboard reflects it; activity recorded.
    await p.goto(B + '/app');
    await p.waitForSelector('.kpis');
    ok((await p.textContent('.kpis')).includes('15,000'), 'paid this month on dashboard');
    ok((await p.textContent('.feed >> nth=1')).includes('Marked paid'), 'activity feed');

    // Settings: save profile, turn on two-step sign-in.
    await p.goto(B + '/app#/settings');
    await p.waitForSelector('text=Set up authenticator app');
    await p.fill('textarea', 'PromptPay 081-234-5678');
    await p.check('text=a client opens a link');
    await p.click('text=Save settings'); await p.waitForSelector('#toast:not([hidden])');
    ok(await p.evaluate(() => { const pr = window.__fakeDb.tables.profiles[0]; return pr.notify_viewed === true && pr.notify_signed === true; }), 'notification settings saved');
    await p.click('text=Set up authenticator app'); await p.waitForSelector('img.qr');
    await p.fill('input[autocomplete=one-time-code]', '123456'); await p.click('text=Verify and turn on');
    await p.waitForSelector('text=An authenticator app code is required');
    ok(true, 'MFA enrolled');

    // Next sign-in needs the code.
    await p.evaluate(() => { const s = window.__fakeDb; s.aal = 'aal1'; localStorage.setItem('__fakeDb', JSON.stringify(s)); });
    await p.goto(B + '/app');
    await p.waitForURL('**/login?next=*'); await p.waitForSelector('#step-mfa:not([hidden])');
    await p.fill('#code', '000000'); await p.click('#mfa-f button'); await p.waitForTimeout(600); console.log('   err:', JSON.stringify(await p.textContent('#err')), p.url());
    ok((await p.textContent('#err')).includes('Invalid'), 'wrong code refused');
    await p.fill('#code', '123456'); await p.click('#mfa-f button');
    await p.waitForURL('**/app'); await p.waitForSelector('.kpis');
    ok(true, 'code accepted, back in the workspace');
    ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'no horizontal scroll');

    // ?next= only ever leads to a page on this site.
    await p.goto(B + '/login?next=/%5Cevil.example/x'); await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 5000 });
    ok(new URL(p.url()).origin === new URL(B).origin, 'login next cannot leave the site');
    if (process.env.SHOTS) await p.screenshot({ path: path.join(process.env.SHOTS, `app-${name}.png`), fullPage: true });
    await ctx.close();
  }
  await b.close();
  if (errors.length) { console.error(errors); process.exit(1); }
  console.log('all good');
})().catch((e) => { console.error(e.message); process.exit(1); });
