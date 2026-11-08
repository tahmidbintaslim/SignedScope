'use strict';
// Daily (vercel.json "crons"): emails each freelancer a short list of client payments that
// are 1, 7, 14 or 30 days overdue, so reminders are timely without arriving every day.
// Vercel sends "Authorization: Bearer $CRON_SECRET"; anything else is refused.
const crypto = require('crypto');
const db = require('./_supabase');
const notify = require('./_notify');

const DAYS = [1, 7, 14, 30];

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET;
  const got = Buffer.from(String(req.headers.authorization || '')), want = Buffer.from(`Bearer ${secret || ''}`);
  if (!secret || got.length !== want.length || !crypto.timingSafeEqual(got, want)) return res.status(401).json({ error: 'Unauthorized' });
  if (!db.configured() || !notify.enabled()) return res.status(200).json({ ok: true, sent: 0, skipped: 'not configured' });
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  const { data: due, error } = await db.admin().from('payments').select('owner, project_id, label, amount, currency, due_date').eq('status', 'requested');
  if (error) return res.status(500).json({ error: 'Query failed' });
  const byOwner = {};
  for (const p of due || []) {
    if (!p.due_date) continue;
    const late = Math.round((today - new Date(p.due_date + 'T00:00:00Z')) / 86400000);
    if (DAYS.includes(late)) (byOwner[p.owner] = byOwner[p.owner] || []).push({ ...p, late });
  }
  let sent = 0;
  for (const [ownerId, list] of Object.entries(byOwner)) {
    const o = await notify.owner(ownerId);
    if (!o || !o.notify_overdue) continue;
    const lines = list.map((p) => `- ${p.label}: ${new Intl.NumberFormat('en', { style: 'currency', currency: p.currency }).format(p.amount)}, ${p.late} day${p.late === 1 ? '' : 's'} overdue`);
    const link = notify.appUrl() ? `\n\nSee them in your workspace: ${notify.appUrl()}/app` : '';
    if (await notify.send(o.email, `${list.length} client payment${list.length === 1 ? '' : 's'} overdue`, `These payments are overdue:\n${lines.join('\n')}\n\nSignedScope doesn't contact your client; follow up in your usual way.${link}`)) sent++;
  }
  return res.status(200).json({ ok: true, sent });
};
