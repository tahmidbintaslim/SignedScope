'use strict';
// Home page v5: hero estimate hand-off, estimate demo, client-view demo, video chapters, menu, reveal.
// Demo data is fixed sample data; nothing here calls the AI or stores anything.
document.documentElement.classList.add('js');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const baht = (n) => '฿' + Math.round(n).toLocaleString('en-US');

// ---------- mobile menu ----------
const menuBtn = $('#menu-btn');
menuBtn.addEventListener('click', () => {
  const open = menuBtn.getAttribute('aria-expanded') !== 'true';
  menuBtn.setAttribute('aria-expanded', String(open));
  $('#nav').classList.toggle('open', open);
});
$('#nav').addEventListener('click', (e) => { if (e.target.closest('a')) { menuBtn.setAttribute('aria-expanded', 'false'); $('#nav').classList.remove('open'); } });

// ---------- radio-style segmented buttons ----------
function segment(group, onPick) {
  const btns = [...group.querySelectorAll('[role=radio]')];
  const pick = (b) => { btns.forEach((x) => { x.setAttribute('aria-checked', String(x === b)); x.tabIndex = x === b ? 0 : -1; }); onPick(b); };
  btns.forEach((b, i) => {
    b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
    b.addEventListener('click', () => pick(b));
    b.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault(); const n = btns[(i + d + btns.length) % btns.length]; pick(n); n.focus();
    });
  });
}

// ---------- hero: hand the brief to /estimate, which runs it ----------
let tryLang = 'en';
segment($('.try .seg'), (b) => { tryLang = b.dataset.lang; });
const briefBox = $('#try-brief');
if (typeof SAMPLE_BRIEF === 'string') briefBox.value = SAMPLE_BRIEF; // works even before the AI is switched on
$('#try').addEventListener('submit', (e) => {
  e.preventDefault();
  const hand = { brief: briefBox.value.trim(), rate: Number($('#try-rate').value) || 1200, buffer: Number($('#try-buffer').value) || 0, currency: 'THB', lang: tryLang };
  try { sessionStorage.setItem('ss-home-brief', JSON.stringify(hand)); } catch { /* storage blocked: /estimate still opens */ }
  location.href = '/estimate?from=home';
});

// ---------- demo 1: tabs ----------
const tabs = [...document.querySelectorAll('.est-tabs [role=tab]')];
function selectTab(t) {
  tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).hidden = !on; });
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (d) { e.preventDefault(); const n = tabs[(i + d + tabs.length) % tabs.length]; selectTab(n); n.focus(); }
  });
});

// ---------- demo 1: price = hours × rate × (1 + buffer), same as api/estimate.js ----------
const HOURS = 142;
function recalc() {
  const rate = Number($('#d-rate').value), buf = Number($('#d-buf').value);
  const sub = HOURS * rate, total = sub * (1 + buf / 100);
  const set = (k, v) => document.querySelectorAll(`[data-out="${k}"]`).forEach((n) => { n.textContent = v; });
  set('rate', `${baht(rate)} / h`); set('bufpct', `${buf}%`); set('sub', baht(sub));
  set('buf', `${buf}% · ${baht(sub * buf / 100)}`); set('total', baht(total)); set('formula', `${baht(sub)} + ${buf}% buffer`);
  $('#d-total').textContent = baht(total);
  $('#d-rate').setAttribute('aria-valuetext', `${baht(rate)} per hour`);
  $('#d-buf').setAttribute('aria-valuetext', `${buf} percent`);
}
$('#d-rate').addEventListener('input', recalc); $('#d-buf').addEventListener('input', recalc); recalc();

// ---------- demo 2: client approves line by line, then signs ----------
const doc = $('#doc'), lines = [...doc.querySelectorAll('.lines button')];
const initial = lines.map((b) => b.getAttribute('aria-pressed'));
lines.forEach((b) => b.addEventListener('click', () => {
  if (doc.dataset.signed) return;
  b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
  $('#sig-err').textContent = '';
}));
segment($('.doc .seg'), (b) => {
  const lang = b.dataset.doclang; doc.dataset.lang = lang;
  doc.querySelectorAll('.lines span').forEach((s) => { s.textContent = s.dataset[lang]; s.lang = lang; });
});
const now = () => new Date().toTimeString().slice(0, 5);
function addEvent(text, color) {
  const li = el('li', { class: reduceMotion ? '' : 'new', style: `--c:${color}` }, el('time', { text: now() }), text);
  $('#timeline').append(li);
}
doc.addEventListener('submit', (e) => {
  e.preventDefault();
  if (doc.dataset.signed) return;
  const open = lines.filter((b) => b.getAttribute('aria-pressed') !== 'true').length;
  const err = !$('#sig-name').value.trim() ? 'Type your name to sign.'
    : open ? `Approve every line first. ${open} still ${open === 1 ? 'needs' : 'need'} an answer.`
      : !$('#sig-ok').checked ? 'Tick the box to agree to the scope and schedule.' : '';
  $('#sig-err').textContent = err;
  if (err) return;
  doc.dataset.signed = '1';
  const name = $('#sig-name').value.trim().slice(0, 60);
  $('#sign-btn').replaceWith(el('p', { class: 'signed-ok', id: 'signed-ok', role: 'status' }, `Signed by ${name}. Receipt sent to both of you.`));
  addEvent(`Signed by ${name}`, 'var(--mint)');
  setTimeout(() => {
    addEvent('2 payment requests created', 'var(--violet)');
    const st = doc.ownerDocument.querySelector('#pays .st.wait');
    if (st) { st.className = 'st req'; st.textContent = 'Requested'; }
  }, reduceMotion ? 0 : 600);
});
$('#reset-doc').addEventListener('click', () => {
  delete doc.dataset.signed;
  lines.forEach((b, i) => b.setAttribute('aria-pressed', initial[i]));
  $('#sig-ok').checked = false; $('#sig-err').textContent = '';
  const ok = $('#signed-ok');
  if (ok) ok.replaceWith(el('button', { class: 'btn violet block', type: 'submit', id: 'sign-btn' }, 'Approve and sign'));
  [...$('#timeline').children].slice(2).forEach((n) => n.remove());
  const st = $('#pays .st');
  st.className = 'st wait'; st.textContent = 'Waiting for signature';
});

// ---------- video chapters ----------
const vid = $('#tour-v');
document.querySelectorAll('.chapters button').forEach((b) => b.addEventListener('click', () => {
  const t = Number(b.dataset.t);
  const go = () => { vid.currentTime = t; vid.play().catch(() => {}); };
  if (vid.readyState >= 1) go(); else { vid.preload = 'metadata'; vid.addEventListener('loadedmetadata', go, { once: true }); vid.load(); }
  vid.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
}));

// ---------- pricing buttons pick the waitlist plan ----------
document.querySelectorAll('[data-plan]').forEach((a) => a.addEventListener('click', () => { $('#wl-plan').value = a.dataset.plan; setTimeout(() => $('#wl-email').focus(), 300); }));

// ---------- reveal on scroll ----------
const io = 'IntersectionObserver' in window && !reduceMotion
  ? new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -10% 0px' })
  : null;
document.querySelectorAll('.reveal').forEach((n, i) => { n.style.transitionDelay = `${(i % 5) * 60}ms`; if (io) io.observe(n); else n.classList.add('in'); });
