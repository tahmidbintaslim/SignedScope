// Hero 3D scene (three.js, vendored in /vendor/three). The HTML layers in #scene are the fallback and
// stay in the page for screen readers; this draws the same four layers as textured planes in WebGL.
// Skipped on small screens, Save-Data, reduced motion, or when WebGL is unavailable.
const scene = document.getElementById('scene');
const canvas = document.getElementById('scene-gl');
const wide = matchMedia('(min-width: 761px)').matches;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection && navigator.connection.saveData;
const hasGL = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();

if (scene && canvas && wide && !calm && !saveData && hasGL) {
  const start = () => import('/vendor/three/three.module.min.js').then(run).catch(() => { /* keep the HTML layers */ });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); start(); } });
    io.observe(scene);
  } else start();
}

// ---------- 2D card art, drawn once into canvases used as textures ----------
const C = { ink: '#0B1230', ink2: '#4A5672', muted: '#6B7690', line: '#E3E8F2', mist: '#F5F7FC', violet: '#7C3AED', mint: '#05744F', mintSoft: '#E3F8F1', sky: '#38BDF8', white: '#FFFFFF' };
const S = 3; // texture pixels per CSS pixel
const FONT = '"Jakarta", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';

function cardCanvas(w, h, draw, { r = 16, fill = C.white } = {}) {
  const c = document.createElement('canvas');
  c.width = w * S; c.height = h * S;
  const g = c.getContext('2d');
  g.scale(S, S);
  g.fillStyle = fill; g.beginPath(); g.roundRect(0, 0, w, h, r); g.fill();
  draw(g);
  return c;
}
const text = (g, s, x, y, { size = 13, weight = 600, color = C.ink, font = FONT, ls = 0 } = {}) => {
  g.font = `${weight} ${size}px ${font}`; g.fillStyle = color;
  if ('letterSpacing' in g) g.letterSpacing = `${ls}px`;
  g.fillText(s, x, y);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
};
const pill = (g, x, y, w, h, fill) => { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.fill(); };
const tag = (g, s, x, y, nf) => { pill(g, x, y - 13, 44, 18, nf ? C.mintSoft : C.mist); text(g, s, x + 6, y, { size: 10, weight: 500, color: nf ? C.mint : C.violet, font: MONO }); };

const LAYERS = [
  { w: 250, h: 170, draw: (g) => {
    g.strokeStyle = C.muted; g.lineWidth = 1.6; g.strokeRect(18, 18, 12, 15);
    text(g, 'Client brief', 40, 31, { weight: 700, color: C.ink2 });
    [210, 190, 214, 150, 200, 120].forEach((w, i) => pill(g, 18, 50 + i * 18, w, 8, C.line));
  } },
  { w: 300, h: 214, draw: (g) => {
    text(g, 'REQUIREMENTS', 18, 30, { size: 11, weight: 800, color: C.violet, ls: 1 });
    [['FR-1', 'Online table booking'], ['FR-2', 'Deposit by PromptPay'], ['FR-3', 'LINE reminder'], ['NFR-1', 'Thai and English'], ['NFR-2', 'Loads under 2 s on 4G']]
      .forEach(([id, s], i) => { const y = 62 + i * 31; tag(g, id, 18, y, id.startsWith('N')); text(g, s, 72, y, { size: 13, weight: 600 }); });
  } },
  { w: 320, h: 196, draw: (g) => {
    text(g, 'TIMELINE AND PRICE', 18, 30, { size: 11, weight: 800, color: C.violet, ls: 1 });
    [[120, C.sky, 'Design · 2 wk'], [200, C.violet, 'Build · 4 wk'], [70, '#0E9F6E', 'Launch · 1 wk']]
      .forEach(([w, c, s], i) => { const y = 48 + i * 24; pill(g, 18, y, w, 10, c); text(g, s, 26 + w, y + 9, { size: 11, weight: 500, color: C.ink2 }); });
    text(g, '142 h × ฿1,200 + 15%', 18, 168, { size: 12, weight: 400, color: C.muted, font: MONO });
    g.textAlign = 'right'; text(g, '฿195,960', 302, 172, { size: 24, weight: 800 }); g.textAlign = 'left';
  } },
  { w: 230, h: 40, opts: { r: 20, fill: C.mint }, draw: (g) => {
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath();
    g.moveTo(16, 25); g.bezierCurveTo(20, 25, 21, 15, 24, 15); g.bezierCurveTo(27, 15, 24, 25, 28, 25); g.stroke();
    text(g, 'Signed by Café Lumi · 6 Nov', 40, 25, { size: 13, weight: 700, color: '#fff' });
  } },
];
// Assembled (x, y in CSS px from scene centre; z depth; rot in degrees) and exploded offsets.
const POSE = [
  { x: -180, y: 170, z: -60, rot: 6, ex: [-140, 120, -260] },
  { x: 40, y: 40, z: 0, rot: -3, ex: [-40, 60, -120] },
  { x: 140, y: -140, z: 60, rot: 2, ex: [120, -60, 80] },
  { x: 150, y: -265, z: 120, rot: -4, ex: [180, -120, 220] },
];

