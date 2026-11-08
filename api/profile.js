'use strict';
// Recreates a signed-in user's missing profile row (normally made by the handle_new_user trigger).
// Browsers can't insert profiles themselves, so Settings calls this when its update finds no row.
const { handler, httpError } = require('./_lib');
const db = require('./_supabase');

module.exports = handler(async (body, req) => {
  if (!db.configured()) throw httpError(503, 'Accounts are not set up');
  const user = await db.userFrom(req);
  if (!user) throw httpError(401, 'Please sign in again');
  const { error } = await db.admin().from('profiles')
    .upsert({ id: user.id, email: (user.email || '').slice(0, 254) || null }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw httpError(500, 'Could not create your profile');
  return { ok: true };
});
