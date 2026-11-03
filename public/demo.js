'use strict';
// Home page motion and the interactive demo. Everything is local; nothing is sent to the server.
document.documentElement.classList.add('js');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const usd = (n) => money(n, 'USD');
const BASE = 6000;

// Count a number up inside an element.
function countTo(node, to, { from = 0, ms = 700, fmt = usd } = {}) {
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
function onView(node, fn, threshold = 0.35) {
  if (!('IntersectionObserver' in window)) return fn();
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { threshold });
  io.observe(node);
}

/* Hero: the requests arrive one by one and the free-work counter climbs. */
(function hero() {
  const msgs = [...document.querySelectorAll('#msgs .msg')];
  const leak = $('#leak'), box = leak.parentElement;
  let total = 0;
  msgs.forEach((m) => { const c = Number(m.dataset.cost || 0); if (c) m.dataset.tag = `+ ${usd(c)} unbilled`; });
  if (reduced) {
    msgs.forEach((m) => m.classList.add('show'));
    leak.textContent = usd(msgs.reduce((t, m) => t + Number(m.dataset.cost || 0), 0));
    return;
  }
  onView($('#msgs'), () => msgs.forEach((m, i) => setTimeout(() => {
    m.classList.add('show');
    const c = Number(m.dataset.cost || 0);
    if (c) { countTo(leak, total + c, { from: total }); total += c; box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump'); }
  }, 500 + i * 1100)), 0.2);
})();

/* Scroll reveal and stat count-up. */
document.querySelectorAll('main > section:not(.hero) h2, .moments > *, .split > *, .stat, .plans > *, .compare .table-wrap').forEach((n, i) => {
  n.classList.add('reveal');
  n.style.transitionDelay = `${(i % 3) * 80}ms`;
  onView(n, () => n.classList.add('in'), 0.15);
});
document.querySelectorAll('.stat b[data-count]').forEach((b) => {
  const to = Number(b.dataset.count), pre = b.dataset.prefix || '';
  const fmt = (n) => pre ? usd(n) : `${n}%`;
  onView(b, () => countTo(b, to, { ms: 1100, fmt }));
});

/* The demo state machine. */
const demo = {
  step: 1, price: 480, decision: null, inked: 0,
  show(n) {
    this.step = n;
    const pill = $('#doc-pill');
    pill.textContent = n === 1 ? 'Signed · revision 1' : n === 5 ? 'Signed · revision 2' : 'Revision 2 · waiting for client';
    pill.className = 'pill ' + (n === 1 || n === 5 ? 'ok' : 'chg');
    document.querySelectorAll('.pstep').forEach((p) => { p.hidden = Number(p.dataset.step) !== n; });
    [...$('#stepper').children].forEach((li, i) => {
      li.classList.toggle('on', i + 1 === n);
      li.classList.toggle('done', i + 1 < n);
    });
  },
  addedLine() { return $('#lines .added'); },
  setTotals() {
    const added = this.step === 1 || this.decision === 'rejected' ? 0 : this.price;
    const pending = this.decision == null;
    $('#total-label').textContent = this.step === 1 ? 'Signed total' : pending ? 'Revision 2 total, if accepted' : 'Revision 2 total';
    $('#d-total').textContent = usd(BASE + added);
    $('#d-total').style.color = added && !pending ? 'var(--green)' : '';
    $('#d-delta').textContent = this.step === 1 ? ' ' : `Signed ${usd(BASE)} + change ${usd(added)}`;
  },
  // Step 1 -> 2: the chat message becomes a priced line in revision 2.
  commit() {
    if (this.step !== 1) return;
    const li = el('li', { class: 'line added pending' }, el('span', {}, el('span', { class: 'pill chg', text: 'Added' }), ' Apple Pay at checkout'), el('span', { class: 'amt', id: 'l-price', text: usd(this.price) }));
    $('#lines').insertBefore(li, $('#lines .out'));
    this.show(2);
    this.setTotals();
    $('#price').focus({ preventScroll: true });
  },
  reset() {
    const a = this.addedLine(); if (a) a.remove();
    $('#stamp-slot').textContent = '';
    this.price = 480; this.decision = null; this.inked = 0;
    $('#price').value = 480; $('#price-out').textContent = usd(480);
    document.querySelectorAll('.opt').forEach((o) => o.setAttribute('aria-checked', 'false'));
    $('#reason').value = ''; $('#reason').classList.add('hidden');
    $('#to-sign').disabled = true; $('#sign').disabled = true;
    clearPad();
    this.show(1); this.setTotals();
  },
};
document.querySelectorAll('.opt').forEach((o) => { o.setAttribute('role', 'radio'); o.setAttribute('aria-checked', 'false'); });

/* Step 1: drag the ask onto the document (pointer), or press Enter / tap (keyboard and touch fallback). */
(function drag() {
  const ask = $('#ask'), doc = $('#doc'), drop = $('#drop');
  let ghost = null, start = null, over = false;
  const inside = (x, y) => { const r = doc.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
  ask.addEventListener('pointerdown', (e) => {
    if (demo.step !== 1) return;
    start = { x: e.clientX, y: e.clientY, r: ask.getBoundingClientRect() };
    ask.setPointerCapture(e.pointerId);
  });
  ask.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!ghost && Math.hypot(dx, dy) > 6) {
      ghost = ask.cloneNode(true); ghost.removeAttribute('id'); ghost.classList.add('lift');
      ghost.style.setProperty('--w', start.r.width + 'px');
      document.body.append(ghost); ask.style.opacity = '.3'; doc.classList.add('dragging');
    }
    if (ghost) {
      ghost.style.left = start.r.left + dx + 'px'; ghost.style.top = start.r.top + dy + 'px';
      over = inside(e.clientX, e.clientY); drop.classList.toggle('over', over);
    }
  });
  const end = () => {
    if (!start) return;
    const dropped = ghost ? over : true; // a tap without dragging also counts
    if (ghost) ghost.remove();
    ghost = null; start = null; over = false;
    ask.style.opacity = ''; doc.classList.remove('dragging'); drop.classList.remove('over');
    if (dropped) demo.commit();
  };
  ask.addEventListener('pointerup', end);
  ask.addEventListener('pointercancel', () => { start = null; end(); });
  ask.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); demo.commit(); } });
})();

