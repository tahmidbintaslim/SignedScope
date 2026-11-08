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

// Whether a user has a verified authenticator app. Cached for 30 seconds per warm instance so an
// aal1 session doesn't cost an extra Auth API call on every request; errors are not cached.
// Trade-off: for up to 30 seconds after someone enrolls a factor, an older aal1 token still passes
// here (the database's own aal2 policies still apply to every table read through RLS).
const factorCache = new Map();
async function hasVerifiedFactor(id) {
  const hit = factorCache.get(id);
  if (hit && hit.until > Date.now()) return hit.value;
  const f = await admin().auth.admin.mfa.listFactors({ userId: id });
  if (f.error) return true; // fail closed
  const value = (f.data.factors || []).some((x) => x.status === 'verified');
  if (factorCache.size > 5000) factorCache.clear();
  factorCache.set(id, { value, until: Date.now() + 30 * 1000 });
  return value;
}

// Returns the signed-in user for a request with "Authorization: Bearer <access token>", or null.
// A user with a verified authenticator app must present a two-step (aal2) session, as the database requires.
async function userFrom(req) {
  if (!configured()) return null;
  const m = /^Bearer\s+(\S{20,4096})$/.exec(String(req.headers.authorization || ''));
  if (!m) return null;
  const { data, error } = await admin().auth.getUser(m[1]);
  if (error || !data || !data.user) return null;
  if (claims(m[1]).aal !== 'aal2' && (await hasVerifiedFactor(data.user.id))) return null;
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

module.exports = { clearFactorCache: () => factorCache.clear(), configured, admin, userFrom, userEmail, logActivity };
