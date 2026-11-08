// Plans and the paid-plan waitlist (POST /api/waitlist). Everything is free during the beta.
import type { ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Badge, Button, ButtonLink, Field, Icon, Input, Select, useToast } from '../../ui';

// Features that are not built yet carry a "Soon" badge (see docs/PLAN.md phase F).
const SOON: Record<string, number[]> = { pf: [2, 3], af: [2, 3, 4] };

function Plan({ id, price, items, highlight, children }: { id: 'starter' | 'pro' | 'agency'; price: number; items: 'sf' | 'pf' | 'af'; highlight?: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  const list = t(`home.pricing.${items}`, { returnObjects: true }) as string[];
  return (
    <article className={'plan' + (highlight ? ' plan--hi' : '')} data-reveal>
      <header>
        <h3>{t(`home.pricing.${id}`)}</h3>
        <p className="muted">{t(`home.pricing.${id}Note`)}</p>
        <p className="plan-price"><b>${price}</b>{price > 0 && <span className="muted">{t('home.pricing.month')}</span>}</p>
      </header>
      <ul>
        {list.map((f, i) => (
          <li key={f}><Icon name="check" size={18} />{f}{SOON[items]?.includes(i) && <Badge tone="neutral">{t('home.pricing.soon')}</Badge>}</li>
        ))}
      </ul>
      {children}
    </article>
  );
}

export function Pricing() {
  const { t } = useTranslation();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<'pro' | 'agency'>('pro');
  const [done, setDone] = useState(false);
  const join = useMutation({
    mutationFn: (body: { email: string; plan: string; ref?: string; company?: string }) => api<{ ok: true }>('waitlist', body, { auth: false }),
    onSuccess: () => { setDone(true); toast({ title: t('home.pricing.joined'), tone: 'success' }); },
    onError: (e) => toast({ title: (e as Error).message, tone: 'danger' }),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ref = new URLSearchParams(window.location.search).get('ref') ?? undefined;
    join.mutate({ email: email.trim(), plan, ref, company: String(fd.get('company') || '') || undefined });
  };
  const notify = (p: 'pro' | 'agency') => () => { setPlan(p); document.getElementById('waitlist-email')?.focus(); };

  return (
    <>
      <div className="plans">
        <Plan id="starter" price={0} items="sf"><ButtonLink to="/new" block>{t('home.pricing.start')}</ButtonLink></Plan>
        <Plan id="pro" price={19} items="pf" highlight><Button variant="secondary" block onClick={notify('pro')}>{t('home.pricing.notify')}</Button></Plan>
        <Plan id="agency" price={49} items="af"><Button variant="secondary" block onClick={notify('agency')}>{t('home.pricing.notify')}</Button></Plan>
      </div>
      <p className="muted plans-note">{t('home.pricing.soonNote')}</p>
      <form className="waitlist" onSubmit={submit} data-reveal>
        <h3>{t('home.pricing.formTitle')}</h3>
        {done ? <p role="status" className="waitlist-done"><Icon name="check" size={18} />{t('home.pricing.joined')}</p> : (
          <div className="waitlist-row">
            <Field label={t('home.pricing.email')}><Input id="waitlist-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" /></Field>
            <Field label={t('home.pricing.plan')}>
              <Select value={plan} onChange={(e) => setPlan(e.target.value as 'pro' | 'agency')}>
                <option value="pro">Pro</option><option value="agency">Agency</option>
              </Select>
            </Field>
            {/* Honeypot: hidden from people, filled by bots. */}
            <input type="text" name="company" tabIndex={-1} autoComplete="off" className="visually-hidden" aria-hidden="true" />
            <Button type="submit" loading={join.isPending}>{t('home.pricing.join')}</Button>
          </div>
        )}
      </form>
    </>
  );
}
