'use strict';
// Home page motion and the live demo. Everything runs locally; nothing is sent to the server.
document.documentElement.classList.add('js');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const usd = (n) => money(n, 'USD');
const BASE = 6000;

// Count a number up inside an element.
function countTo(node, to, { from = 0, ms = 800, fmt = usd } = {}) {
  if (reduced) { node.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    node.textContent = fmt(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
// Run fn once when node scrolls into view.
function onView(node, fn, threshold = 0.3) {
  if (!node) return;
  if (!('IntersectionObserver' in window)) return fn();
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { threshold });
  io.observe(node);
}
// Tighten heading periods: wrap each '.' that follows a letter in h1/h2 text nodes.
for (const h of document.querySelectorAll('h1, h2')) {
  const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const t of nodes) {
    const parts = t.nodeValue.split(/(?<=\w)(\.)/);
    if (parts.length < 2) continue;
    t.replaceWith(...parts.map((x) => (x === '.' ? el('span', { class: 'kp', text: '.' }) : document.createTextNode(x))));
  }
}
const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));

/* ---------- Hero: lines get approved, then the change and Pay chips land ---------- */
(async function hero() {
  const items = [...document.querySelectorAll('#plist li')];
  const chips = [...document.querySelectorAll('.hero .chip')];
  await wait(500);
  for (const li of items) { li.classList.add('on'); await wait(380); }
  for (const c of chips) { c.classList.add('in'); await wait(450); }
})();

// Gentle parallax on pointer move (desktop only).
(function parallax() {
  const art = document.getElementById('hero-art');
  if (!art || reduced || !matchMedia('(pointer: fine)').matches) return;
  const layers = [...art.querySelectorAll('[data-depth]')].map((n) => ({ n, d: Number(n.dataset.depth), r: getComputedStyle(n).transform }));
  let raf = 0;
  window.addEventListener('pointermove', (e) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      for (const { n, d, r } of layers) n.style.transform = `translate3d(${(-x * d).toFixed(1)}px, ${(-y * d).toFixed(1)}px, 0) ${r === 'none' ? '' : r}`;
    });
  }, { passive: true });
})();

/* ---------- Problem: the asks stack up and the total climbs ---------- */
(function problem() {
  const rows = [...document.querySelectorAll('.ask-row')];
  const leak = document.getElementById('leak');
  onView(document.getElementById('asks'), async () => {
    let total = 0;
    leak.textContent = usd(0);
    for (const r of rows) {
      r.classList.add('in');
      const c = Number(r.dataset.cost);
      countTo(leak, total + c, { from: total, ms: 500 });
      total += c;
      await wait(420);
    }
  });
})();

/* ---------- Scroll reveals, stat count-up, signature draw ---------- */
document.querySelectorAll('.sec h2, .s3, .tile, .mphone, .plan, .cta-band').forEach((n, i) => {
  n.classList.add('reveal');
  n.style.transitionDelay = `${(i % 3) * 90}ms`;
  onView(n, () => n.classList.add('in'), 0.15);
});
document.querySelectorAll('.stat b[data-count]').forEach((b) => onView(b, () => countTo(b, Number(b.dataset.count), { ms: 1100, fmt: (n) => `${n}%` })));
document.querySelectorAll('.sig').forEach((s) => onView(s, () => s.classList.add('in')));

/* ---------- Live demo ---------- */
const $id = (id) => document.getElementById(id);
const demo = {
  step: 1, price: 480, decision: null, inked: 0,
  show(n) {
    this.step = n;
    document.querySelectorAll('.pstep').forEach((p) => { p.hidden = Number(p.dataset.step) !== n; });
    const idx = Math.min(n, 4);
    [...$id('stepper').children].forEach((li, i) => { li.classList.toggle('on', i + 1 === idx && n < 5); li.classList.toggle('done', i + 1 < idx || n === 5); });
    const pill = $id('doc-pill');
    pill.textContent = n === 1 ? 'Signed · revision 1' : n === 5 ? 'Signed · revision 2' : 'Revision 2 · waiting for client';
    pill.className = 'pill ' + (n === 1 || n === 5 ? 'ok' : 'chg');
    $id('drop').classList.toggle('gone', n !== 1);
  },
  line() { return document.querySelector('#lines .added'); },
  totals() {
    const added = this.step === 1 || this.decision === 'rejected' ? 0 : this.price;
    $id('total-label').textContent = this.step === 1 ? 'Signed total' : this.decision ? 'Revision 2 total' : 'Total if approved';
    $id('d-total').textContent = usd(BASE + added);
    $id('d-total').style.color = this.decision === 'accepted' ? 'var(--mint)' : '';
  },
  commit() {
    if (this.step !== 1) return;
    const li = el('li', { class: 'added pending' }, el('span', {}, el('span', { class: 'pill chg', text: 'Added' }), ' Apple Pay at checkout'), el('span', { class: 'amt', id: 'l-price', text: '+' + usd(this.price) }));
    $id('lines').append(li);
    this.show(2); this.totals();
    $id('price').focus({ preventScroll: true });
  },
  reset() {
    const a = this.line(); if (a) a.remove();
    $id('stamp-slot').textContent = '';
    Object.assign(this, { price: 480, decision: null, inked: 0 });
    $id('price').value = 480; $id('price-out').textContent = usd(480);
    document.querySelectorAll('.opt').forEach((o) => o.setAttribute('aria-checked', 'false'));
    $id('reason').value = ''; $id('reason').classList.add('hidden');
    $id('to-sign').disabled = true; clearPad();
    this.show(1); this.totals();
  },
};

