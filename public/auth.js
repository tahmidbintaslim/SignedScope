'use strict';
// Accounts: loads the public Supabase config, creates the browser client and offers helpers.
// Pages that don't need an account still work when accounts aren't set up (enabled: false).
const Auth = (() => {
  let ready = null;
  async function init() {
    if (ready) return ready;
    ready = (async () => {
      const cfg = await fetch('/api/config').then((r) => r.json()).catch(() => ({ enabled: false }));
      if (!cfg.enabled || !window.supabase) return { enabled: false };
      const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      return { enabled: true, sb };
    })();
    return ready;
  }
  async function session() {
    const a = await init();
    if (!a.enabled) return null;
    const { data } = await a.sb.auth.getSession();
    return data.session;
  }
  // Signed in, and past the two-factor step if the user turned it on.
  async function fullySignedIn() {
    const s = await session();
    if (!s) return null;
    const { sb } = await init();
    const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    return data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2' ? null : s;
  }
  // Sends people to /login (and back afterwards) when a page needs an account.
  async function require() {
    const s = await fullySignedIn();
    if (!s) { location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search + location.hash); return new Promise(() => {}); }
    return s;
  }
  // Like api() in common.js, plus the session token for endpoints that file into a project.
  async function api(path, body) {
    const s = await session();
    const r = await fetch('/api/' + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(s ? { authorization: 'Bearer ' + s.access_token } : {}) },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({ error: 'Network error' }));
    if (!r.ok) throw new Error(j.error || 'Request failed');
    return j;
  }
  // Throws on a Supabase error so callers can use one try/catch.
  const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  return { init, session, fullySignedIn, require, api, ok };
})();
