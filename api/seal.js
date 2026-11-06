'use strict';
const { seal, open, str, email, items, currency, payLink, sections, schedule, handler, httpError, sha256 } = require('./_lib');
const db = require('./_supabase');

// Agency creates a scope, proposal or agreement. Returns a signed share token for the client.
const KINDS = ['scope', 'proposal', 'agreement'];
module.exports = handler(async (body, req) => {
  const doc = {
    type: 'doc',
    title: str(body.title, 160, 'Project title'),
    agency: str(body.agency, 120, 'Agency name'),
    agencyEmail: email(body.agencyEmail, 'Agency email'),
    client: str(body.client, 120, 'Client name'),
    notes: str(body.notes, 2000, 'Notes', false),
    kind: KINDS.includes(body.kind) ? body.kind : 'scope',
    sections: sections(body.sections),
    items: items(body.items),
    currency: currency(body.currency),
    schedule: schedule(body.schedule),
    payLink: payLink(body.payLink),
    // Plain-text payment details such as bank transfer or PromptPay, shown after approval.
    payInstructions: str(body.payInstructions, 800, 'Payment instructions', false),
    createdAt: new Date().toISOString(),
  };
  if (body.parent) {
    // Change request: link to the previously signed receipt (baseline).
    const { obj: r, hash } = open(body.parent, 'receipt');
    doc.parent = { receiptHash: hash, docHash: r.docHash, title: r.doc.title, signedAt: r.signedAt, signer: r.signer.name, items: r.doc.items };
    if (r.totals) {
      // Totals are only comparable in one currency, so a change request keeps the baseline's.
      if (r.totals.currency !== doc.currency) throw httpError(400, `Use ${r.totals.currency}, the currency of the signed scope this change builds on`);
      doc.parent.total = r.totals.accepted;
      doc.parent.currency = r.totals.currency;
    }
    doc.revision = (r.doc.revision || 1) + 1;
  } else {
    doc.revision = 1;
  }
  // Filing into a project needs a signed-in owner; check before sealing so nothing half-saves.
  let user = null, project = null;
  if (body.projectId) {
    if (!db.configured()) throw httpError(503, 'Accounts are not set up yet');
    user = await db.userFrom(req);
    if (!user) throw httpError(401, 'Please sign in again');
    if (typeof body.projectId !== 'string' || !/^[0-9a-f-]{36}$/.test(body.projectId)) throw httpError(400, 'Invalid project');
    const { data } = await db.admin().from('projects').select('id, status').eq('id', body.projectId).eq('owner', user.id).maybeSingle();
    if (!data) throw httpError(404, 'Project not found');
    project = data;
  }
  const token = seal(doc);
  if (token.length > 60_000) throw httpError(413, 'Document too large for a link; trim item text');
  if (!project) return { token };

  const priced = doc.items.filter((it) => it.price != null);
  const { data: row, error } = await db.admin().from('documents').insert({
    owner: user.id, project_id: project.id, kind: doc.parent ? 'change_request' : doc.kind, title: doc.title, revision: doc.revision,
    token, doc_hash: sha256(token.split('.')[1]), currency: doc.currency,
    total: priced.length ? priced.reduce((t, it) => t + it.price, 0) : null,
  }).select('id').single();
  if (error) { console.error('documents insert', error.message); throw httpError(500, 'Could not save to the project'); }
  if (['lead', 'estimating'].includes(project.status)) await db.admin().from('projects').update({ status: 'proposal_sent' }).eq('id', project.id);
  await db.logActivity(user.id, project.id, 'document_sent', { title: doc.title, revision: doc.revision });
  return { token, documentId: row.id };
});
