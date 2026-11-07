// Captures the product screens used on the home page (public/media/screens/*.webp) from the real app,
// with the in-memory Supabase stand-in and sample data, and cuts short looping clips from the tour.
// Needs the dev server (BASE, default http://localhost:3100), Playwright and ffmpeg.
// Run scripts/record-tour.js first for the clips.
const { chromium, devices } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const B = process.env.BASE || 'http://localhost:3100';
const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'media', 'screens');
const clips = path.join(root, 'public', 'media', 'clips');
const fake = fs.readFileSync(path.join(root, 'test', 'fake-supabase.js'), 'utf8');
const tmp = fs.mkdtempSync('/tmp/signedscope-media-');
const ff = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a]);
const webp = (png, name, width) => ff('-i', png, '-vf', `scale=${width}:-1:flags=lanczos`, '-c:v', 'libwebp', '-quality', '82', path.join(out, name + '.webp'));

async function stub(ctx) {
  await ctx.route('**/vendor/supabase-2.119.0.js', (r) => r.fulfill({ contentType: 'application/javascript', body: fake }));
  await ctx.route('**/api/config', (r) => r.fulfill({ json: { enabled: true, supabaseUrl: 'https://fake.supabase.co', supabaseAnonKey: 'anon' } }));
  await ctx.addInitScript(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '#toast{display:none!important}'; document.head.append(st); });
  });
}
const SEED = () => {
  localStorage.clear();
  const s = { tables: {}, user: { id: '11111111-1111-4111-8111-111111111111', email: 'nok@studio.co' }, factors: [], seq: 0 };
  s.tables.profiles = [{ id: s.user.id, email: s.user.email, name: 'Nok', currency: 'THB', lang: 'en', hourly_rate: 1200 }];
  s.tables.clients = [{ id: 'c1', owner: s.user.id, name: 'Café Lumi', email: 'owner@lumi.co', country: 'TH', created_at: new Date().toISOString() }];
  localStorage.setItem('__fakeDb', JSON.stringify(s));
};

