'use strict';
// GET: public browser config: the Supabase project URL, its anon (public) key and the Clerk
// publishable key. All are safe to expose; Row Level Security protects the data. Returns
// enabled:false until accounts are set up.
// POST (signed in): creates the caller's profile row on first sign-in (Clerk users have no
// database trigger), with the email from their verified Clerk session.
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
  const enabled = db.configured();
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json(enabled
    ? { enabled, supabaseUrl: process.env.SUPABASE_URL, supabaseAnonKey: process.env.SUPABASE_ANON_KEY, clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY }
    : { enabled });
};
