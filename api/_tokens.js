'use strict';
// Opening a signed link during a key rotation. A link signed with the current key is trusted as
// before. A link signed with a previous key (SIGNING_SECRET_PREVIOUS) is trusted only if
// SignedScope recorded issuing it: a filed document (by its hash) or that document's receipt.
// So a retired key that leaked cannot be used to forge new links, while filed links keep working.
const { open, httpError } = require('./_lib');
const db = require('./_supabase');

async function openIssued(token, expectedType) {
  const r = open(token, expectedType);
  if (!r.legacy) return r;
  if (db.configured()) {
    const [col, val] = r.obj.type === 'receipt' ? ['receipt_token', token] : ['doc_hash', r.hash];
    const { data } = await db.admin().from('documents').select('id').eq(col, val).maybeSingle();
    if (data) return r;
  }
  throw httpError(400, 'This link was signed with a retired key and is not on record. Ask the sender for a new link.');
}

module.exports = { openIssued };
