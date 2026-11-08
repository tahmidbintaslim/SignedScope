'use strict';
// GET: public browser config: the Supabase project URL and its anon (public) key. Both are safe to
// expose; Row Level Security protects the data. Returns enabled:false until accounts are set up.
// POST (signed in): recreates the caller's missing profile row, which the sign-up trigger normally
// makes. Browsers can't insert profiles, so Settings calls this when its update finds no row.
// (Kept in this file to stay within the hosting plan's function limit.)
const { handler, httpError } = require('./_lib');
const db = require('./_supabase');

const repairProfile = handler(async (body, req) => {
  if (!db.configured()) throw httpError(503, 'Accounts are not set up');
  const user = await db.userFrom(req);
  if (!user) throw httpError(401, 'Please sign in again');
  const { error } = await db.admin().from('profiles')
    .upsert({ id: user.id, email: (user.email || '').slice(0, 254) || null }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw httpError(500, 'Could not create your profile');
  return { ok: true };
});

module.exports = (req, res) => {
  if (req.method === 'POST') return repairProfile(req, res);
  const enabled = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json(enabled ? { enabled, supabaseUrl: process.env.SUPABASE_URL, supabaseAnonKey: process.env.SUPABASE_ANON_KEY } : { enabled });
};
