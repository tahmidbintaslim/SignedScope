'use strict';
const token = tokenFromHash();
function diffStatus(it, parent) {
  if (!parent) return null;
  const p = parent.items.find((x) => x.id === it.id);
  if (!p) return 'added';
  if (p.text !== it.text || p.kind !== it.kind || p.price !== it.price) return 'changed';
  return null;
}
let data;
// Live total of accepted, priced items, shown next to the signed baseline on a change request.
function updateTotal() {
  if (!data || !data.items.some((i) => i.price != null)) return;
  const cur = data.currency || 'USD';
  // Undecided priced lines count as proposed, so the total starts at the full price
  // and only drops when the client rejects a line.
  let sum = 0, decided = 0;
  for (const it of data.items) {
    if (it.price == null) continue;
    const r = document.querySelector(`input[name="d-${CSS.escape(it.id)}"]:checked`);
    if (r) decided++;
    if (!r || r.value === 'accepted') sum += Math.round(it.price * 100);
  }
  sum /= 100;
  const priced = data.items.filter((i) => i.price != null).length;
  $('#total-label').textContent = decided < priced ? 'Proposed total' : 'Total you are approving';
  const base = data.parent && data.parent.total != null ? data.parent.total : null;
  $('#total-amt').textContent = money(sum, cur);
  const delta = base != null ? Math.round((sum - base) * 100) / 100 : 0;
  $('#total-delta').textContent = base != null ? `Signed before: ${money(base, cur)} · change: ${delta >= 0 ? '+' : '−'}${money(Math.abs(delta), cur)}` : 'Rejecting a priced line removes it from the total.';
  $('#total').classList.remove('hidden');
}
// Shows the empty state (with a heading and a way forward) instead of a bare error line.
function fail(msg) { $('#err').textContent = msg; $('#empty').classList.remove('hidden'); }
async function init() {
  if (!token) { fail('Part of this sign-off link is missing.'); return; }
  try { ({ data } = await api('verify', { token })); if (data.type !== 'doc') throw new Error('This is not a sign-off link'); }
  catch (e) { fail(e.message); return; }
  $('#meta').textContent = `From ${data.agency}${data.agencyEmail ? ' <' + data.agencyEmail + '>' : ''} to ${data.client} · revision ${data.revision || 1}`;
  $('#title').textContent = data.title;
  $('#notes').textContent = data.notes || '';
  if (data.parent) {
    const b = $('#cr');
    b.textContent = `This is a change request against "${data.parent.title}", signed by ${data.parent.signer} on ${fmt(data.parent.signedAt)}. Colored bars show added, changed and removed items.`;
    b.classList.remove('hidden');
    const removed = data.parent.items.filter((p) => !data.items.some((i) => i.id === p.id));
    if (removed.length) $('#removed').append(el('h3', { text: 'Removed since the baseline', style: 'margin-top:20px' }), ...removed.map((r) => el('p', { class: 'diff-del', text: `${KIND[r.kind]}: ${r.text}` })));
  }
  const list = $('#list');
  for (const kind of ['scope', 'uat', 'out']) {
    const its = data.items.filter((i) => i.kind === kind);
    if (!its.length) continue;
    list.append(el('h3', { text: KIND[kind], style: 'margin-top:24px' }));
    for (const it of its) {
      const d = diffStatus(it, data.parent);
      const opts = kind === 'out' ? [['acknowledged', 'Acknowledged: not included']] : [['accepted', 'Accept'], ['rejected', 'Reject']];
      const note = el('input', { class: 'hidden', placeholder: 'What needs to change?', maxlength: 600, 'data-note': it.id });
      const radios = opts.map(([v, t]) => el('label', {}, el('input', { type: 'radio', name: 'd-' + it.id, value: v, required: true, onchange: () => { note.classList.toggle('hidden', v !== 'rejected'); updateTotal(); } }), t));
      const prev = data.parent && data.parent.items.find((x) => x.id === it.id);
      list.append(el('div', { class: 'decide' + (d === 'added' ? ' diff-add' : d === 'changed' ? ' diff-chg' : '') },
        d ? el('span', { class: 'pill ' + (d === 'added' ? 'ok' : 'chg'), text: d }) : null,
        el('div', { class: 'head' }, el('div', { text: it.text, style: 'white-space:pre-wrap;margin-top:4px' }),
          it.price != null ? el('span', { class: 'amt', text: money(it.price, data.currency) }) : null),
        d === 'changed' && prev ? el('div', { class: 'muted small', text: 'Was: ' + prev.text + (prev.price != null ? ` (${money(prev.price, data.currency)})` : '') }) : null,
        el('div', { class: 'opts' }, radios), note));
    }
  }
  updateTotal();
  $('#doc').classList.remove('hidden');
}
init();
$('#f').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#ferr').textContent = '';
  const decisions = {};
  document.querySelectorAll('input[type=radio]:checked').forEach((r) => {
    const id = r.name.slice(2);
    const n = document.querySelector(`[data-note="${CSS.escape(id)}"]`);
    decisions[id] = { status: r.value, note: n && r.value === 'rejected' ? n.value : '' };
  });
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    const { receipt, outcome, payable } = await api('sign', { token, name: $('#name').value, email: $('#email').value, agree: $('#agree').checked, decisions });
    const url = `${location.origin}/receipt#${receipt}`;
    $('#rlink').value = url; $('#rlink').parentElement.append(copyBtn($('#rlink')));
    $('#ropen').href = url;
    $('#done-h').textContent = outcome === 'approved' ? 'Signed: everything approved' : 'Signed with requested changes';
    // Only offer payment when something payable was approved.
    if (payable) { const pay = $('#pay'); pay.href = data.payLink; pay.classList.remove('hidden'); $('#pay-host').textContent = payNote(data.agency, data.payLink); }
    $('#doc').classList.add('hidden'); $('#done').classList.remove('hidden');
  } catch (err) { $('#ferr').textContent = err.message; btn.disabled = false; }
});
