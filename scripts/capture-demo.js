// Renders the social image public/og.png from the home page hero, and docs/img/demo.gif from the
// product tour (run scripts/record-tour.js first). Needs a running dev server (BASE, default
// http://localhost:3000), Playwright and ffmpeg.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const B = process.env.BASE || 'http://localhost:3000';
const root = path.join(__dirname, '..');
const tmp = fs.mkdtempSync('/tmp/signedscope-og-');

(async () => {
  // Social preview: the hero at 1440x756 (desktop layout, 3D scene on), scaled to 1200x630.
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const og = await b.newPage({ viewport: { width: 1440, height: 756 }, deviceScaleFactor: 1 });
  await og.goto(B + '/'); await og.waitForTimeout(3500);
  const raw = path.join(tmp, 'og-raw.png');
  await og.screenshot({ path: raw });
  await b.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-vf', 'scale=1200:630:flags=lanczos', path.join(root, 'public', 'og.png')]);

  // README GIF: the first 30 seconds of the tour (brief, estimate, project, agreement).
  const tour = path.join(root, 'public', 'media', 'tour.mp4');
  if (!fs.existsSync(tour)) { console.log('no tour.mp4 yet: run scripts/record-tour.js for the GIF'); return; }
  const gif = path.join(root, 'docs', 'img', 'demo.gif');
  const vf = 'fps=6,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=bayer:bayer_scale=5';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1', '-t', '28', '-i', tour, '-vf', vf, gif]);
  console.log('ok', fs.statSync(gif).size, 'bytes');
})().catch((e) => { console.error(e); process.exit(1); });
