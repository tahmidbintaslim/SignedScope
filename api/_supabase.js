'use strict';
// Server-side Supabase access. The service role key never leaves the server; it is used only
// after the caller's own session has been checked, or for signing events tied to a sealed link.
const URL_ = () => process.env.SUPABASE_URL;
const configured = () => Boolean(URL_() && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.CLERK_PUBLISHABLE_KEY);

let adminClient;
function admin() {
  if (!adminClient) {
    const { createClient } = require('@supabase/supabase-js');
    adminClient = createClient(URL_(), process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return adminClient;
}

// Returns the signed-in user ({ id: Clerk user id, email }) for a request with
// "Authorization: Bearer <Clerk session token>", or null. Clerk handles two-step sign-in, so a
// session token is only issued once every step is done.
const clerk = require('./_clerk');
const allowedOrigins = () => [process.env.APP_URL, process.env.SITE_URL].filter(Boolean).map((u) => u.replace(/\/$/, ''));
async function userFrom(req) {
  if (!configured()) return null;
  const m = /^Bearer\s+(\S{20,4096})$/.exec(String(req.headers.authorization || ''));
  if (!m) return null;
  return clerk.verify(m[1], { allowedOrigins: allowedOrigins() });
}

// The owner's sign-in email, as stored on their profile from the Clerk session token.
async function userEmail(id) {
  const { data, error } = await admin().from('profiles').select('email').eq('id', id).maybeSingle();
  return error || !data ? null : data.email || null;
}

// Best effort: a failed activity write never breaks the request that caused it.
async function logActivity(owner, projectId, kind, detail = {}) {
  try { await admin().from('activity').insert({ owner, project_id: projectId || null, kind, detail, actor: 'server' }); } catch (e) { console.error('activity', e.message); }
}

module.exports = { configured, admin, userFrom, userEmail, logActivity };
