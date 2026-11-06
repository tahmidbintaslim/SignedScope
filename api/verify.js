'use strict';
const { open, handler } = require('./_lib');
const db = require('./_supabase');

// Anyone holding a link can check it was issued by SignedScope and not modified.
// The sign page sends viewed:true so the freelancer's dashboard can show "Viewed".
module.exports = handler(async (body) => {
  const { obj, hash } = open(body.token);
  if (body.viewed === true && obj.type === 'doc' && db.configured()) await markViewed(hash);
  return { valid: true, hash, data: obj };
});

async function markViewed(docHash) {
  try {
    const { data } = await db.admin().from('documents').update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('doc_hash', docHash).eq('status', 'sent').select('owner, project_id, title').maybeSingle();
    if (data) await db.logActivity(data.owner, data.project_id, 'document_viewed', { title: data.title });
  } catch (e) { console.error('markViewed', e.message); }
}
