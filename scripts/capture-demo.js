// Records the home page live demo to docs/img/demo.gif and renders the social image public/og.png.
// Needs a running dev server (BASE, default http://localhost:3000), Playwright and ffmpeg.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const B = process.env.BASE || 'http://localhost:3000';
const root = path.join(__dirname, '..');
const vidDir = fs.mkdtempSync('/tmp/signedscope-demo-');

(async () => {
  const b = await chromium.launch();

  // 1. Social preview: the hero at 1200x630.
  // Rendered at 1440x756 (the desktop layout) and scaled to 1200x630.
  const og = await b.newPage({ viewport: { width: 1440, height: 756 }, deviceScaleFactor: 1 });
  await og.goto(B + '/'); await og.waitForTimeout(3500);
  const raw = path.join(vidDir, 'og-raw.png');
  await og.screenshot({ path: raw });
  await og.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-vf', 'scale=1200:630:flags=lanczos', path.join(root, 'public', 'og.png')]);

  // 2. Demo recording: drag, price, approve, sign.
  const ctx = await b.newContext({ viewport: { width: 1200, height: 760 }, recordVideo: { dir: vidDir, size: { width: 1200, height: 760 } } });
  const p = await ctx.newPage();
  await p.goto(B + '/');
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  const stage = p.locator('#stage');
  await stage.evaluate((n) => window.scrollTo(0, n.getBoundingClientRect().top + scrollY - 40));
  await p.waitForTimeout(900);
  const a = await p.locator('#ask').boundingBox(), d = await p.locator('#drop').boundingBox();
  await p.mouse.move(a.x + 40, a.y + 24); await p.mouse.down();
  await p.mouse.move(d.x + d.width / 2, d.y + d.height / 2, { steps: 40 });
  await p.waitForTimeout(300); await p.mouse.up(); await p.waitForTimeout(700);
  const s = await p.locator('#price').boundingBox();
  await p.mouse.move(s.x + s.width * 0.32, s.y + s.height / 2); await p.mouse.down();
  await p.mouse.move(s.x + s.width * 0.4, s.y + s.height / 2, { steps: 20 }); await p.mouse.up();
  await p.waitForTimeout(600); await p.click('#send'); await p.waitForTimeout(800);
  await p.click('.opt[data-v=accepted]'); await p.waitForTimeout(700); await p.click('#to-sign'); await p.waitForTimeout(500);
  const c = await p.locator('#pad').boundingBox();
  await p.mouse.move(c.x + 40, c.y + 110); await p.mouse.down();
  for (let i = 0; i < 36; i++) await p.mouse.move(c.x + 40 + i * 8, c.y + 95 + Math.sin(i / 2.2) * 28);
  await p.mouse.up(); await p.waitForTimeout(400); await p.click('#sign'); await p.waitForTimeout(2200);
  await ctx.close();
  await b.close();

  const webm = fs.readdirSync(vidDir).find((f) => f.endsWith('.webm'));
  const src = path.join(vidDir, webm), gif = path.join(root, 'docs', 'img', 'demo.gif');
  const vf = 'fps=12,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=5';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '0.8', '-i', src, '-vf', vf, gif]);
  console.log('ok', fs.statSync(gif).size, 'bytes');
})().catch((e) => { console.error(e); process.exit(1); });
