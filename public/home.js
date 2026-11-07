'use strict';
// Home page: hero tilt, product story player, estimate hand-off, the two demos, bento motion, tour chapters.
// Demo data is fixed sample data; nothing here calls the AI or stores anything.
document.documentElement.classList.add('js');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const baht = (n) => '฿' + Math.round(n).toLocaleString('en-US');
const onView = (node, cb, opts) => { if (!('IntersectionObserver' in window)) { cb(true); return; } new IntersectionObserver((es) => es.forEach((e) => cb(e.isIntersecting)), opts).observe(node); };

// ---------- mobile menu ----------
const menuBtn = $('#menu-btn');
menuBtn.addEventListener('click', () => {
  const open = menuBtn.getAttribute('aria-expanded') !== 'true';
  menuBtn.setAttribute('aria-expanded', String(open)); $('#nav').classList.toggle('open', open);
});
$('#nav').addEventListener('click', (e) => { if (e.target.closest('a')) { menuBtn.setAttribute('aria-expanded', 'false'); $('#nav').classList.remove('open'); } });

// ---------- hero: the stage flattens as you scroll ----------
const rig = $('#rig'), stage = $('#scene');
if (!reduceMotion) {
  let ticking = false;
  const tilt = () => { ticking = false; const r = stage.getBoundingClientRect(); const k = Math.min(1, Math.max(0, (r.top - 80) / (innerHeight * 0.55))); rig.style.setProperty('--tilt', k.toFixed(3)); stage.style.setProperty('--tilt', k.toFixed(3)); };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(tilt); } }, { passive: true }); tilt();
} else rig.style.setProperty('--tilt', '0');

// ---------- tabs (shared): arrow keys move between tabs ----------
function tabset(tabs, onSelect) {
  const select = (t) => { tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).hidden = !on; }); if (onSelect) onSelect(t); };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (d) { e.preventDefault(); const n = tabs[(i + d + tabs.length) % tabs.length]; select(n); n.focus(); } });
  });
}
function segment(group, onPick) {
  const btns = [...group.querySelectorAll('[role=radio]')];
  const pick = (b) => { btns.forEach((x) => { x.setAttribute('aria-checked', String(x === b)); x.tabIndex = x === b ? 0 : -1; }); onPick(b); };
  btns.forEach((b, i) => {
    b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
    b.addEventListener('click', () => pick(b));
    b.addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (d) { e.preventDefault(); const n = btns[(i + d + btns.length) % btns.length]; pick(n); n.focus(); } });
  });
}

// ---------- product story: steps drive one player ----------
const CLIPS = { estimate: 'Estimate', agreement: 'Agreement', sign: 'Client signs', pay: 'Get paid' };
const clip = $('#clip'), steps = [...document.querySelectorAll('#steps li')];
let storyVisible = false;
function playStep(li, user) {
  steps.forEach((s) => { const on = s === li; s.classList.toggle('on', on); s.querySelector('button').setAttribute('aria-pressed', String(on)); });
  const k = li.dataset.clip;
  $('#clip-label').textContent = CLIPS[k];
  clip.poster = `/media/clips/${k}.webp`;
  const [webm, mp4] = clip.querySelectorAll('source');
  webm.src = `/media/clips/${k}.webm`; mp4.src = `/media/clips/${k}.mp4`;
  clip.load();
  if ((storyVisible && !reduceMotion) || user) clip.play().catch(() => {});
}
clip.loop = false;
steps.forEach((li) => li.querySelector('button').addEventListener('click', () => playStep(li, true)));
clip.addEventListener('timeupdate', () => { $('#clip-bar').style.width = clip.duration ? `${(clip.currentTime / clip.duration) * 100}%` : '0'; });
clip.addEventListener('ended', () => { const i = steps.findIndex((s) => s.classList.contains('on')); playStep(steps[(i + 1) % steps.length]); });
clip.addEventListener('click', () => { if (clip.paused) clip.play().catch(() => {}); else clip.pause(); });
onView($('#product'), (v) => { storyVisible = v; if (v && !reduceMotion) clip.play().catch(() => {}); else clip.pause(); }, { threshold: 0.35 });

// ---------- try it: hand the brief to /estimate, which runs it ----------
let tryLang = 'en';
segment($('.try .seg'), (b) => { tryLang = b.dataset.lang; });
const briefBox = $('#try-brief');
if (typeof SAMPLE_BRIEF === 'string') briefBox.value = SAMPLE_BRIEF; // works even before the AI is switched on
$('#try-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const hand = { brief: briefBox.value.trim(), rate: Number($('#try-rate').value) || 1200, buffer: Number($('#try-buffer').value) || 0, currency: 'THB', lang: tryLang };
  try { sessionStorage.setItem('ss-home-brief', JSON.stringify(hand)); } catch { /* storage blocked: /estimate still opens */ }
  location.href = '/estimate?from=home';
});
tabset([...document.querySelectorAll('.demo-switch [role=tab]')]);