/* Step 2: set the price. */
$('#price').addEventListener('input', (e) => {
  demo.price = Number(e.target.value);
  $('#price-out').textContent = usd(demo.price);
  const l = $('#l-price'); if (l) l.textContent = usd(demo.price);
  demo.setTotals();
});
$('#send').addEventListener('click', () => {
  $('#c-price').textContent = usd(demo.price);
  demo.show(3); demo.setTotals();
});

/* Step 3: the client accepts, or rejects with a reason. */
function canSign() { return demo.decision === 'accepted' || (demo.decision === 'rejected' && $('#reason').value.trim().length >= 3); }
document.querySelectorAll('.opt').forEach((o) => o.addEventListener('click', () => {
  demo.decision = o.dataset.v;
  document.querySelectorAll('.opt').forEach((x) => x.setAttribute('aria-checked', String(x === o)));
  const rej = demo.decision === 'rejected';
  $('#reason').classList.toggle('hidden', !rej);
  if (rej) $('#reason').focus();
  const line = demo.addedLine();
  line.classList.remove('pending'); line.classList.toggle('rej', rej);
  line.querySelector('.pill').textContent = rej ? 'Rejected' : 'Accepted';
  line.querySelector('.pill').className = 'pill ' + (rej ? 'warn' : 'ok');
  $('#to-sign').disabled = !canSign();
  demo.setTotals();
}));
$('#reason').addEventListener('input', () => { $('#to-sign').disabled = !canSign(); });
$('#to-sign').addEventListener('click', () => { demo.show(4); sizePad(); });

/* Step 4: draw a signature. */
const pad = $('#pad'), ctx = pad.getContext('2d');
let last = null;
function sizePad() {
  const r = pad.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  if (!r.width) return;
  pad.width = r.width * dpr; pad.height = r.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#15130f';
}
function clearPad() { ctx.clearRect(0, 0, pad.width, pad.height); demo.inked = 0; $('#sign').disabled = true; }
const pt = (e) => { const r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); last = pt(e); });
pad.addEventListener('pointermove', (e) => {
  if (!last) return;
  const p = pt(e);
  ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
  demo.inked += Math.hypot(p.x - last.x, p.y - last.y); last = p;
  if (demo.inked > 60) $('#sign').disabled = false;
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => pad.addEventListener(t, () => { last = null; }));
$('#clear').addEventListener('click', clearPad);
window.addEventListener('resize', () => { if (demo.step === 4) { sizePad(); clearPad(); } });

/* Step 5: the seal stamps down and the receipt shows the money. */
$('#sign').addEventListener('click', () => {
  const ok = demo.decision === 'accepted';
  const added = ok ? demo.price : 0;
  const now = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  $('#stamp-slot').replaceChildren(el('div', { class: 'stamp' }, 'Signed', el('small', { text: 'rev 2' }), el('small', { text: now })));
  $('#done-h').textContent = ok ? 'Signed. Nobody had to bring up money.' : 'Signed. The change was declined, with the reason on record.';
  $('#r-change').textContent = `+ ${usd(added)}`;
  countTo($('#r-total'), BASE + added, { from: BASE });
  $('#r-pay').textContent = ok && added ? `Pay ${usd(added)}` : 'Nothing extra to pay';
  const hex = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
  $('#r-hash').textContent = `receipt sha256 · ${hex.slice(0, 4)}…${hex.slice(4)}`;
  demo.show(5); demo.setTotals();
});
$('#replay').addEventListener('click', () => { demo.reset(); $('#ask').focus({ preventScroll: true }); });
demo.setTotals();
