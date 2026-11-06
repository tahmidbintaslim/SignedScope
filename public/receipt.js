'use strict';
const token = tokenFromHash();
// Shows the empty state (with a heading and a way forward) instead of a bare error line.
function fail(msg) { $('#err').textContent = msg; $('#empty').classList.remove('hidden'); }
async function init() {
  let res;
  try { res = await api('verify', { token }); if (res.data.type !== 'receipt') throw new Error('This is not a receipt link'); }
  catch (e) { fail(e.message || 'Invalid receipt'); return; }
  const r = res.data, d = r.doc;
  $('#title').textContent = d.title;
  $('#outcome').textContent = r.outcome === 'approved' ? 'Approved' : 'Changes requested';
  $('#outcome').classList.add(r.outcome === 'approved' ? 'ok' : 'warn');
  $('#meta').textContent = `Signed by ${r.signer.name}${r.signer.email ? ' <' + r.signer.email + '>' : ''} (${d.client}) on ${fmt(r.signedAt)} · prepared by ${d.agency} · revision ${d.revision || 1}`;
  const list = $('#list');
  for (const kind of ['scope', 'uat', 'out']) {
    const its = d.items.filter((i) => i.kind === kind);
    if (!its.length) continue;
    list.append(el('h3', { text: KIND[kind], style: 'margin-top:24px' }));
    for (const it of its) {
      const dec = r.decisions[it.id] || {};
      list.append(el('div', { class: 'decide' },
        el('span', { class: 'pill ' + (dec.status === 'rejected' ? 'warn' : 'ok'), text: dec.status || '?' }),
        el('div', { class: 'head' }, el('div', { text: it.text, style: 'white-space:pre-wrap;margin-top:4px' }),
          it.price != null ? el('span', { class: 'amt', style: dec.status === 'rejected' ? 'text-decoration:line-through;opacity:.6' : '', text: money(it.price, d.currency) }) : null),
        dec.note ? el('div', { class: 'muted small', text: 'Comment: ' + dec.note }) : null));
    }
  }
  if (r.totals) {
    const cur = r.totals.currency;
    $('#total-amt').textContent = money(r.totals.accepted, cur);
    if (r.totals.baseline != null) {
      const delta = Math.round((r.totals.accepted - r.totals.baseline) * 100) / 100;
      $('#total-delta').textContent = `Signed baseline ${money(r.totals.baseline, cur)} ${delta >= 0 ? '+' : '−'} approved changes ${money(Math.abs(delta), cur)} = ${money(r.totals.accepted, cur)}`;
    }
    $('#total').classList.remove('hidden');
  }
  // Only offer payment when something payable was approved (mirrors payable() in api/_lib.js).
  const accepted = d.items.some((it) => (r.decisions[it.id] || {}).status === 'accepted');
  if ((d.payLink || d.payInstructions) && accepted && (!r.totals || r.totals.accepted > 0)) showPayment(d, '#pay-note');
  $('#dh').textContent = r.docHash;
  $('#rh').textContent = res.hash;
  $('#ev').textContent = `Country: ${r.evidence.country || 'n/a'} · UA fingerprint: ${r.evidence.uaHash}` + (d.parent ? ` · Supersedes baseline receipt ${d.parent.receiptHash.slice(0, 16)}…` : '');
  $('#cr').href = '/new#cr=' + encodeURIComponent(token);
  $('#r').classList.remove('hidden');
}
init();
$('#print').addEventListener('click', () => window.print());
