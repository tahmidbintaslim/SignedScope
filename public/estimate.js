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
    briefText = $('#brief').value;
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

// Workspace: save the edited estimate to a project, or reopen a saved one (?estimate=id).
const params = new URLSearchParams(location.search);
let briefText = '';
async function workspace() {
  const s = await Auth.fullySignedIn().catch(() => null);
  if (!s) return;
  const { sb } = await Auth.init();
  $('#save-in').hidden = false; $('#save-out').hidden = true;
  const { data: prof } = await sb.from('profiles').select('currency, hourly_rate, lang').eq('id', s.user.id).maybeSingle();
  if (prof && !params.get('estimate')) {
    if (prof.hourly_rate != null) $('#rate').value = prof.hourly_rate;
    if (prof.currency) $('#currency').value = prof.currency;
  }
  const { data: projects } = await sb.from('projects').select('id, title').order('updated_at', { ascending: false });
  const sel = $('#save-project');
  sel.replaceChildren(el('option', { value: '', text: t('newProjectOpt') }), ...(projects || []).map((p) => el('option', { value: p.id, text: p.title })));
  if (params.get('project')) sel.value = params.get('project');
  const toggleNew = () => { $('#save-new-wrap').hidden = Boolean(sel.value); };
  sel.addEventListener('change', toggleNew); toggleNew();
  if (params.get('estimate')) {
    const { data: e } = await sb.from('estimates').select('*').eq('id', params.get('estimate')).maybeSingle();
    if (e) {
      $('#brief').value = e.brief || ''; $('#rate').value = e.rate; $('#buffer').value = e.buffer_pct; $('#currency').value = e.currency;
      if (T[e.lang]) setLang(e.lang);
      sel.value = e.project_id; toggleNew();
      show(e.data, false);
      $('#sample-note').textContent = t('loadedSaved'); $('#sample-note').classList.remove('hidden');
    }
  }
  $('#save').addEventListener('click', async () => {
    const btn = $('#save'); btn.disabled = true; $('#save-ok').textContent = '';
    try {
      let projectId = sel.value;
      if (!projectId) {
        const title = $('#save-new').value.trim() || (est.projectType || est.summary || 'New project').slice(0, 160);
        const { data, error } = await sb.from('projects').insert({ title, currency: cur(), status: 'estimating' }).select('id').single();
        if (error) throw new Error(error.message);
        projectId = data.id;
        await sb.from('activity').insert({ project_id: projectId, kind: 'project_created', detail: { title } });
      }
      const all = est.features.flatMap((f) => f.stories);
      const lo = all.reduce((a, x) => a + x.hoursLow, 0), hi = all.reduce((a, x) => a + x.hoursHigh, 0);
      const { error } = await sb.from('estimates').insert({ project_id: projectId, brief: (briefText || $('#brief').value).slice(0, 12000), lang, currency: cur(),
        rate: rate(), buffer_pct: buffer(), data: est, hours_low: lo, hours_high: hi, price_low: priceOf(lo), price_high: priceOf(hi) });
      if (error) throw new Error(error.message);
      await sb.from('activity').insert({ project_id: projectId, kind: 'estimate_saved', detail: { range: $('#t-price').textContent } });
      $('#save-ok').textContent = t('saved');
      const link = $('#saved-link'); link.href = '/app#/projects/' + projectId; link.classList.remove('hidden');
    } catch (err) { $('#save-ok').textContent = err.message; } finally { btn.disabled = false; }
  });
}
workspace();

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

// Brief handed over from the home page box (/estimate?from=home): fill the form and run it once.
if (params.get('from') === 'home') {
  let hand = null;
  try { hand = JSON.parse(sessionStorage.getItem('ss-home-brief') || 'null'); sessionStorage.removeItem('ss-home-brief'); } catch { /* ignore */ }
  if (hand && typeof hand.brief === 'string' && hand.brief.trim().length >= 20) {
    if (T[hand.lang]) setLang(hand.lang);
    $('#brief').value = hand.brief.slice(0, 12000);
    if (Number(hand.rate) > 0) $('#rate').value = Number(hand.rate);
    if (Number(hand.buffer) >= 0 && Number(hand.buffer) <= 100) $('#buffer').value = Number(hand.buffer);
    if (CURRENCIES.includes(hand.currency)) $('#currency').value = hand.currency;
    $('#f').requestSubmit();
  }
}