(async () => {
  fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(clips, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await stub(ctx);
  const p = await ctx.newPage();
  const shot = async (name, width = 2400) => { await p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; }); const f = path.join(tmp, name + '.png'); await p.screenshot({ path: f }); webp(f, name, width); };
  await p.goto(B + '/estimate'); await p.evaluate(SEED);

  // Estimate (sample brief; the AI is off, so the labelled sample estimate shows).
  await p.evaluate(() => sessionStorage.setItem('ss-home-brief', JSON.stringify({ brief: SAMPLE_BRIEF, rate: 1200, buffer: 15, currency: 'THB', lang: 'en' })));
  await p.goto(B + '/estimate?from=home'); await p.waitForSelector('#out:not([hidden])');
  await p.evaluate(() => { document.getElementById('sample-note').classList.add('hidden'); window.scrollTo(0, document.getElementById('sum').getBoundingClientRect().top + scrollY - 24); });
  await p.waitForTimeout(400); await shot('estimate');

  // Save into a project for Café Lumi.
  await p.locator('#save-in').scrollIntoViewIfNeeded();
  await p.fill('#save-new', 'Café Lumi website'); await p.click('#save'); await p.waitForSelector('#saved-link:not(.hidden)');
  await p.click('#saved-link'); await p.waitForSelector('text=New scope from estimate');
  await p.selectOption('select[aria-label="Client"]', { label: 'Café Lumi' }); await p.waitForSelector('#toast:not([hidden])');
  const projectId = p.url().split('/').pop();

  // Agreement in the composer.
  await p.goto(B + '/app#/projects/' + projectId + '/compose'); await p.waitForSelector('text=Written sections');
  await p.selectOption('[aria-label="Document type"]', 'agreement'); await p.waitForTimeout(500);
  await shot('composer');
  await p.click('text=Preview'); await p.waitForSelector('.comp-preview');
  await p.locator('.comp-preview').evaluate((n) => window.scrollTo(0, n.getBoundingClientRect().top + scrollY - 24)); await p.waitForTimeout(300);
  await shot('agreement');
  let deposit = 0;
  await p.route('**/api/seal', async (r) => {
    const body = r.request().postDataJSON(); const sched = body.schedule || [];
    deposit = sched.length ? Number(sched[0].amount) : 0;
    const real = await (await fetch(B + '/api/seal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, projectId: undefined }) })).json();
    await p.evaluate(([t, pid, tot]) => { const s = window.__fakeDb; (s.tables.documents = s.tables.documents || []).push({ id: 'doc-1', owner: s.user.id, project_id: pid, kind: 'agreement', title: 'Café Lumi website', revision: 1, token: t, status: 'sent', total: tot, currency: 'THB', created_at: new Date().toISOString() }); localStorage.setItem('__fakeDb', JSON.stringify(s)); }, [real.token, projectId, sched.reduce((a, x) => a + Number(x.amount || 0), 0)]);
    r.fulfill({ json: { ...real, documentId: 'doc-1' }, headers: { 'x-filed': '1' } });
  });
  await p.click('text=Create link for client'); await p.waitForSelector('text=Your link is ready');
  const signUrl = await p.inputValue('.share input');

  // The client on a phone: review, then signed.
  const mob = await b.newContext({ ...devices['iPhone 13'] }); const m = await mob.newPage();
  const mshot = async (name) => { const f = path.join(tmp, name + '.png'); await m.screenshot({ path: f }); webp(f, name, 780); };
  await m.goto(signUrl); await m.waitForSelector('#doc:not(.hidden)'); await m.waitForTimeout(300);
  await mshot('phone-review');
  for (const r of await m.locator('#list input[type=radio][value=accepted], #list input[type=radio][value=acknowledged]').all()) await r.check();
  await m.locator('#name').scrollIntoViewIfNeeded(); await m.fill('#name', 'Nok Chaiyaporn'); await m.fill('#email', 'owner@lumi.co'); await m.check('#agree');
  await m.waitForTimeout(200); await mshot('phone-sign');
  await m.click('#f button[type=submit]'); await m.waitForSelector('#done:not(.hidden)'); await m.evaluate(() => scrollTo(0, 0)); await m.waitForTimeout(300);
  await mshot('phone-signed');
  const receipt = (await m.inputValue('#rlink')).split('#')[1];
  await m.goto(B + '/receipt#' + receipt); await m.waitForTimeout(1200); await mshot('phone-receipt');
  await mob.close();

  // Back in the workspace: signed, deposit requested and paid, dashboard.
  // In production the server records the signature; mirror that in the stand-in, then reload.
  await p.evaluate(([pid, rt]) => { const s = window.__fakeDb; Object.assign(s.tables.documents[0], { status: 'signed', signed_at: new Date().toISOString(), signer_name: 'Nok Chaiyaporn', receipt_token: rt });
    s.tables.projects.find((x) => x.id === pid).status = 'approved'; localStorage.setItem('__fakeDb', JSON.stringify(s)); }, [projectId, receipt]);
  await p.goto(B + '/app#/projects/' + projectId); await p.reload(); await p.waitForSelector('.sect:has(h2:text-is("Payments"))');
  const pay = p.locator('.sect:has(h2:text-is("Payments"))');
  await pay.locator('input').nth(0).fill('Deposit 50%'); await pay.locator('input').nth(1).fill(String(Math.round(deposit) || 97980));
  await pay.locator('button', { hasText: 'Add request' }).click(); await p.waitForSelector('text=Mark paid');
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300); await shot('project');
  p.once('dialog', (d) => d.accept('PromptPay ref 7781')); await p.click('text=Mark paid'); await p.waitForSelector('text=Marked paid by you');
  await p.goto(B + '/app#/'); await p.reload(); await p.waitForSelector('.kpis'); await p.waitForTimeout(400); await shot('dashboard');
  await b.close();

  // Short loops cut from the tour (scripts/record-tour.js writes tour.mp4 and tour-chapters.json).
  const tour = path.join(root, 'public', 'media', 'tour.mp4');
  if (fs.existsSync(tour)) {
    const c = JSON.parse(fs.readFileSync(path.join(root, 'public', 'media', 'tour-chapters.json'), 'utf8'));
    const cut = (name, from, to, speed = 1) => {
      const vf = `setpts=PTS/${speed},scale=1120:-2:flags=lanczos`;
      ff('-ss', String(from), '-to', String(to), '-i', tour, '-vf', vf, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '40', '-row-mt', '1', path.join(clips, name + '.webm'));
      ff('-ss', String(from), '-to', String(to), '-i', tour, '-vf', vf, '-an', '-c:v', 'libx264', '-crf', '30', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(clips, name + '.mp4'));
      ff('-ss', String(from + 0.5), '-i', tour, '-frames:v', '1', '-vf', 'scale=1120:-2', '-c:v', 'libwebp', '-quality', '80', path.join(clips, name + '.webp'));
    };
    cut('estimate', c.estimate - 0.2, c.project, 1);
    cut('agreement', c.agreement, c.client, 1.2);
    cut('sign', c.client, c.payment, 1.6);
    cut('pay', c.payment, c.end, 1.2);
  }
  console.log('done', fs.readdirSync(out), fs.readdirSync(clips));
})().catch((e) => { console.error(e); process.exit(1); });
