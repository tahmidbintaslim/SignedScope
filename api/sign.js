'use strict';
const crypto = require('crypto');
const { seal, open, str, email, acceptedTotal, payable, amountDue, handler, httpError } = require('./_lib');
const db = require('./_supabase');
const notify = require('./_notify');
const { limited, clientIp } = require('./_limit');

// Client signs off a document. Returns a signed receipt token.
module.exports = handler(async (body, req) => {
  const { obj: doc, hash: docHash } = open(body.token, 'doc');
  if (await limited('sign', clientIp(req), { windowMs: 10 * 60 * 1000, max: 20 })) throw httpError(429, 'Too many tries. Wait a few minutes and try again.');
  if (await limited('sign-doc', docHash, { windowMs: 60 * 60 * 1000, max: 10 })) throw httpError(429, 'This link was signed too many times in the last hour.');
  // A filed document is signed once. Refuse before issuing a receipt, so no valid receipt can
  // disagree with the sender's record. (Unfiled links are stateless and cannot be tracked.)
  if (db.configured()) {
    const { data: filed } = await db.admin().from('documents').select('status').eq('doc_hash', docHash).maybeSingle();
    if (filed && !['sent', 'viewed'].includes(filed.status)) throw httpError(409, 'This link was already signed. Ask the sender for a new revision if something changed.');
  }
  const name = str(body.name, 120, 'Your name');
  const signerEmail = email(body.email, 'Your email');
  if (body.agree !== true) throw httpError(400, 'Please confirm the declaration');
  const input = body.decisions && typeof body.decisions === 'object' ? body.decisions : {};
  const decisions = {};
  for (const it of doc.items) {
    const d = input[it.id] || {};
    const allowed = it.kind === 'out' ? ['acknowledged'] : ['accepted', 'rejected'];
    if (!allowed.includes(d.status)) throw httpError(400, `Decide every item ("${it.text.slice(0, 40)}")`);
    const note = str(d.note, 600, 'Comment', false);
    if (d.status === 'rejected' && !note) throw httpError(400, `Add a comment for rejected item "${it.text.slice(0, 40)}"`);
    decisions[it.id] = note ? { status: d.status, note } : { status: d.status };
  }
  const rejected = Object.values(decisions).filter((d) => d.status === 'rejected').length;
  const ua = String(req.headers['user-agent'] || '');
  const receipt = {
    type: 'receipt',
    docHash,
    doc,
    signer: { name, email: signerEmail },
    decisions,
    totals: doc.items.some((it) => it.price != null)
      ? { currency: doc.currency || 'USD', accepted: acceptedTotal(doc.items, decisions), baseline: doc.parent && doc.parent.total != null && (doc.parent.currency || 'USD') === (doc.currency || 'USD') ? doc.parent.total : null }
      : undefined,
    outcome: rejected ? 'changes_requested' : 'approved',
    signedAt: new Date().toISOString(),
    evidence: {
      country: String(req.headers['x-vercel-ip-country'] || '').slice(0, 2),
      uaHash: crypto.createHash('sha256').update(ua).digest('hex').slice(0, 16),
    },
  };
  // Deposit due now (and the balance later), from the approved amount.
  receipt.due = amountDue(doc, receipt.totals);
  if (!receipt.due) delete receipt.due;
  const token = seal(receipt);
  if (db.configured()) await recordSigning(docHash, receipt, token);
  const canPay = (Boolean(doc.payLink) || Boolean(doc.payInstructions)) && payable(doc.items, decisions);
  return { receipt: token, outcome: receipt.outcome, payable: canPay, ...(receipt.due ? { due: receipt.due } : {}) };
});

// Updates the freelancer's dashboard when a filed document is signed. Never blocks signing.
// A filed document is recorded once: a later signature on the same link never overwrites it.
async function recordSigning(docHash, receipt, token) {
  try {
    const { data } = await db.admin().from('documents').update({
      status: receipt.outcome === 'approved' ? 'signed' : 'changes_requested',
      signed_at: receipt.signedAt, signer_name: receipt.signer.name, receipt_token: token,
      ...(receipt.totals ? { total: receipt.totals.accepted } : {}),
    }).eq('doc_hash', docHash).in('status', ['sent', 'viewed']).select('id, owner, project_id').maybeSingle();
    if (!data) return;
    if (receipt.outcome === 'approved') {
      await db.admin().from('projects').update({ status: 'approved' }).eq('id', data.project_id).in('status', ['lead', 'estimating', 'proposal_sent']);
      await scheduleToPayments(data, receipt);
    } else if (receipt.due) {
      // A deposit follows what was approved, so it is requested even when some lines were rejected
      // (the client was shown it as due). A fixed schedule assumes the whole scope, so it waits.
      await scheduleToPayments(data, receipt);
    }
    await db.logActivity(data.owner, data.project_id, 'document_signed', { outcome: receipt.outcome, signer: receipt.signer.name, title: receipt.doc.title });
    await notify.documentEvent('signed', { ...data, title: receipt.doc.title }, { outcome: receipt.outcome, signer: receipt.signer.name,
      total: receipt.totals ? new Intl.NumberFormat('en', { style: 'currency', currency: receipt.totals.currency }).format(receipt.totals.accepted) : null });
  } catch (e) { console.error('recordSigning', e.message); }
}

// A deposit rule becomes two payment requests: the deposit now and the balance later.
function depositPlan(receipt) {
  const d = receipt.due;
  if (!d) return [];
  if (d.pct === 100) return [{ label: receipt.doc.parent ? 'Approved changes (100%)' : 'Full payment (100%)', amount: d.now }];
  return [{ label: `Deposit ${d.pct}%`, amount: d.now }, ...(d.later > 0 ? [{ label: `Balance ${100 - d.pct}%`, amount: d.later }] : [])];
}

// An approved payment schedule becomes payment requests on the project, once per document.
async function scheduleToPayments(row, receipt) {
  const plan = (receipt.doc.schedule || []).length ? receipt.doc.schedule : depositPlan(receipt);
  if (!plan.length || !row.project_id) return;
  const { data: existing } = await db.admin().from('payments').select('id').eq('document_id', row.id).limit(1);
  if (existing && existing.length) return;
  await db.admin().from('payments').insert(plan.map((p) => ({
    owner: row.owner, project_id: row.project_id, document_id: row.id, label: p.label, amount: p.amount, currency: receipt.doc.currency,
  })));
  await db.logActivity(row.owner, row.project_id, 'payment_requested', { label: `${plan.length} payments from the signed schedule` });
}
