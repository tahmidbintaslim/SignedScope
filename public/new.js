'use strict';
let parentToken = null;
const box = $('#items');
function addItem(kind = 'scope', text = '', id = '', price = '') {
  const sel = el('select', { 'aria-label': 'Type' }, ...Object.entries(KIND).map(([k, v]) => el('option', { value: k, text: v, selected: k === kind })));
  const inp = el('input', { value: text, maxlength: 600, placeholder: 'Describe the item', 'aria-label': 'Item text' });
  const amt = el('input', { value: price ?? '', inputmode: 'decimal', placeholder: 'Price', 'aria-label': 'Price (optional)', class: 'amt-in' });
  const syncKind = () => { amt.disabled = sel.value === 'out'; if (amt.disabled) amt.value = ''; };
  sel.addEventListener('change', syncKind); syncKind();
  const row = el('div', { class: 'item', 'data-id': id }, sel, inp, amt, el('button', { type: 'button', 'aria-label': 'Remove', text: '×', onclick: () => row.remove() }));
  inp.addEventListener('paste', (e) => {
    const t = (e.clipboardData || window.clipboardData).getData('text');
    const lines = t.split(/\r?\n/).map((l) => l.replace(/^\s*([-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean);
    if (lines.length > 1) { e.preventDefault(); inp.value = lines[0]; lines.slice(1).forEach((l) => addItem(sel.value, l)); }
  });
  box.append(row);
  return inp;
}
['scope', 'uat', 'out'].forEach((k) => $('#add-' + k).addEventListener('click', () => addItem(k).focus()));
CURRENCIES.forEach((c) => $('#currency').append(el('option', { value: c, text: c })));

// Draft items from a pasted message. Empty rows are replaced; filled rows are kept.
$('#draft').addEventListener('click', async () => {
  const text = $('#paste').value.trim();
  if (!text) { $('#paste').focus(); return; }
  const btn = $('#draft'); btn.disabled = true; $('#draft-note').textContent = 'Drafting…';
  try {
    const { items, source } = await api('draft', { text });
    [...box.children].forEach((r) => { if (!r.querySelector('input').value.trim()) r.remove(); });
    items.forEach((it) => addItem(it.kind, it.text));
    $('#draft-note').textContent = items.length
      ? `Added ${items.length} line${items.length > 1 ? 's' : ''}${source === 'ai' ? ' (drafted by AI)' : ''}. Check the wording and add prices.`
      : 'Nothing to add from that text.';
  } catch (err) { $('#draft-note').textContent = err.message; }
  btn.disabled = false;
});

async function init() {
  const h = tokenFromHash();
  if (h.startsWith('cr=')) {
    parentToken = h.slice(3);
    try {
      const { data } = await api('verify', { token: parentToken });
      if (data.type !== 'receipt') throw new Error('Not a receipt');
      const d = data.doc;
      $('#h').textContent = `Change request (revision ${(d.revision || 1) + 1})`;
      const b = $('#cr-banner');
      b.textContent = `Baseline: "${d.title}", signed by ${data.signer.name} on ${fmt(data.signedAt)}. Edit the items below. Your client will see a diff against this baseline.`;
      b.classList.remove('hidden');
      ['title', 'client', 'agency', 'agencyEmail', 'notes', 'payLink', 'payInstructions'].forEach((k) => { $('#' + k).value = d[k] || ''; });
      $('#currency').value = d.currency || 'USD';
      // Totals are compared with the signed scope, so the currency stays the same.
      $('#currency').disabled = true;
      $('#notes').value = '';
      d.items.forEach((it) => addItem(it.kind, it.text, it.id, it.price));
      return;
    } catch (e) { $('#err').textContent = 'Could not load the baseline receipt: ' + e.message; parentToken = null; }
  }
  // Draft handed over from the AI estimator (/estimate), used once.
  let draft = null;
  try { draft = JSON.parse(sessionStorage.getItem('ss-draft') || 'null'); sessionStorage.removeItem('ss-draft'); } catch { /* ignore */ }
  if (draft && Array.isArray(draft.items) && draft.items.length) {
    $('#title').value = String(draft.title || '').slice(0, 160);
    if (draft.client) $('#client').value = String(draft.client).slice(0, 120);
    $('#notes').value = String(draft.notes || '').slice(0, 2000);
    if (CURRENCIES.includes(draft.currency)) $('#currency').value = draft.currency;
    const b = $('#cr-banner');
    b.textContent = 'Filled in from your AI estimate. Check every line and price before you send it.';
    b.classList.remove('hidden');
    draft.items.slice(0, 100).forEach((it) => addItem(['scope', 'uat', 'out'].includes(it.kind) ? it.kind : 'scope', String(it.text || ''), undefined, it.price));
    return;
  }
  addItem('scope'); addItem('uat'); addItem('out');
}
// Signed in and coming from a project: file the link there and fill in your details.
const projectId = new URLSearchParams(location.search).get('project');
async function accountDefaults() {
  if (!projectId) return;
  const s = await Auth.fullySignedIn();
  if (!s) { $('#err').textContent = 'Sign in to save this scope to your project.'; return; }
  const { sb } = await Auth.init();
  const { data: p } = await sb.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
  if (!p) return;
  if (!$('#agency').value) $('#agency').value = p.business_name || p.name || '';
  if (!$('#agencyEmail').value) $('#agencyEmail').value = p.email || s.user.email || '';
  if (!$('#payInstructions').value) $('#payInstructions').value = p.pay_instructions || '';
}
init().then(accountDefaults);

$('#f').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#err').textContent = '';
  const items = [...box.children].map((r) => ({ id: r.dataset.id || undefined, kind: r.querySelector('select').value, text: r.querySelector('input').value.trim(), price: r.querySelector('.amt-in').value.trim() || undefined })).filter((i) => i.text);
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    const body = { title: $('#title').value, client: $('#client').value, agency: $('#agency').value, agencyEmail: $('#agencyEmail').value, notes: $('#notes').value, currency: $('#currency').value, payLink: $('#payLink').value.trim(), payInstructions: $('#payInstructions').value.trim(), items };
    if (parentToken) body.parent = parentToken;
    if (projectId) body.projectId = projectId;
    // Signed-in senders are verified on the client's page, so send the session when there is one.
    const { token, documentId } = await (typeof Auth !== 'undefined' ? Auth.api('seal', body) : api('seal', body));
    if (documentId) { $('#filed').classList.remove('hidden'); const b = $('#to-project'); b.href = '/app#/projects/' + projectId; b.classList.remove('hidden'); }
    const url = `${location.origin}/sign#${token}`;
    const link = $('#link');
    link.value = url;
    link.parentElement.append(copyBtn(link));
    $('#preview').href = url;
    $('#f').classList.add('hidden');
    $('#done').classList.remove('hidden');
  } catch (err) { $('#err').textContent = err.message; btn.disabled = false; }
});
