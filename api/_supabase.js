'use strict';
// Server-side Supabase access. The service role key never leaves the server; it is used only
// after the caller's own session has been checked, or for signing events tied to a sealed link.
const URL_ = () => process.env.SUPABASE_URL;
const configured = () => Boolean(URL_() && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);

let adminClient;
function admin() {
  if (!adminClient) {
    const { createClient } = require('@supabase/supabase-js');
    adminClient = createClient(URL_(), process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return adminClient;
}

// Returns the signed-in user for a request with "Authorization: Bearer <access token>", or null.
async function userFrom(req) {
  if (!configured()) return null;
  const m = /^Bearer\s+(\S{20,4096})$/.exec(String(req.headers.authorization || ''));
  if (!m) return null;
  const { data, error } = await admin().auth.getUser(m[1]);
  return error || !data || !data.user ? null : data.user;
}

// Best effort: a failed activity write never breaks the request that caused it.
async function logActivity(owner, projectId, kind, detail = {}) {
  try { await admin().from('activity').insert({ owner, project_id: projectId || null, kind, detail }); } catch (e) { console.error('activity', e.message); }
}

module.exports = { configured, admin, userFrom, logActivity };
