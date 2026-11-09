// Sign in or sign up with Clerk: Google, GitHub or an email code, then the authenticator code when
// the account has two-step sign-in. Returns to ?next= (same-origin paths only).
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLink } from '../../app/AppLink';
import { clerk } from '../../lib/clerk';
import { SESSION_KEY, safeNext } from '../../lib/session';
import { Card, EmptyState, Logo, Spinner } from '../../ui';
import { clerkAppearance } from './appearance';
import './auth.css';
import '../../i18n/pages';

type Step = 'loading' | 'ready' | 'off' | 'error';

export default function Login() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const next = useMemo(() => safeNext(new URLSearchParams(window.location.search).get('next'), window.location.origin), []);
  const [step, setStep] = useState<Step>('loading');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unmount = () => {};
    let cancelled = false;
    (async () => {
      const c = await clerk();
      if (cancelled) return;
      if (!c) { setStep('off'); return; }
      // Already signed in (or just back from Google/GitHub): go straight on.
      if (c.session && c.user) { void qc.invalidateQueries({ queryKey: SESSION_KEY }); window.location.replace(next); return; }
      setStep('ready');
      await new Promise(requestAnimationFrame);
      if (cancelled || !box.current) return;
      const el = box.current;
      c.mountSignIn(el, { routing: 'hash', withSignUp: true, forceRedirectUrl: next, signUpForceRedirectUrl: next, appearance: clerkAppearance() });
      unmount = () => c.unmountSignIn(el);
    })().catch(() => { if (!cancelled) setStep('error'); });
    return () => { cancelled = true; unmount(); };
  }, [next, qc]);

  return (
    <section className="container auth">
      <Card className="auth-card">
        <Logo size={36} wordmark={false} />
        {step !== 'off' && (
          <>
            <h1>{t('auth.title')}</h1>
            <p className="muted">{t('auth.lede')}</p>
          </>
        )}
        {step === 'loading' && <div className="auth-loading"><Spinner label={t('auth.loading')} /></div>}
        <div ref={box} className="auth-clerk" hidden={step !== 'ready'} />
        {step === 'off' && <EmptyState title={<span role="heading" aria-level={1}>{t('auth.offTitle')}</span>} body={t('auth.offBody')} />}
        {step === 'error' && <p className="ss-error" role="alert">{t('auth.loadError')}</p>}
        {step !== 'off' && <p className="muted auth-legal">{t('auth.agree')} <AppLink to="/privacy">{t('auth.privacy')}</AppLink>.</p>}
      </Card>
    </section>
  );
}
