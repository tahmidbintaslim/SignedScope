// Regenerates docs/img/*.png against a running dev server (npm run dev). Needs playwright installed.
const { chromium } = require('playwright');
const out = require('path').join(__dirname, '..', 'docs', 'img');
require('fs').mkdirSync(out, { recursive: true });
const B = process.env.BASE || 'http://localhost:3000';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1200, height: 820 }, deviceScaleFactor: 2, recordVideo: { dir: '/tmp/signedscope-video', size: { width: 1200, height: 820 } } });
  const p = await ctx.newPage();
  const pause = (ms = 700) => p.waitForTimeout(ms);
  const shot = (n, full) => p.screenshot({ path: `${out}/${n}.png`, fullPage: !!full });

  await p.goto(B + '/'); await pause(3500); await shot('01-landing');
  // 1. Agency creates a sign-off
  await p.goto(B + '/new'); await pause();
  await p.fill('#title', 'Acme storefront: Phase 1');
  await p.fill('#client', 'Acme Co.');
  await p.fill('#agency', 'Northwind Studio');
  await p.fill('#agencyEmail', 'pm@northwind.studio');
  const rows = p.locator('#items .item input:not(.amt-in)');
  const textAt = (i) => p.locator('#items .item input:not(.amt-in)').nth(i);
  const priceAt = (i) => p.locator('#items .item .amt-in').nth(i);
  await rows.nth(0).type('Home, product and cart pages (responsive)', { delay: 15 });
  await p.click('#add-scope'); await textAt(3).type('Stripe checkout with Apple Pay', { delay: 15 });
  await rows.nth(1).type('Guest checkout completes in under 60 seconds', { delay: 15 });
  await p.click('#add-uat'); await textAt(4).type('Lighthouse performance score 90+ on mobile', { delay: 15 });
  await rows.nth(2).type('Blog and SEO content', { delay: 15 });
  await priceAt(0).fill('4200'); await priceAt(3).fill('900');
  await p.fill('#payLink', 'https://buy.stripe.com/test_example');
  await p.fill('#notes', 'Please review each item. Anything you reject comes back to us as a change.');
  await pause(); await shot('02-create', true);
  await p.click('button[type=submit]'); await p.waitForSelector('#done:not(.hidden)'); await pause(1000); await shot('03-link-ready');
  const signUrl = await p.inputValue('#link');

  // 2. Client reviews and signs
  await p.goto(signUrl); await p.waitForSelector('#doc:not(.hidden)'); await pause(1000);
  const radios = p.locator('#list .decide');
  const n = await radios.count();
  for (let i = 0; i < n; i++) {
    const r = radios.nth(i);
    const txt = await r.textContent();
    if (txt.includes('Apple Pay')) { await r.locator('input[value=rejected]').check(); await r.locator('input[data-note]').type('Apple Pay can wait until phase 2', { delay: 15 }); }
    else await r.locator('input[type=radio]').first().check();
    await pause(250);
  }
  await p.fill('#name', 'Jane Cooper'); await p.fill('#email', 'jane@acme.co'); await p.check('#agree');
  await pause(); await shot('04-client-review', true);
  await p.click('#f button[type=submit]'); await p.waitForSelector('#done:not(.hidden)'); await pause(800);
  const receiptUrl = await p.inputValue('#rlink');

  // 3. Receipt
  await p.goto(receiptUrl); await p.waitForSelector('#r:not(.hidden)'); await pause(1200); await shot('05-receipt', true);

  // 4. Change request with diff
  await p.click('#cr'); await p.waitForSelector('#cr-banner:not(.hidden)'); await pause(800);
  const items = p.locator('#items .item');
  for (let i = 0; i < await items.count(); i++) {
    const inp = items.nth(i).locator('input:not(.amt-in)');
    if ((await inp.inputValue()).includes('Apple Pay')) await inp.fill('Stripe checkout (cards only)');
  }
  await p.click('#add-scope'); await textAt(await items.count() - 1).type('Wishlist page', { delay: 15 }); await priceAt(await items.count() - 1).fill('480');
  await pause(); await shot('06-change-request', true);
  await p.click('#f button[type=submit]'); await p.waitForSelector('#done:not(.hidden)');
  const crUrl = await p.inputValue('#link');
  await p.goto(crUrl); await p.waitForSelector('#doc:not(.hidden)'); await pause(1500); await shot('07-client-diff', true);

  // 5. Verify, plus tamper detection
  await p.goto(B + '/verify'); await p.fill('#u', receiptUrl); await p.click('#f button'); await p.waitForSelector('#ok:not(.hidden)'); await pause(1200); await shot('08-verify');
  const [base, tok] = receiptUrl.split('#'); const [v, pl, sig] = tok.split('.');
  const o = JSON.parse(Buffer.from(pl, 'base64url')); o.signer.name = 'Someone Else';
  await p.fill('#u', base + '#' + [v, Buffer.from(JSON.stringify(o)).toString('base64url'), sig].join('.'));
  await p.click('#f button'); await p.waitForFunction(() => document.querySelector('#err').textContent.length > 0); await pause(1500); await shot('09-tampered');

  // Mobile view of the client page
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await m.goto(crUrl); await m.waitForSelector('#doc:not(.hidden)'); await m.waitForTimeout(600);
  await m.screenshot({ path: `${out}/10-mobile.png` });
  await ctx.close(); await b.close();
  console.log('ok');
})().catch((e) => { console.error(e); process.exit(1); });
