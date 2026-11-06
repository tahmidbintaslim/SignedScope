'use strict';
const crypto = require('crypto');
const { seal, open, str, email, acceptedTotal, payable, handler, httpError } = require('./_lib');
const db = require('./_supabase');

// Client signs off a document. Returns a signed receipt token.
module.exports = handler(async (body, req) => {
  const { obj: doc, hash: docHash } = open(body.token, 'doc');
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
  const token = seal(receipt);
  if (db.configured()) await recordSigning(docHash, receipt, token);
  const canPay = (Boolean(doc.payLink) || Boolean(doc.payInstructions)) && payable(doc.items, decisions);
  return { receipt: token, outcome: receipt.outcome, payable: canPay };
});

// Updates the freelancer's dashboard when a filed document is signed. Never blocks signing.
async function recordSigning(docHash, receipt, token) {
  try {
    const { data } = await db.admin().from('documents').update({
      status: receipt.outcome === 'approved' ? 'signed' : 'changes_requested',
      signed_at: receipt.signedAt, signer_name: receipt.signer.name, receipt_token: token,
      ...(receipt.totals ? { total: receipt.totals.accepted } : {}),
    }).eq('doc_hash', docHash).select('owner, project_id').maybeSingle();
    if (!data) return;
    if (receipt.outcome === 'approved') {
      await db.admin().from('projects').update({ status: 'approved' }).eq('id', data.project_id).in('status', ['lead', 'estimating', 'proposal_sent']);
    }
    await db.logActivity(data.owner, data.project_id, 'document_signed', { outcome: receipt.outcome, signer: receipt.signer.name, title: receipt.doc.title });
  } catch (e) { console.error('recordSigning', e.message); }
}