// ---------- demo 1: estimate tabs and price = hours × rate × (1 + buffer), as in api/estimate.js ----------
tabset([...document.querySelectorAll('.est-tabs [role=tab]')]);
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
  b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); $('#sig-err').textContent = '';
}));
segment($('.doc .seg'), (b) => {
  const lang = b.dataset.doclang; doc.dataset.lang = lang;
  doc.querySelectorAll('.lines span').forEach((s) => { s.textContent = s.dataset[lang]; s.lang = lang; });
});
const now = () => new Date().toTimeString().slice(0, 5);
const addEvent = (text, color) => $('#timeline').append(el('li', { class: reduceMotion ? '' : 'new', style: `--c:${color}` }, el('time', { text: now() }), text));
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
    const st = $('#pays .st.wait'); if (st) { st.className = 'st req'; st.textContent = 'Requested'; }
  }, reduceMotion ? 0 : 600);
});
$('#reset-doc').addEventListener('click', () => {
  delete doc.dataset.signed;
  lines.forEach((b, i) => b.setAttribute('aria-pressed', initial[i]));
  $('#sig-ok').checked = false; $('#sig-err').textContent = '';
  const ok = $('#signed-ok'); if (ok) ok.replaceWith(el('button', { class: 'btn violet block', type: 'submit', id: 'sign-btn' }, 'Approve and sign'));
  [...$('#timeline').children].slice(2).forEach((n) => n.remove());
  const st = $('#pays .st'); st.className = 'st wait'; st.textContent = 'Waiting for signature';
});

// ---------- bento: small looping motions, only while visible ----------
(function qr() { // decorative pattern with QR-style finder squares (not a real payment code)
  const svg = $('#qr'), n = 29; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const finder = (x, y) => [[x, y, 7, 7, '#0B1230'], [x + 1, y + 1, 5, 5, '#fff'], [x + 2, y + 2, 3, 3, '#0B1230']];
  const cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const inF = (x < 8 && y < 8) || (x > 20 && y < 8) || (x < 8 && y > 20); if (!inF && rnd() > 0.52) cells.push([x, y, 1, 1, '#0B1230']); }
  [...finder(0, 0), ...finder(22, 0), ...finder(0, 22)].concat(cells).forEach(([x, y, w, h, f]) => {
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h); r.setAttribute('fill', f); svg.append(r);
  });
})();
const LANG = [['EN', 'Online table booking'], ['বাংলা', 'অনলাইনে টেবিল বুকিং'], ['ไทย', 'ระบบจองโต๊ะออนไลน์']];
const LAW = [['TH', 'Thailand'], ['BD', 'Bangladesh'], ['MY', 'Malaysia'], ['SG', 'Singapore']];
let tick = 0, timer = 0;
function bento() {
  tick++;
  const [tag, line] = LANG[tick % LANG.length]; $('#lang-tag').textContent = tag; $('#lang-line').textContent = line;
  const h = [...'0123456789abcdef']; $('#hash').textContent = $('#hash').textContent.replace(/[0-9a-f]/g, (c, i) => (i % 9 === tick % 9 ? h[(h.indexOf(c) + 7) % 16] : c));
  const paid = tick % 2 === 1; const st = $('#pay-st'); st.className = 'st ' + (paid ? 'paid' : 'req'); st.textContent = paid ? 'Paid' : 'Requested';
  document.querySelectorAll('#otp i').forEach((d, i) => { if ((i + tick) % 3 === 0) d.textContent = String((Number(d.textContent) + 3) % 10); });
  const [code, country] = LAW[tick % LAW.length];
  document.querySelectorAll('.flags span').forEach((s) => s.classList.toggle('on', s.textContent === code));
  $('#law-line').textContent = `Governed by the laws of ${country}.`;
}
if (!reduceMotion) onView($('#features'), (v) => { clearInterval(timer); if (v) timer = setInterval(bento, 2200); }, { threshold: 0.1 });

// ---------- tour chapters ----------
const vid = $('#tour-v');
document.querySelectorAll('.chapters button').forEach((b) => b.addEventListener('click', () => {
  const t = Number(b.dataset.t);
  const go = () => { vid.currentTime = t; vid.play().catch(() => {}); };
  if (vid.readyState >= 1) go(); else { vid.preload = 'metadata'; vid.addEventListener('loadedmetadata', go, { once: true }); vid.load(); }
  vid.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
}));
document.querySelectorAll('[data-plan]').forEach((a) => a.addEventListener('click', () => { $('#wl-plan').value = a.dataset.plan; setTimeout(() => $('#wl-email').focus(), 300); }));

// ---------- reveal on scroll ----------
const io = 'IntersectionObserver' in window && !reduceMotion
  ? new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -10% 0px' })
  : null;
document.querySelectorAll('.reveal').forEach((n, i) => { n.style.transitionDelay = `${(i % 3) * 70}ms`; if (io) io.observe(n); else n.classList.add('in'); });
