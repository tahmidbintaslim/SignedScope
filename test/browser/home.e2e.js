// Browser test of the home page (v5). Needs the dev server: SIGNING_SECRET=... PORT=3100 node scripts/dev-server.js
// Run: node test/browser/home.e2e.js   (BASE defaults to http://localhost:3100)
// Optional: AXE=/path/to/axe.min.js runs an axe-core scan and fails on serious or critical issues.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const B = process.env.BASE || 'http://localhost:3100';
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('  ok', m); };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  for (const [name, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', devices['iPhone 13']], ['reduced motion', { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }]]) {
    console.log(name);
    const ctx = await b.newContext(opts);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
    p.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/api/hit') && !(r.status() === 503 && r.url().endsWith('/api/estimate'))) errors.push(`${name}: ${r.status()} ${r.url()}`); });
    await p.goto(B + '/');
    await p.waitForTimeout(1500);
    ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'no horizontal scroll');
    ok((await p.inputValue('#try-brief')).includes('café'), 'sample brief filled in');

    // 3D: WebGL only on wide screens without reduced motion; the HTML layers stay otherwise.
    const gl = await p.evaluate(() => document.getElementById('scene').classList.contains('gl'));
    ok(name === 'desktop' ? gl : !gl, name === 'desktop' ? '3D scene running' : 'HTML fallback scene');

    // Mobile menu.
    if (name === 'mobile') {
      await p.click('#menu-btn'); ok(await p.isVisible('#nav a[href="#pricing"]'), 'menu opens');
      await p.click('#nav a[href="#pricing"]'); ok(!(await p.isVisible('#nav a[href="#how"]')), 'menu closes on link');
    }

    // Estimate demo: tabs and live price.
    await p.locator('#demo').scrollIntoViewIfNeeded();
    await p.click('#tab-mil'); ok(await p.isVisible('#p-mil') && !(await p.isVisible('#p-req')), 'tab switches panel');
    await p.focus('#tab-mil'); await p.keyboard.press('ArrowRight'); ok(await p.isVisible('#p-pri'), 'arrow keys move between tabs');
    await p.locator('#d-rate').fill('1000'); await p.locator('#d-buf').fill('10');
    ok((await p.textContent('#d-total')) === '฿156,200', 'total = 142 h × 1,000 × 1.10');

    // Client demo: the question line blocks signing until approved.
    await p.locator('#client').scrollIntoViewIfNeeded();
    await p.check('#sig-ok'); await p.click('#sign-btn');
    ok((await p.textContent('#sig-err')).includes('Approve every line'), 'cannot sign with an open question');
    await p.click('.lines .q button'); await p.click('#sign-btn');
    await p.waitForSelector('#signed-ok');
    ok((await p.textContent('#timeline')).includes('Signed by Nok Chaiyaporn'), 'timeline shows the signature');
    await p.waitForSelector('#pays .st.req'); ok(true, 'deposit becomes a payment request');
    await p.click('[data-doclang="th"]'); ok((await p.textContent('.lines')).includes('ระบบจองโต๊ะออนไลน์'), 'document switches to Thai');
    await p.click('#reset-doc'); ok(await p.isVisible('#sign-btn'), 'demo resets');

    // Video: poster, captions and chapter seek.
    ok(await p.evaluate(() => document.querySelectorAll('#tour-v track').length === 3), 'three caption tracks');
    await p.click('.chapters button[data-t="18"]');
    await p.waitForFunction(() => document.getElementById('tour-v').currentTime >= 17, null, { timeout: 15000 });
    ok(true, 'chapter seeks the video');

    if (process.env.AXE && name !== 'reduced motion') {
      await p.addScriptTag({ content: fs.readFileSync(process.env.AXE, 'utf8') });
      const res = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes[0].target.join(' ') })));
      res.forEach((v) => console.log('   axe', v.impact, v.id, v.n, v.t));
      ok(!res.some((v) => v.impact === 'serious' || v.impact === 'critical'), 'no serious axe issues');
    }

    // Hero hand-off: the brief opens /estimate and runs (sample estimate while the AI is off).
    await p.evaluate(() => scrollTo(0, 0));
    await p.click('[data-lang="th"]');
    await p.click('#try .go');
    await p.waitForURL('**/estimate?from=home');
    await p.waitForSelector('#out:not([hidden])', { timeout: 20000 });
    ok((await p.inputValue('#rate')) === '1200' && (await p.inputValue('#currency')) === 'THB', 'rate and currency carried over');
    ok((await p.evaluate(() => document.documentElement.lang)) === 'th', 'estimate language carried over');
    await ctx.close();
  }
  await b.close();
  if (errors.length) { console.error(errors); process.exit(1); }
  console.log('all good');
})().catch((e) => { console.error(e.message); process.exit(1); });
