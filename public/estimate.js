'use strict';
// AI estimator page. The server returns hours only; prices are always computed here from
// the freelancer's rate and buffer, so editing hours, rate or buffer updates every total.
let lang = 'en', est = null, edits = 0, isSample = false;
const t = (k, ...a) => { const v = (T[lang] && T[lang][k]) ?? T.en[k]; return typeof v === 'function' ? v(...a) : v; };
const rate = () => Math.max(0, Number($('#rate').value) || 0);
const buffer = () => Math.min(100, Math.max(0, Number($('#buffer').value) || 0));
const cur = () => $('#currency').value;
const mid = (s) => (s.hoursLow + s.hoursHigh) / 2;
const priceOf = (h) => Math.round(h * rate() * (1 + buffer() / 100));

function setLang(l) {
  lang = T[l] ? l : 'en';
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach((n) => { n.textContent = t(n.dataset.t); });
  document.querySelectorAll('[data-tp]').forEach((n) => { n.placeholder = t(n.dataset.tp); });
  $('#ui-lang').value = lang;
  try { localStorage.setItem('ss-lang', lang); } catch { /* storage may be blocked */ }
  if (est) render();
}

function list(id, items) {
  const ul = $('#' + id);
  ul.replaceChildren(...items.map((x) => el('li', { text: x })));
  ul.parentElement.hidden = !items.length;
}

function storyRow(fi, si, s) {
  const hours = (k) => el('input', {
    type: 'number', min: 0, max: 400, step: 0.5, value: s[k], class: 'hrs', 'aria-label': `${t(k === 'hoursLow' ? 'low' : 'high')}: ${s.title}`,
    oninput: (e) => { s[k] = Math.max(0, Number(e.target.value) || 0); edits++; update(); },
  });
  return el('tr', {},
    el('td', { text: s.title }),
    el('td', {}, hours('hoursLow')),
    el('td', {}, hours('hoursHigh')),
    el('td', {}, el('button', { type: 'button', class: 'x-btn', 'aria-label': `${t('remove')}: ${s.title}`, text: '×',
      onclick: () => { est.features[fi].stories.splice(si, 1); edits++; render(); } })));
}

function render() {
  $('#summary').textContent = est.summary;
  $('#features').replaceChildren(...est.features.map((f, fi) => el('div', { class: 'card est-f' },
    el('div', { class: 'row est-fh' },
      el('h3', { text: f.name }),
      el('span', { class: 'pill' + (f.kind === 'nonfunctional' ? ' chg' : ' ok'), text: t(f.kind) }),
      el('b', { class: 'amt', 'data-f': fi })),
    el('table', { class: 'est-t' },
      el('thead', {}, el('tr', {}, el('th', { text: t('story') }), el('th', { text: t('low') }), el('th', { text: t('high') }), el('th', {}, el('span', { class: 'sr', text: t('remove') })))),
      el('tbody', {}, f.stories.map((s, si) => storyRow(fi, si, s)))))));
  $('#milestones').replaceChildren(...est.milestones.map((m) => el('li', {},
    el('b', { text: m.name }), ' · ', t('weeks', m.weeks),
    m.featureIndexes.length ? el('div', { class: 'muted small', text: `${t('delivers')}: ${m.featureIndexes.map((i) => est.features[i] && est.features[i].name).filter(Boolean).join(', ')}` }) : null)));
  list('questions', est.openQuestions); list('assumptions', est.assumptions);
  list('risks', est.risks); list('outOfScope', est.outOfScope);
  update();
}

function update() {
  const all = est.features.flatMap((f) => f.stories);
  const lo = all.reduce((a, s) => a + s.hoursLow, 0), hi = all.reduce((a, s) => a + s.hoursHigh, 0);
  $('#t-price').textContent = `${money(priceOf(lo), cur())} – ${money(priceOf(hi), cur())}`;
  $('#t-hours').textContent = t('hrs', lo, hi);
  $('#t-weeks').textContent = t('weeks', est.milestones.reduce((a, m) => a + m.weeks, 0));
  $('#t-formula').textContent = t('formula', money(rate(), cur()), buffer());
  est.features.forEach((f, fi) => {
    const n = document.querySelector(`[data-f="${fi}"]`);
    if (n) n.textContent = money(priceOf(f.stories.reduce((a, s) => a + mid(s), 0)), cur());
  });
}

