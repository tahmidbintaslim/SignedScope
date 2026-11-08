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

// The token's claims, after Supabase has verified it (used only to read "aal").
const claims = (jwt) => { try { return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8')); } catch { return {}; } };

// Returns the signed-in user for a request with "Authorization: Bearer <access token>", or null.
// A user with a verified authenticator app must present a two-step (aal2) session, as the database requires.
async function userFrom(req) {
  if (!configured()) return null;
  const m = /^Bearer\s+(\S{20,4096})$/.exec(String(req.headers.authorization || ''));
  if (!m) return null;
  const { data, error } = await admin().auth.getUser(m[1]);
  if (error || !data || !data.user) return null;
  if (claims(m[1]).aal !== 'aal2') {
    const f = await admin().auth.admin.mfa.listFactors({ userId: data.user.id });
    if (f.error) return null;
    if ((f.data.factors || []).some((x) => x.status === 'verified')) return null;
  }
  return data.user;
}

// The verified sign-in email for a user (auth.users), not the editable profile field.
async function userEmail(id) {
  const { data, error } = await admin().auth.admin.getUserById(id);
  return error || !data || !data.user ? null : data.user.email || null;
}

// Best effort: a failed activity write never breaks the request that caused it.
async function logActivity(owner, projectId, kind, detail = {}) {
  try { await admin().from('activity').insert({ owner, project_id: projectId || null, kind, detail, actor: 'server' }); } catch (e) { console.error('activity', e.message); }
}

module.exports = { configured, admin, userFrom, userEmail, logActivity };
