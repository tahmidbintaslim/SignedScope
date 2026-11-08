'use strict';
// Sign-in: Google/GitHub OAuth or an emailed one-time link, then the TOTP step if enabled.
// Only same-origin paths: parsing with URL catches "/\\evil.com", tabs and other tricks.
const next = (() => {
  try { const u = new URL(new URLSearchParams(location.search).get('next') || '/app', location.origin); return u.origin === location.origin ? u.pathname + u.search + u.hash : '/app'; } catch { return '/app'; }
})();
const show = (id) => ['start', 'sent', 'mfa', 'off'].forEach((s) => { $('#step-' + s).hidden = s !== id; });
const fail = (e) => { $('#err').textContent = e.message || String(e); };

async function afterSession() {
  const { sb } = await Auth.init();
  const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') { show('mfa'); $('#code').focus(); return; }
  location.replace(next);
}

(async () => {
  const a = await Auth.init();
  if (!a.enabled) { show('off'); return; }
  const redirectTo = location.origin + '/login?next=' + encodeURIComponent(next);

  document.querySelectorAll('[data-provider]').forEach((b) => b.addEventListener('click', async () => {
    try { Auth.ok(await a.sb.auth.signInWithOAuth({ provider: b.dataset.provider, options: { redirectTo } })); } catch (e) { fail(e); }
  }));
  $('#email-f').addEventListener('submit', async (e) => {
    e.preventDefault(); $('#err').textContent = '';
    const email = $('#email').value.trim();
    try {
      Auth.ok(await a.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } }));
      $('#sent-to').textContent = email; show('sent');
    } catch (err) { fail(err); }
  });
  $('#again').addEventListener('click', () => show('start'));
  $('#mfa-f').addEventListener('submit', async (e) => {
    e.preventDefault(); $('#err').textContent = '';
    try {
      const f = Auth.ok(await a.sb.auth.mfa.listFactors());
      const factor = (f.totp || [])[0];
      if (!factor) throw new Error('No authenticator found for this account');
      Auth.ok(await a.sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code: $('#code').value.trim() }));
      location.replace(next);
    } catch (err) { fail(err); }
  });
  // Handlers are wired first so the code step works when we jump straight to it.
  // Arriving back from an emailed link or OAuth: the client finishes sign-in from the URL.
  a.sb.auth.onAuthStateChange((evt, s) => { if (s && evt === 'SIGNED_IN') afterSession(); });
  if (await Auth.session()) afterSession();
})();
