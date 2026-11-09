// Sign in: Google or GitHub, or a one-time email link; then the authenticator code when the
// account has two-step sign-in. Returns to ?next= (same-origin paths only).
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLink } from '../../app/AppLink';
import { getConfig } from '../../lib/api';
import { SESSION_KEY, safeNext } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { Button, Card, EmptyState, Field, Input, Logo, Spinner } from '../../ui';
import './auth.css';
import '../../i18n/pages';

type Step = 'loading' | 'start' | 'sent' | 'mfa' | 'off';

export default function Login() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const next = useMemo(() => safeNext(new URLSearchParams(window.location.search).get('next'), window.location.origin), []);
  const [step, setStep] = useState<Step>('loading');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // A full page load: the app may live on the old site until phase E ships.
  const done = () => { void qc.invalidateQueries({ queryKey: SESSION_KEY }); window.location.replace(next); };

  useEffect(() => {
    let off = () => {};
    (async () => {
      const cfg = await getConfig().catch(() => ({ enabled: false }));
      const sb = cfg.enabled ? await supabase() : null;
      if (!sb) { setStep('off'); return; }
      const afterSession = async () => {
        const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
        if (data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') setStep('mfa');
        else done();
      };
      // Coming back from an emailed link or OAuth, the client finishes sign-in from the URL.
      const { data } = sb.auth.onAuthStateChange((evt, s) => { if (s && evt === 'SIGNED_IN') void afterSession(); });
      off = () => data.subscription.unsubscribe();
      const { data: s } = await sb.auth.getSession();
      if (s.session) await afterSession(); else setStep('start');
    })().catch((e: Error) => { setError(e.message); setStep('start'); });
    return () => off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redirectTo = `${window.location.origin}/login?next=${encodeURIComponent(next)}`;
  const run = async (key: string, fn: () => Promise<void>) => {
    setError(''); setBusy(key);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };
  const oauth = (provider: 'google' | 'github') => run(provider, async () => {
    const sb = (await supabase())!;
    const { error: e } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (e) throw e;
  });
  const sendLink = (e: FormEvent) => { e.preventDefault(); void run('email', async () => {
    const sb = (await supabase())!;
    const { error: err } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } });
    if (err) throw err;
    setStep('sent');
  }); };
  const verify = (e: FormEvent) => { e.preventDefault(); void run('mfa', async () => {
    const sb = (await supabase())!;
    const { data, error: err } = await sb.auth.mfa.listFactors();
    if (err) throw err;
    const factor = data.totp[0];
    if (!factor) throw new Error(t('auth.noFactor'));
    const { error: e2 } = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    if (e2) throw e2;
    done();
  }); };

  return (
    <section className="container auth">
      <Card className="auth-card">
        <Logo size={36} wordmark={false} />
        {step === 'loading' && <div className="auth-loading"><Spinner label="Loading" /></div>}
        {step === 'start' && (
          <>
            <h1>{t('auth.title')}</h1>
            <p className="muted">{t('auth.lede')}</p>
            <div className="auth-oauth">
              <Button variant="secondary" block loading={busy === 'google'} onClick={() => void oauth('google')}><GoogleMark />{t('auth.google')}</Button>
              <Button variant="secondary" block loading={busy === 'github'} onClick={() => void oauth('github')}><GithubMark />{t('auth.github')}</Button>
            </div>
            <p className="auth-or"><span>{t('auth.or')}</span></p>
            <form onSubmit={sendLink} className="stack">
              <Field label={t('auth.email')} hint={t('auth.noPassword')}>
                <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" />
              </Field>
              <Button type="submit" block icon="mail" loading={busy === 'email'}>{t('auth.sendLink')}</Button>
            </form>
          </>
        )}
        {step === 'sent' && (
          <>
            <h1>{t('auth.sentTitle')}</h1>
            <p role="status">{t('auth.sentBody', { email })}</p>
            <Button variant="ghost" onClick={() => setStep('start')}>{t('auth.different')}</Button>
          </>
        )}
        {step === 'mfa' && (
          <form onSubmit={verify} className="stack">
            <h1>{t('auth.mfaTitle')}</h1>
            <p className="muted">{t('auth.mfaBody')}</p>
            <Field label={t('auth.code')}>
              <Input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="auth-code" />
            </Field>
            <Button type="submit" block loading={busy === 'mfa'}>{t('auth.verify')}</Button>
          </form>
        )}
        {step === 'off' && <EmptyState title={<span role="heading" aria-level={1}>{t('auth.offTitle')}</span>} body={t('auth.offBody')} />}
        {error && <p className="ss-error" role="alert">{error}</p>}
        {step !== 'off' && <p className="muted auth-legal">{t('auth.agree')} <AppLink to="/privacy">{t('auth.privacy')}</AppLink>.</p>}
      </Card>
    </section>
  );
}

// Provider marks drawn as simple paths (no external images; CSP img-src 'self').
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
    </svg>
  );
}
function GithubMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <path d="M8 0a8 8 0 0 0-2.5 15.6c.4 0 .5-.2.5-.4v-1.5c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.3 1.9.9 2.3.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.5 7.5 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3.1-1.9 3.8-3.6 4 .3.3.6.8.6 1.5v2.2c0 .2.1.5.6.4A8 8 0 0 0 8 0z" />
    </svg>
  );
}
