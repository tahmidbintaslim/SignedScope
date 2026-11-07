// Hero 3D stage (three.js, vendored in /vendor/three). Renders the real app screens from the CSS 3D
// fallback (#rig) as devices in WebGL: they fly in, tilt with the cursor, and flatten as you scroll.
// Skipped on small screens, Save-Data, reduced motion, or without WebGL; the CSS version stays.
const stage = document.getElementById('scene');
const canvas = document.getElementById('scene-gl');
const wide = matchMedia('(min-width: 761px)').matches;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection && navigator.connection.saveData;
const hasGL = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();

if (stage && canvas && wide && !calm && !saveData && hasGL) {
  import('/vendor/three/three.module.min.js').then(run).catch(() => { /* keep the CSS stage */ });
}

const S = 2; // texture pixels per CSS pixel
const FONT = '"Jakarta", system-ui, sans-serif';
const load = (src) => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });

function surface(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w * S; c.height = h * S;
  const g = c.getContext('2d'); g.scale(S, S); paint(g); return c;
}
function windowArt(img, w, title) {
  const bar = 30, h = Math.round(bar + (w * img.height) / img.width);
  return { w, h, canvas: surface(w, h, (g) => {
    g.save(); g.beginPath(); g.roundRect(0, 0, w, h, 14); g.clip();
    g.fillStyle = '#EEF0F6'; g.fillRect(0, 0, w, bar);
    ['#FF6159', '#FFBD2E', '#28C840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(18 + i * 16, bar / 2, 5, 0, 7); g.fill(); });
    g.fillStyle = '#6B7690'; g.font = `500 11px ${FONT}`; g.fillText(title, 74, bar / 2 + 4);
    g.drawImage(img, 0, bar, w, h - bar); g.restore();
  }) };
}
function phoneArt(img, w) {
  const pad = 9, h = Math.round((w - pad * 2) * (img.height / img.width) + pad * 2);
  return { w, h, canvas: surface(w, h, (g) => {
    g.fillStyle = '#0B1230'; g.beginPath(); g.roundRect(0, 0, w, h, 38); g.fill();
    g.save(); g.beginPath(); g.roundRect(pad, pad, w - pad * 2, h - pad * 2, 30); g.clip(); g.drawImage(img, pad, pad, w - pad * 2, h - pad * 2); g.restore();
  }) };
}
function chipArt(label, value, { fill = '#FFFFFF', color = '#0B1230', w = 240 } = {}) {
  const h = value ? 58 : 42;
  return { w, h, canvas: surface(w, h, (g) => {
    g.fillStyle = fill; g.beginPath(); g.roundRect(0, 0, w, h, 14); g.fill();
    if (value) { g.fillStyle = '#5A6480'; g.font = `500 12px ${FONT}`; g.fillText(label, 14, 22); g.fillStyle = color; g.font = `800 18px ${FONT}`; g.fillText(value, 14, 44); }
    else { g.fillStyle = color; g.font = `700 13px ${FONT}`; g.fillText(label, 16, 26); }
  }) };
}
function glow(THREE, color) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, color); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

async function run(THREE) {
  const src = (sel) => stage.querySelector(sel).currentSrc || stage.querySelector(sel).src;
  let main, back, phone;
  try {
    await document.fonts.load(`700 13px ${FONT}`).catch(() => {});
    [main, back, phone] = await Promise.all([load(src('.win.main img')), load(src('.win.back img')), load(src('.phone img'))]);
  } catch { return; }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const world = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(28, 1, 10, 8000);
  const rig = new THREE.Group(); world.add(rig);

  for (const [c, x, y, s] of [['rgba(124,58,237,0.7)', 0, -60, 1500], ['rgba(255,79,163,0.28)', 480, 120, 700], ['rgba(56,189,248,0.25)', -520, 80, 700]]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(THREE, c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.position.set(x, y, -500); sp.scale.set(s, s * 0.6, 1); world.add(sp);
  }
  const shadowTex = glow(THREE, 'rgba(3,1,20,0.7)');
  const aniso = renderer.capabilities.getMaxAnisotropy();
  function plane(art, pose) {
    const tex = new THREE.CanvasTexture(art.canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = aniso;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(art.w, art.h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(art.w * 1.15, art.h * 1.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    sh.position.set(0, -art.h * 0.06, -4); m.add(sh);
    m.userData = pose; rig.add(m); return m;
  }
  const W = 1100;
  const items = [
    plane(windowArt(back, 680, 'Agreement · Café Lumi'), { x: -360, y: 250, z: -300, ry: 0.22, from: [-500, 320, -900] }),
    plane(windowArt(main, W, 'signedscope.app/app'), { x: 0, y: 0, z: 0, ry: 0, from: [0, -120, -600] }),
    plane(phoneArt(phone, 236), { x: 470, y: -40, z: 160, ry: -0.24, from: [800, -60, 300] }),
    plane(chipArt('Estimate', '฿75,900 – ฿139,380', { w: 210 }), { x: -470, y: -150, z: 240, ry: 0.1, from: [-900, -160, 400], bob: 1 }),
    plane(chipArt('✓  Signed by Café Lumi', '', { fill: '#05744F', color: '#FFFFFF', w: 196 }), { x: 230, y: 330, z: 220, ry: -0.1, from: [420, 700, 300], bob: 2 }),
    plane(chipArt('Deposit ฿53,820', 'Paid', { w: 170 }), { x: 520, y: -170, z: 300, ry: -0.15, from: [900, -500, 300], bob: 3 }),
  ];

  const size = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    const fit = Math.min(1, (w * 0.8) / W);
    rig.scale.setScalar(fit);
    cam.position.set(0, 0, (h / 2) / Math.tan((cam.fov * Math.PI) / 360));
    cam.updateProjectionMatrix();
  };
  size(); new ResizeObserver(size).observe(canvas);

  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { ptr.tx = (e.clientX / innerWidth - 0.5) * 2; ptr.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  let visible = true, raf = 0; const t0 = performance.now();
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(frame); });
  const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);

  function frame(now) {
    raf = 0;
    const t = (now - t0) / 1000;
    const tilt = Number(getComputedStyle(stage).getPropertyValue('--tilt')) || 0; // 1 at the top, 0 once scrolled in
    items.forEach((m, i) => {
      const P = m.userData, k = ease((t - 0.15 * i) / 1.4), o = 1 - k;
      const bob = P.bob ? Math.sin(t * 1.1 + P.bob) * 8 : 0;
      m.position.set(P.x + (P.from[0] - P.x) * o, P.y + (P.from[1] - P.y) * o + bob, P.z + (P.from[2] - P.z) * o);
      m.rotation.y = P.ry * (0.4 + 0.6 * tilt);
      m.material.opacity = Math.min(1, k * 1.5);
    });
    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
    rig.rotation.x = -0.36 * tilt + ptr.y * 0.04;
    rig.rotation.y = ptr.x * 0.08;
    rig.position.y = 40 * tilt * rig.scale.x;
    renderer.render(world, cam);
    if (!stage.classList.contains('gl')) stage.classList.add('gl');
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
}
