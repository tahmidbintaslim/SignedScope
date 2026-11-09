'use strict';
const { open, str, handler, httpError } = require('./_lib');
const db = require('./_supabase');
const notify = require('./_notify');
const { limited, clientIp } = require('./_limit');

// Anyone holding a link can check it was issued by SignedScope and not modified.
// The sign page sends viewed:true so the freelancer's dashboard can show "Viewed", and gets the
// questions asked on a filed link with their answers.
// action "ask": the client asks about one line of a filed link before signing. (Kept in this
// function: the Hobby plan allows 12.)
module.exports = handler(async (body, req) => {
  if (body.action === 'ask') return ask(body, req);
  const { obj, hash } = open(body.token);
  if (body.viewed === true && obj.type === 'doc' && db.configured()) {
    // The check itself never fails because the database is down.
    const row = await filed(hash).catch((e) => { console.error('filed', e.message); return null; });
    if (row) {
      await markViewed(row);
      return { valid: true, hash, data: obj, questions: await questionsFor(row.id).catch(() => []) };
    }
  }
  return { valid: true, hash, data: obj };
});

const filed = async (docHash) => (await db.admin().from('documents').select('id, owner, project_id, title, status').eq('doc_hash', docHash).maybeSingle()).data;

// Only what the client needs back: never the owner or the asker's details.
async function questionsFor(documentId) {
  const { data } = await db.admin().from('questions').select('id, item_id, question, answer, answered_at, created_at')
    .eq('document_id', documentId).order('created_at', { ascending: true }).limit(100);
  return (data || []).map((q) => ({ id: q.id, itemId: q.item_id, question: q.question, answer: q.answer, answeredAt: q.answered_at, createdAt: q.created_at }));
}

async function markViewed(row) {
  if (row.status !== 'sent') return;
  try {
    const { data } = await db.admin().from('documents').update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', row.id).eq('status', 'sent').select('owner, project_id, title').maybeSingle();
    if (data) {
      await db.logActivity(data.owner, data.project_id, 'document_viewed', { title: data.title });
      await notify.documentEvent('viewed', data);
    }
  } catch (e) { console.error('markViewed', e.message); }
}

async function ask(body, req) {
  const { obj: doc, hash } = open(body.token, 'doc');
  const item = doc.items.find((i) => i.id === body.itemId);
  if (!item) throw httpError(400, 'That line is not in this document');
  const question = str(body.question, 600, 'Your question');
  const name = str(body.name, 120, 'Your name', false);
  if (!db.configured()) throw httpError(409, 'Questions are not available on this link. Contact the sender directly.');
  const row = await filed(hash);
  if (!row) throw httpError(409, 'Questions are not available on this link. Contact the sender directly.');
  if (!['sent', 'viewed'].includes(row.status)) throw httpError(409, 'This link was already signed.');
  if (await limited('ask', clientIp(req), { windowMs: 10 * 60 * 1000, max: 10 })) throw httpError(429, 'Too many questions. Wait a few minutes and try again.');
  if (await limited('ask-doc', hash, { windowMs: 24 * 60 * 60 * 1000, max: 30 })) throw httpError(429, 'This link has had many questions today. Contact the sender directly.');
  const { error } = await db.admin().from('questions').insert({
    owner: row.owner, document_id: row.id, item_id: item.id, item_text: item.text.slice(0, 600), question, asker_name: name || null,
  });
  if (error) throw new Error(error.message);
  await db.logActivity(row.owner, row.project_id, 'question_asked', { title: row.title, item: item.text.slice(0, 120), question: question.slice(0, 300) });
  await notify.question(row, { item: item.text, question, name });
  return { ok: true, questions: await questionsFor(row.id) };
}
