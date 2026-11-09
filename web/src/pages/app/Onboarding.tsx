// First-run setup in four short steps. Each step saves when you continue, so leaving halfway
// keeps what you entered. Everything can be changed later in Settings.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, m } from 'motion/react';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { usePrefs } from '../../app/preferences';
import { createClient, createProject, keys, updateProfile, type Profile, type ProfilePatch } from '../../lib/db';
import { COUNTRY_CURRENCY, CURRENCIES, LANGUAGES, detectLocale, type Currency, type Language } from '../../lib/locale';
import { duration, ease } from '../../motion/tokens';
import { Button, Card, Field, Input, Logo, Select, Textarea, useToast } from '../../ui';
import { useApp } from './context';
import './onboarding.css';
import { COUNTRIES, COUNTRY_ZONE, LANG_NAME, useRegionName, useZones } from './places';

const TOTAL = 4;
const slide = { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0, transition: { duration: duration.slow, ease: ease.enter } }, exit: { opacity: 0, x: -24, transition: { duration: duration.fast } } };

export default function Onboarding() {
  const { t } = useTranslation();
  const { user, profile } = useApp();
  const { locale, setLocale } = usePrefs();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const guess = useMemo(() => detectLocale(), []);
  const [step, setStep] = useState(1);
  const [f, setF] = useState(() => ({
    name: profile?.name ?? user.name ?? '',
    business_name: profile?.business_name ?? '',
    country: profile?.country ?? guess.country ?? '',
    time_zone: profile?.time_zone ?? guess.timeZone,
    lang: (profile?.lang ?? locale.language) as Language,
    currency: (profile?.currency ?? guess.currency) as Currency,
    hourly_rate: profile?.hourly_rate != null ? String(profile.hourly_rate) : '',
    pay_instructions: profile?.pay_instructions ?? '',
    notify_signed: profile?.notify_signed ?? true,
    notify_viewed: profile?.notify_viewed ?? false,
    notify_overdue: profile?.notify_overdue ?? true,
    clientName: '', projectTitle: '',
  }));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const regionName = useRegionName(locale.language);
  const zones = useZones(f.time_zone);

  const save = useMutation({
    mutationFn: async (patch: ProfilePatch) => updateProfile(user.id, patch),
    onSuccess: (p: Profile) => qc.setQueryData(keys.profile, p),
  });
  // Where the person was going before onboarding (AppShell passes it); defaults to the dashboard.
  const from = (useLocation().state as { from?: string } | null)?.from;
  // Rows already created, so pressing Finish again after an error doesn't create them twice.
  const made = useRef<{ client?: string | null; project?: string }>({});
  const finish = useMutation({
    mutationFn: async ({ skip = false, to }: { skip?: boolean; to?: string } = {}) => {
      if (!skip && f.projectTitle.trim() && !made.current.project) {
        if (made.current.client === undefined) made.current.client = f.clientName.trim() ? (await createClient({ name: f.clientName.trim().slice(0, 120) })).id : null;
        made.current.project = (await createProject({ title: f.projectTitle.trim().slice(0, 160), client_id: made.current.client, currency: f.currency })).id;
      }
      return { profile: await updateProfile(user.id, { onboarded_at: new Date().toISOString() }), to };
    },
    onSuccess: ({ profile: p, to }) => {
      qc.setQueryData(keys.profile, p);
      void qc.invalidateQueries({ queryKey: keys.projects });
      void qc.invalidateQueries({ queryKey: keys.clients });
      if (to) { window.location.assign(to); return; }
      toast({ title: t('app.onb.doneToast'), tone: 'success' });
      navigate(made.current.project ? `/app/projects/${made.current.project}` : from && from !== '/app/welcome' ? from : '/app', { replace: true });
    },
    onError: (e) => toast({ title: (e as Error).message, tone: 'danger' }),
  });

  const patchFor = (s: number): ProfilePatch => {
    if (s === 1) return { name: f.name.trim().slice(0, 120) || null, business_name: f.business_name.trim().slice(0, 120) || null };
    if (s === 2) return { country: f.country || null, time_zone: f.time_zone, lang: f.lang, currency: f.currency };
    if (s === 3) return { hourly_rate: f.hourly_rate === '' ? null : Math.max(0, Number(f.hourly_rate)), pay_instructions: f.pay_instructions.trim().slice(0, 800) || null, notify_signed: f.notify_signed, notify_viewed: f.notify_viewed, notify_overdue: f.notify_overdue };
    return {};
  };
  const next = async (e: FormEvent) => {
    e.preventDefault();
    if (step < TOTAL) {
      try { await save.mutateAsync(patchFor(step)); } catch (err) { toast({ title: (err as Error).message, tone: 'danger' }); return; }
      if (step === 2) setLocale({ language: f.lang, country: f.country, timeZone: f.time_zone, currency: f.currency });
      setStep(step + 1);
    } else finish.mutate({});
  };

  return (
    <div className="onb">
      <Card className="onb-card">
        <div className="onb-top">
          <Logo size={28} wordmark={false} />
          <span className="muted onb-count">{t('app.onb.step', { n: step, total: TOTAL })}</span>
        </div>
        <div className="onb-bar" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step} aria-label={t('app.onb.step', { n: step, total: TOTAL })}>
          <span style={{ width: `${(step / TOTAL) * 100}%` }} />
        </div>
        <form onSubmit={next} className="onb-form">
          <AnimatePresence mode="wait" initial={false}>
            <m.div key={step} {...slide} className="stack">
              {step === 1 && (<>
                <h1>{t('app.onb.s1t')}</h1><p className="muted">{t('app.onb.s1b')}</p>
                <Field label={t('app.onb.name')}><Input autoComplete="name" value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={120} autoFocus /></Field>
                <Field label={t('app.onb.business')} hint={t('app.onb.businessHint')}><Input autoComplete="organization" required value={f.business_name} onChange={(e) => set('business_name', e.target.value)} maxLength={120} /></Field>
              </>)}
              {step === 2 && (<>
                <h1>{t('app.onb.s2t')}</h1><p className="muted">{t('app.onb.s2b')}</p>
                <div className="onb-grid">
                  <Field label={t('app.onb.country')}>
                    <Select value={f.country} onChange={(e) => { const c = e.target.value; setF((x) => ({ ...x, country: c, time_zone: COUNTRY_ZONE[c] ?? x.time_zone, currency: COUNTRY_CURRENCY[c] ?? x.currency })); }} autoComplete="country">
                      <option value="">—</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{regionName?.of(c) ?? c}</option>)}
                    </Select>
                  </Field>
                  <Field label={t('app.onb.timeZone')}>
                    <Select value={f.time_zone} onChange={(e) => set('time_zone', e.target.value)}>{zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}</Select>
                  </Field>
                  <Field label={t('app.onb.language')}>
                    <Select value={f.lang} onChange={(e) => set('lang', e.target.value as Language)}>{LANGUAGES.map((l) => <option key={l} value={l}>{LANG_NAME[l]}</option>)}</Select>
                  </Field>
                  <Field label={t('app.onb.currency')}>
                    <Select value={f.currency} onChange={(e) => set('currency', e.target.value as Currency)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>
                  </Field>
                </div>
              </>)}
              {step === 3 && (<>
                <h1>{t('app.onb.s3t')}</h1><p className="muted">{t('app.onb.s3b')}</p>
                <Field label={`${t('app.onb.rate')} (${f.currency})`}><Input type="number" inputMode="decimal" min={0} value={f.hourly_rate} onChange={(e) => set('hourly_rate', e.target.value)} /></Field>
                <Field label={t('app.onb.payIns')} hint={t('app.onb.payInsHint')} optional><Textarea rows={3} maxLength={800} value={f.pay_instructions} onChange={(e) => set('pay_instructions', e.target.value)} placeholder={t('app.onb.payInsPh')} /></Field>
                <fieldset className="onb-checks">
                  <legend className="ss-label">{t('app.onb.notifyTitle')}</legend>
                  {(['notify_signed', 'notify_viewed', 'notify_overdue'] as const).map((k) => (
                    <label key={k}><input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} />{t(`app.onb.${k === 'notify_signed' ? 'notifySigned' : k === 'notify_viewed' ? 'notifyViewed' : 'notifyOverdue'}`)}</label>
                  ))}
                </fieldset>
              </>)}
              {step === 4 && (<>
                <h1>{t('app.onb.s4t')}</h1><p className="muted">{t('app.onb.s4b')}</p>
                <Field label={t('app.onb.clientName')} optional><Input value={f.clientName} onChange={(e) => set('clientName', e.target.value)} maxLength={120} placeholder="Lumen Café" /></Field>
                <Field label={t('app.onb.projectTitle')} optional><Input value={f.projectTitle} onChange={(e) => set('projectTitle', e.target.value)} maxLength={160} placeholder={t('app.onb.projectPh')} /></Field>
                <Button variant="ghost" icon="spark" disabled={finish.isPending} onClick={() => finish.mutate({ skip: true, to: '/estimate' })}>{t('app.onb.fromBrief')}</Button>
              </>)}
            </m.div>
          </AnimatePresence>
          <div className="onb-actions">
            {step > 1 ? <Button variant="ghost" icon="arrow" className="onb-back" onClick={() => setStep(step - 1)}>{t('app.onb.back')}</Button> : <span />}
            <div className="row">
              {step === TOTAL && <Button variant="ghost" onClick={() => finish.mutate({ skip: true })} disabled={finish.isPending}>{t('app.onb.skip')}</Button>}
              <Button type="submit" loading={save.isPending || finish.isPending} iconEnd={step < TOTAL ? 'arrow' : undefined}>{step < TOTAL ? t('app.onb.next') : t('app.onb.finish')}</Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
