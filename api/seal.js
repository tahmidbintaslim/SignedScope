'use strict';
const { seal, open, str, email, items, currency, payLink, handler, httpError } = require('./_lib');

// Agency creates a scope document. Returns a signed share token for the client.
module.exports = handler(async (body) => {
  const doc = {
    type: 'doc',
    title: str(body.title, 160, 'Project title'),
    agency: str(body.agency, 120, 'Agency name'),
    agencyEmail: email(body.agencyEmail, 'Agency email'),
    client: str(body.client, 120, 'Client name'),
    notes: str(body.notes, 2000, 'Notes', false),
    items: items(body.items),
    currency: currency(body.currency),
    payLink: payLink(body.payLink),
    createdAt: new Date().toISOString(),
  };
  if (body.parent) {
    // Change request: link to the previously signed receipt (baseline).
    const { obj: r, hash } = open(body.parent, 'receipt');
    doc.parent = { receiptHash: hash, docHash: r.docHash, title: r.doc.title, signedAt: r.signedAt, signer: r.signer.name, items: r.doc.items };
    if (r.totals) doc.parent.total = r.totals.accepted;
    doc.revision = (r.doc.revision || 1) + 1;
  } else {
    doc.revision = 1;
  }
  const token = seal(doc);
  if (token.length > 60_000) throw httpError(413, 'Document too large for a link; trim item text');
  return { token };
});
