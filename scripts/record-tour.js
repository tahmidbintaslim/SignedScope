// Records the home page product tour (public/media/tour.{webm,mp4}, tour-poster.jpg) from the real app,
// with the in-memory Supabase stand-in (test/fake-supabase.js) and sample data. AI is off, so the
// estimator shows its labelled sample estimate. Writes public/media/tour-chapters.json with the measured
// chapter times; captions (tour.*.vtt) are written from those times.
// Needs the dev server: SIGNING_SECRET=... PORT=3100 node scripts/dev-server.js
// Run: BASE=http://localhost:3100 node scripts/record-tour.js   (needs Playwright and ffmpeg)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const B = process.env.BASE || 'http://localhost:3100';
const root = path.join(__dirname, '..');
const media = path.join(root, 'public', 'media');
const fake = fs.readFileSync(path.join(root, 'test', 'fake-supabase.js'), 'utf8');
const tmp = fs.mkdtempSync('/tmp/signedscope-tour-');
const W = 1280, H = 720;

// A visible pointer, since headless recordings have none.
const cursor = `addEventListener('DOMContentLoaded', () => {
  const c = document.createElement('div');
  c.style.cssText = 'position:fixed;z-index:2147483647;left:0;top:0;width:22px;height:22px;margin:-4px 0 0 -4px;pointer-events:none;transition:transform .12s;background:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M4 2l16 10-7 1.5L9.5 21z%27 fill=%27%230B1230%27 stroke=%27white%27 stroke-width=%271.5%27/%3E%3C/svg%3E") 0 0/22px no-repeat';
  document.body.append(c);
  addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
  addEventListener('mousedown', () => { c.style.transform = 'scale(.8)'; }, true);
  addEventListener('mouseup', () => { c.style.transform = ''; }, true);
});`;

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: tmp, size: { width: W, height: H } } });
  await ctx.route('**/vendor/supabase-2.119.0.js', (r) => r.fulfill({ contentType: 'application/javascript', body: fake }));
  await ctx.route('**/api/config', (r) => r.fulfill({ json: { enabled: true, supabaseUrl: 'https://fake.supabase.co', supabaseAnonKey: 'anon' } }));
  await ctx.addInitScript(cursor);
  await ctx.addInitScript(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  const p = await ctx.newPage();
  const t0 = Date.now();
  const marks = {};
  const mark = (k) => { marks[k] = Math.max(0, (Date.now() - t0) / 1000 - 0.3); };
  const wait = (ms) => p.waitForTimeout(ms);
  let mx = W / 2, my = H / 2;
  async function moveTo(loc) {
    await loc.scrollIntoViewIfNeeded(); const bx = await loc.boundingBox();
    const x = bx.x + Math.min(bx.width / 2, 60), y = bx.y + bx.height / 2;
    await p.mouse.move(x, y, { steps: 18 }); mx = x; my = y;
  }
  async function click(sel) { const loc = typeof sel === 'string' ? p.locator(sel).first() : sel; await moveTo(loc); await wait(250); await loc.click(); await wait(400); }
  async function scrollBy(px, steps = 12) { for (let i = 0; i < steps; i++) { await p.mouse.wheel(0, px / steps); await wait(40); } }

  // Signed-in freelancer with an empty workspace.
  await p.goto(B + '/');
  await p.evaluate(() => { localStorage.clear(); const s = { tables: {}, user: null, factors: [], seq: 0 }; s.user = { id: '11111111-1111-4111-8111-111111111111', email: 'nok@studio.co' };
    s.tables.profiles = [{ id: s.user.id, email: s.user.email, name: 'Nok', currency: 'THB', lang: 'en', hourly_rate: 1200 }];
    s.tables.clients = [{ id: 'c1', owner: s.user.id, name: 'Café Lumi', email: 'owner@lumi.co', country: 'TH', created_at: new Date().toISOString() }];
    localStorage.setItem('__fakeDb', JSON.stringify(s)); });
  await p.goto(B + '/'); await wait(1200);

  // 1. Paste a brief on the home page.
  mark('brief');
  await moveTo(p.locator('#try-brief')); await wait(1500);
  await click('#try .go');

  // 2. Estimate (sample estimate while the AI is off).
  await p.waitForSelector('#out:not([hidden])', { timeout: 20000 });
  mark('estimate');
  await wait(1200); await scrollBy(500); await wait(1500); await scrollBy(600); await wait(1500);

  // 3. Save it into a new project for Café Lumi.
  mark('project');
  await p.locator('#save-in').scrollIntoViewIfNeeded();
  await click('#save-new'); await p.keyboard.type('Café Lumi website', { delay: 35 });
  await click('#save'); await p.waitForSelector('#saved-link:not(.hidden)'); await wait(600);
  await click('#saved-link'); await p.waitForSelector('text=New scope from estimate'); await wait(800);
  await moveTo(p.locator('select[aria-label="Client"]')); await p.selectOption('select[aria-label="Client"]', { label: 'Café Lumi' });
  await p.waitForSelector('#toast:not([hidden])'); await wait(700);
  await p.reload(); await p.waitForSelector('.head a:has-text("Café Lumi")'); await wait(700);
  const projectId = p.url().split('/').pop();

  // 4. Agreement from the composer: outline, terms, 50/50 schedule, preview, link.
  mark('agreement');
  await click('text=Proposal or agreement'); await p.waitForSelector('text=Written sections'); await wait(600);
  await moveTo(p.locator('[aria-label="Document type"]')); await p.selectOption('[aria-label="Document type"]', 'agreement'); await wait(1200);
  await scrollBy(700); await wait(1000);
  await click('text=Preview'); await p.waitForSelector('.comp-preview'); await wait(800); await scrollBy(600); await wait(1200);
  // The server files documents with the service key, which the in-memory stand-in has no part in;
  // seal for real, then file the document in the stand-in (same approach as test/browser/app.e2e.js).
  let deposit = 0;
  await p.route('**/api/seal', async (r) => {
    const body = r.request().postDataJSON();
    const sched = body.schedule || [];
    const total = sched.reduce((a, x) => a + Number(x.amount || 0), 0);
    deposit = sched.length ? Number(sched[0].amount) : 0;
    const real = await (await fetch(B + '/api/seal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, projectId: undefined }) })).json();
    await p.evaluate(([t, pid, kind, tot]) => { const s = window.__fakeDb; (s.tables.documents = s.tables.documents || []).push({ id: 'doc-1', owner: s.user.id, project_id: pid, kind, title: 'Café Lumi website', revision: 1, token: t, status: 'sent', total: tot, currency: 'THB', created_at: new Date().toISOString() }); localStorage.setItem('__fakeDb', JSON.stringify(s)); }, [real.token, projectId, body.kind || 'agreement', total]);
    r.fulfill({ json: { ...real, documentId: 'doc-1' }, headers: { 'x-filed': '1' } });
  });
  await click('text=Create link for client'); await p.waitForSelector('text=Your link is ready'); await wait(1200);
  const signUrl = await p.inputValue('.share input');

  // 5. The client opens the link, accepts each line and signs.
  mark('client');
  await p.goto(signUrl); await p.waitForSelector('#doc:not(.hidden)'); await wait(1200);
  await scrollBy(500); await wait(600);
  for (const r of await p.locator('#list input[type=radio][value=accepted], #list input[type=radio][value=acknowledged]').all()) { await click(r); }
  await click('#name'); await p.keyboard.type('Nok Chaiyaporn', { delay: 40 });
  await click('#email'); await p.keyboard.type('owner@lumi.co', { delay: 25 });
  await click('#agree');
  await click('#f button[type=submit]');
  await p.waitForSelector('#done:not(.hidden)', { timeout: 15000 }); await wait(2200);
  // In production the server records the signature on the project; mirror that in the stand-in.
  const receipt = (await p.inputValue('#rlink')).split('#')[1];
  await p.evaluate(([pid, rt]) => { const s = JSON.parse(localStorage.getItem('__fakeDb')); const d = s.tables.documents.find((x) => x.id === 'doc-1');
    Object.assign(d, { status: 'signed', signed_at: new Date().toISOString(), signer_name: 'Nok Chaiyaporn', receipt_token: rt });
    const pr = s.tables.projects.find((x) => x.id === pid); if (pr) pr.status = 'approved'; localStorage.setItem('__fakeDb', JSON.stringify(s)); }, [projectId, receipt]);

  // 6. Back in the workspace: payment request, marked paid.
  mark('payment');
  await p.goto(B + '/app#/projects/' + projectId);
  await p.waitForSelector('.sect:has(h2:text-is("Payments"))', { timeout: 8000 }).catch(async (e) => { await p.screenshot({ path: process.env.DBG || '/dev/null' }); console.log('url', p.url(), await p.evaluate(() => document.body.innerText.slice(0, 400))); throw e; });
  const pay = p.locator('.sect:has(h2:text-is("Payments"))');
  {
    await pay.scrollIntoViewIfNeeded(); await wait(500);
    await click(pay.locator('input').nth(0)); await p.keyboard.type('Deposit 50%', { delay: 30 });
    await click(pay.locator('input').nth(1)); await p.keyboard.type(String(Math.round(deposit) || 97980), { delay: 40 });
    await click(pay.locator('button', { hasText: 'Add request' })); await p.waitForSelector('text=Mark paid'); await wait(800);
    p.once('dialog', (d) => d.accept('PromptPay ref 7781'));
    await click('text=Mark paid'); await p.waitForSelector('text=Marked paid by you'); await wait(1500);
  }
  await p.goto(B + '/app'); await p.waitForSelector('.kpis'); await wait(2500);
  mark('end');

  const vid = await p.video().path();
  await ctx.close(); await b.close();
  fs.mkdirSync(media, { recursive: true });
  const ff = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a]);
  ff('-i', vid, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', '-an', path.join(media, 'tour.webm'));
  ff('-i', vid, '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(media, 'tour.mp4'));
  ff('-ss', String(marks.estimate + 3), '-i', vid, '-frames:v', '1', '-q:v', '4', path.join(media, 'tour-poster.jpg'));
  fs.writeFileSync(path.join(media, 'tour-chapters.json'), JSON.stringify(marks, null, 1) + '\n');
  require('./tour-captions').write(marks, media);
  console.log('chapters', marks);
})().catch((e) => { console.error(e); process.exit(1); });