function glowTexture(THREE, color) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, color); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

async function run(THREE) {
  try { await Promise.all([document.fonts.load(`600 13px ${FONT}`), document.fonts.load(`800 24px ${FONT}`), document.fonts.load(`400 12px ${MONO}`)]); } catch { /* draw with fallback fonts */ }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const world = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 10, 5000);
  const group = new THREE.Group(); world.add(group);

  // soft glows
  for (const [col, x, y, s] of [['rgba(124,58,237,0.65)', -80, 80, 760], ['rgba(255,79,163,0.35)', 160, -140, 560], ['rgba(56,189,248,0.3)', -260, -200, 420]]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(THREE, col), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.position.set(x, y, -300); sp.scale.set(s, s, 1); world.add(sp);
  }
  // floor grid
  const grid = new THREE.GridHelper(1400, 20, 0xffffff, 0xffffff);
  grid.material.transparent = true; grid.material.opacity = 0.07;
  grid.position.set(0, -330, -200); world.add(grid);

  const planes = LAYERS.map((L, i) => {
    const tex = new THREE.CanvasTexture(cardCanvas(L.w, L.h, L.draw, L.opts));
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    // shadow card behind each layer
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(L.w + 30, L.h + 30), new THREE.MeshBasicMaterial({ map: glowTexture(THREE, 'rgba(5,2,25,0.55)'), transparent: true, depthWrite: false }));
    sh.position.set(0, -18, -6); m.add(sh);
    m.userData = POSE[i]; group.add(m); return m;
  });

  const size = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    cam.position.z = (h / 2) / Math.tan((cam.fov * Math.PI) / 360) * 1.12; // ~1 CSS px per unit at z=0
    cam.updateProjectionMatrix();
  };
  size(); new ResizeObserver(size).observe(canvas);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { pointer.tx = (e.clientX / innerWidth - 0.5) * 2; pointer.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });

  let visible = true, t0 = performance.now(), raf = 0;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(scene);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(frame); });
  const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);

  function frame(now) {
    raf = 0;
    const t = (now - t0) / 1000;
    const build = ease((t - 0.2) / 1.6); // layers fly in and assemble
    const rect = scene.getBoundingClientRect();
    const spread = Math.min(1, Math.max(0, -rect.top / rect.height)) * 0.8; // scrolling away opens them up again
    const open = Math.max(1 - build, spread);
    planes.forEach((p, i) => {
      const P = p.userData, f = Math.sin(t * 0.9 + i * 1.7) * 6;
      p.position.set(P.x + P.ex[0] * open, P.y + P.ex[1] * open + f, P.z + P.ex[2] * open);
      p.rotation.z = THREE.MathUtils.degToRad(P.rot * (1 + open));
      p.material.opacity = Math.min(1, build * 1.4 + 0.05 * i);
    });
    pointer.x += (pointer.tx - pointer.x) * 0.06; pointer.y += (pointer.ty - pointer.y) * 0.06;
    group.rotation.y = -0.35 + pointer.x * 0.18;
    group.rotation.x = 0.12 + pointer.y * 0.1;
    renderer.render(world, cam);
    if (!scene.classList.contains('gl')) scene.classList.add('gl');
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
}