// Step 1: drag the ask onto the document, or press Enter, or tap it.
(function drag() {
  const ask = $id('ask'), doc = $id('doc'), drop = $id('drop');
  let ghost = null, start = null, over = false;
  const inside = (x, y) => { const r = doc.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
  ask.addEventListener('pointerdown', (e) => { if (demo.step !== 1) return; start = { x: e.clientX, y: e.clientY, r: ask.getBoundingClientRect() }; ask.setPointerCapture(e.pointerId); });
  ask.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!ghost && Math.hypot(dx, dy) > 6) {
      ghost = ask.cloneNode(true); ghost.removeAttribute('id'); ghost.classList.add('lift');
      ghost.style.setProperty('--w', start.r.width + 'px');
      document.body.append(ghost); ask.style.opacity = '.3';
    }
    if (ghost) { ghost.style.left = start.r.left + dx + 'px'; ghost.style.top = start.r.top + dy + 'px'; over = inside(e.clientX, e.clientY); drop.classList.toggle('over', over); }
  });
  const end = () => {
    if (!start) return;
    const dropped = ghost ? over : true;
    if (ghost) ghost.remove();
    ghost = null; start = null; over = false; ask.style.opacity = ''; drop.classList.remove('over');
    if (dropped) demo.commit();
  };
  ask.addEventListener('pointerup', end);
  ask.addEventListener('pointercancel', () => { start = null; end(); });
  ask.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); demo.commit(); } });
})();

// Step 2: set the price.
$id('price').addEventListener('input', (e) => {
  demo.price = Number(e.target.value);
  $id('price-out').textContent = usd(demo.price);
  const l = $id('l-price'); if (l) l.textContent = '+' + usd(demo.price);
  demo.totals();
});
$id('send').addEventListener('click', () => { $id('c-price').textContent = '+' + usd(demo.price); demo.show(3); demo.totals(); });

// Step 3: approve, or reject with a reason.
const canSign = () => demo.decision === 'accepted' || (demo.decision === 'rejected' && $id('reason').value.trim().length >= 3);
document.querySelectorAll('.opt').forEach((o) => o.addEventListener('click', () => {
  demo.decision = o.dataset.v;
  document.querySelectorAll('.opt').forEach((x) => x.setAttribute('aria-checked', String(x === o)));
  const rej = demo.decision === 'rejected';
  $id('reason').classList.toggle('hidden', !rej); if (rej) $id('reason').focus();
  const line = demo.line(); line.classList.remove('pending'); line.classList.toggle('rej', rej);
  const p = line.querySelector('.pill'); p.textContent = rej ? 'Rejected' : 'Approved'; p.className = 'pill ' + (rej ? 'warn' : 'ok');
  $id('to-sign').disabled = !canSign(); demo.totals();
}));
$id('reason').addEventListener('input', () => { $id('to-sign').disabled = !canSign(); });
$id('to-sign').addEventListener('click', () => { demo.show(4); sizePad(); });

// Step 4: signature pad.
const pad = $id('pad'), ctx = pad.getContext('2d');
let last = null;
function sizePad() {
  const r = pad.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  if (!r.width) return;
  pad.width = r.width * dpr; pad.height = r.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  Object.assign(ctx, { lineWidth: 2.6, lineCap: 'round', lineJoin: 'round', strokeStyle: '#0B1230' });
}
function clearPad() { ctx.clearRect(0, 0, pad.width, pad.height); demo.inked = 0; $id('sign').disabled = true; }
const pt = (e) => { const r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); last = pt(e); });
pad.addEventListener('pointermove', (e) => {
  if (!last) return;
  const p = pt(e);
  ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
  demo.inked += Math.hypot(p.x - last.x, p.y - last.y); last = p;
  if (demo.inked > 60) $id('sign').disabled = false;
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => pad.addEventListener(t, () => { last = null; }));
$id('clear').addEventListener('click', clearPad);
window.addEventListener('resize', () => { if (demo.step === 4) { sizePad(); clearPad(); } });

// Step 5: the stamp lands and the receipt shows the money.
$id('sign').addEventListener('click', () => {
  const ok = demo.decision === 'accepted', added = ok ? demo.price : 0;
  const now = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  $id('stamp-slot').replaceChildren(el('div', { class: 'stamp' }, 'Signed', el('small', { text: 'rev 2' }), el('small', { text: now })));
  $id('done-h').textContent = ok ? 'Signed. Nobody had to bring up money.' : 'Signed. The change was declined, with the reason on record.';
  $id('r-change').textContent = '+' + usd(added);
  countTo($id('r-total'), BASE + added, { from: BASE });
  $id('r-pay').textContent = ok && added ? `Pay ${usd(added)}` : 'Nothing extra to pay';
  const hex = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
  $id('r-hash').textContent = `receipt sha256 · ${hex.slice(0, 4)}…${hex.slice(4)}`;
  demo.show(5); demo.totals();
});
$id('replay').addEventListener('click', () => { demo.reset(); $id('ask').focus({ preventScroll: true }); });
demo.totals();
