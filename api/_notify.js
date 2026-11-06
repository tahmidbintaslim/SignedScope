'use strict';
// Transactional email to the freelancer (never to their client) through Resend.
// Off unless RESEND_API_KEY and EMAIL_FROM are set. Plain text only; failures are logged, not thrown.
const db = require('./_supabase');

const enabled = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
const appUrl = () => (process.env.APP_URL || '').replace(/\/$/, '');

async function send(to, subject, text) {
  if (!enabled() || !to) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject: subject.slice(0, 200), text }),
    });
    if (!r.ok) console.error('email', r.status, (await r.text()).slice(0, 200));
    return r.ok;
  } catch (e) { console.error('email', e.message); return false; }
}

// The owner's email and preferences, or null.
async function owner(ownerId) {
  const { data } = await db.admin().from('profiles').select('email, name, notify_signed, notify_viewed, notify_overdue').eq('id', ownerId).maybeSingle();
  return data && data.email ? data : null;
}

const projectLink = (projectId) => (appUrl() && projectId ? `\n\nOpen the project: ${appUrl()}/app#/projects/${projectId}` : '');

// event: 'viewed' | 'signed'
async function documentEvent(event, row, extra = {}) {
  if (!enabled()) return;
  const o = await owner(row.owner);
  if (!o || (event === 'viewed' && !o.notify_viewed) || (event === 'signed' && !o.notify_signed)) return;
  const title = row.title || extra.title || 'your document';
  if (event === 'viewed') {
    await send(o.email, `Your client opened "${title}"`, `Your client just opened "${title}". You'll get another email when they sign.${projectLink(row.project_id)}`);
  } else {
    const approved = extra.outcome === 'approved';
    await send(o.email, approved ? `Signed: "${title}"` : `Changes requested on "${title}"`,
      `${extra.signer || 'Your client'} ${approved ? 'approved and signed' : 'signed and asked for changes on'} "${title}".${extra.total != null ? `\nApproved total: ${extra.total}` : ''}${projectLink(row.project_id)}`);
  }
}

module.exports = { enabled, send, owner, documentEvent, appUrl };
