'use strict';
// Transactional email to the freelancer (never to their client) through Resend.
// Off unless RESEND_API_KEY and EMAIL_FROM are set. Plain text only; failures are logged, not thrown.
const db = require('./_supabase');

const { limited } = require('./_limit');

const enabled = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
// Control characters never reach a subject or body (names and titles come from users).
const clean = (s) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
const PER_OWNER_HOUR = 30;
const appUrl = () => (process.env.APP_URL || '').replace(/\/$/, '');

async function send(to, subject, text) {
  if (!enabled() || !to) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject: clean(subject).slice(0, 200), text }),
    });
    if (!r.ok) console.error('email', r.status, (await r.text()).slice(0, 200));
    return r.ok;
  } catch (e) { console.error('email', e.message); return false; }
}

// The owner's verified sign-in email and notification preferences, or null.
// The address comes from auth.users, never from the editable profile, and each owner gets
// at most PER_OWNER_HOUR emails an hour.
async function owner(ownerId) {
  const { data } = await db.admin().from('profiles').select('name, notify_signed, notify_viewed, notify_overdue').eq('id', ownerId).maybeSingle();
  if (!data) return null;
  const email = await db.userEmail(ownerId);
  if (!email) return null;
  if (await limited('notify', ownerId, { windowMs: 60 * 60 * 1000, max: PER_OWNER_HOUR })) return null;
  return { ...data, email };
}

const projectLink = (projectId) => (appUrl() && projectId ? `\n\nOpen the project: ${appUrl()}/app#/projects/${projectId}` : '');

// event: 'viewed' | 'signed'
async function documentEvent(event, row, extra = {}) {
  if (!enabled()) return;
  const o = await owner(row.owner);
  if (!o || (event === 'viewed' && !o.notify_viewed) || (event === 'signed' && !o.notify_signed)) return;
  const title = clean(row.title || extra.title || 'your document').slice(0, 160);
  extra = { ...extra, signer: extra.signer ? clean(extra.signer).slice(0, 120) : extra.signer };
  if (event === 'viewed') {
    await send(o.email, `Your client opened "${title}"`, `Your client just opened "${title}". You'll get another email when they sign.${projectLink(row.project_id)}`);
  } else {
    const approved = extra.outcome === 'approved';
    await send(o.email, approved ? `Signed: "${title}"` : `Changes requested on "${title}"`,
      `${extra.signer || 'Your client'} ${approved ? 'approved and signed' : 'signed and asked for changes on'} "${title}".${extra.total != null ? `\nApproved total: ${extra.total}` : ''}${projectLink(row.project_id)}`);
  }
}

module.exports = { enabled, send, owner, documentEvent, appUrl };