function show(data, sample) {
  est = data; isSample = sample; edits = 0;
  $('#sample-note').classList.toggle('hidden', !sample);
  $('#out').hidden = false;
  render();
  $('#out').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

$('#f').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#err').textContent = '';
  const btn = $('#go'); btn.disabled = true; $('#wait').hidden = false;
  try {
    const r = await api('estimate', { brief: $('#brief').value, lang, rate: rate(), buffer: buffer(), currency: cur() });
    show(r.estimate, false);
  } catch (err) {
    // When AI is off, the sample brief still shows a labelled sample result.
    if (/not switched on/.test(err.message) && $('#brief').value.trim() === SAMPLE_BRIEF.trim()) show(structuredClone(SAMPLE_ESTIMATE), true);
    else $('#err').textContent = err.message;
  } finally { btn.disabled = false; $('#wait').hidden = true; }
});

$('#sample').addEventListener('click', () => { $('#brief').value = SAMPLE_BRIEF; $('#currency').value = 'THB'; $('#rate').value = 600; $('#brief').focus(); });
['#rate', '#buffer', '#currency'].forEach((s) => $(s).addEventListener('input', () => est && update()));
$('#ui-lang').addEventListener('change', (e) => setLang(e.target.value));

// Hands the estimate to /new: one priced line per feature, exclusions as "Out of scope".
$('#to-scope').addEventListener('click', () => {
  const items = est.features.filter((f) => f.stories.length).map((f) => ({
    kind: 'scope',
    text: `${f.name}: ${f.stories.map((s) => s.title).join('; ')}`.slice(0, 600),
    price: priceOf(f.stories.reduce((a, s) => a + mid(s), 0)),
  })).concat(est.outOfScope.map((x) => ({ kind: 'out', text: x.slice(0, 600) })));
  const notes = est.assumptions.length ? `${t('notesAssumptions')}:\n- ${est.assumptions.join('\n- ')}`.slice(0, 2000) : '';
  try { sessionStorage.setItem('ss-draft', JSON.stringify({ title: (est.projectType || est.summary).slice(0, 160), currency: cur(), notes, items })); } catch { /* ignore */ }
  location.href = '/new';
});

$('#copy').addEventListener('click', async () => {
  const lines = [est.summary, ''];
  est.features.forEach((f) => {
    lines.push(`${f.name} (${money(priceOf(f.stories.reduce((a, s) => a + mid(s), 0)), cur())})`);
    f.stories.forEach((s) => lines.push(`  - ${s.title}: ${t('hrs', s.hoursLow, s.hoursHigh)}`));
  });
  lines.push('', `${t('priceRange')}: ${$('#t-price').textContent}`, `${t('timeline')}: ${$('#t-weeks').textContent}`);
  est.milestones.forEach((m, i) => lines.push(`${i + 1}. ${m.name} (${t('weeks', m.weeks)})`));
  if (est.outOfScope.length) lines.push('', `${t('outOfScope')}:`, ...est.outOfScope.map((x) => `- ${x}`));
  try { await navigator.clipboard.writeText(lines.join('\n')); $('#copy').textContent = t('copied'); } catch { /* clipboard blocked */ }
});

$('#fb').addEventListener('submit', async (e) => {
  e.preventDefault();
  const a = document.querySelector('input[name=answer]:checked');
  if (!a) { $('#fb-ok').textContent = t('fbPick'); return; }
  const all = est.features.flatMap((f) => f.stories);
  let ref; try { ref = sessionStorage.getItem('ss-ref') || undefined; } catch { /* ignore */ }
  try {
    await api('feedback', { answer: a.value, note: $('#fb-note').value, lang, ref, edits, features: est.features.length,
      hoursLow: all.reduce((x, s) => x + s.hoursLow, 0), hoursHigh: all.reduce((x, s) => x + s.hoursHigh, 0), sample: isSample });
    $('#fb-ok').textContent = t('fbThanks');
    e.target.querySelector('button[type=submit]').disabled = true;
  } catch (err) { $('#fb-ok').textContent = err.message; }
});

CURRENCIES.forEach((c) => $('#currency').append(el('option', { value: c, text: c })));
let saved; try { saved = localStorage.getItem('ss-lang'); } catch { /* ignore */ }
const guess = (navigator.language || '').slice(0, 2);
setLang(saved || (guess === 'th' || guess === 'bn' ? guess : 'en'));
if (lang === 'th') $('#currency').value = 'THB'; else if (lang === 'bn') $('#currency').value = 'BDT';
