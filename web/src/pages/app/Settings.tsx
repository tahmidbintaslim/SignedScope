// Settings: profile and defaults, where you work, notifications, two-step sign-in, data export
// and sign out. Saving also updates the language, dates and currency on this device.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefs } from '../../app/preferences';
import { db, exportAll, keys, ok, updateProfile, type Profile } from '../../lib/db';
import { CURRENCIES, LANGUAGES, type Currency, type Language } from '../../lib/locale';
import { Badge, Button, Card, Field, Input, Select, Skeleton, Textarea, useToast } from '../../ui';
import { useApp } from './context';
import { COUNTRIES, COUNTRY_ZONE, LANG_NAME, useRegionName, useZones } from './places';
import { Confirm, errText, today } from './shared';

const NOTIFY = [['notify_signed', 'notifySigned'], ['notify_viewed', 'notifyViewed'], ['notify_overdue', 'notifyOverdue']] as const;

export default function Settings() {
  const { t } = useTranslation();
  const { user, profile } = useApp();
  return (
    <div className="detail">
      <div className="page-head"><div><h1>{t('app.nav.settings')}</h1><p className="muted">{user.email}</p></div></div>
      <ProfileForm key={profile?.id ?? 'none'} profile={profile ?? null} />
      <section className="sect"><h2>{t('app.set.mfa')}</h2><Mfa /></section>
      <section className="sect"><h2>{t('app.set.data')}</h2><DataBlock /></section>
    </div>
  );
}

function ProfileForm({ profile }: { profile: Profile | null }) {
  const { t } = useTranslation();
  const { user } = useApp();
  const { locale, setLocale } = usePrefs();
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState(() => ({
    name: profile?.name ?? '', business_name: profile?.business_name ?? '',
    currency: (profile?.currency ?? locale.currency) as Currency, hourly_rate: profile?.hourly_rate != null ? String(profile.hourly_rate) : '',
    lang: (profile?.lang ?? locale.language) as Language, country: profile?.country ?? '', time_zone: profile?.time_zone ?? locale.timeZone,
    pay_instructions: profile?.pay_instructions ?? '',
    notify_signed: profile?.notify_signed ?? true, notify_viewed: profile?.notify_viewed ?? false, notify_overdue: profile?.notify_overdue ?? true,
  }));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const regionName = useRegionName(locale.language);
  const zones = useZones(f.time_zone);

  const save = useMutation({
    mutationFn: () => updateProfile(user.id, {
      name: f.name.trim().slice(0, 120) || null, business_name: f.business_name.trim().slice(0, 120) || null,
      currency: f.currency, hourly_rate: f.hourly_rate === '' ? null : Math.max(0, Number(f.hourly_rate)), lang: f.lang,
      country: f.country || null, time_zone: f.time_zone, pay_instructions: f.pay_instructions.trim().slice(0, 800) || null,
      notify_signed: f.notify_signed, notify_viewed: f.notify_viewed, notify_overdue: f.notify_overdue,
    }),
    onSuccess: (p) => {
      qc.setQueryData(keys.profile, p);
      setLocale({ language: f.lang, currency: f.currency, timeZone: f.time_zone, ...(f.country ? { country: f.country } : {}) });
      toast({ title: t('app.set.saved'), tone: 'success' });
    },
    onError: (e) => toast({ title: errText(e), tone: 'danger' }),
  });

  return (
    <Card>
      <form className="stack" onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }}>
        <div className="form-grid">
          <Field label={t('app.onb.name')}><Input autoComplete="name" maxLength={120} value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label={t('app.onb.business')} hint={t('app.onb.businessHint')}><Input autoComplete="organization" maxLength={120} value={f.business_name} onChange={(e) => set('business_name', e.target.value)} /></Field>
          <Field label={t('app.onb.country')}>
            <Select value={f.country} autoComplete="country" onChange={(e) => { const c = e.target.value; setF((x) => ({ ...x, country: c, time_zone: COUNTRY_ZONE[c] ?? x.time_zone })); }}>
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
          <Field label={`${t('app.onb.rate')} (${f.currency})`}><Input type="number" inputMode="decimal" min={0} step="any" value={f.hourly_rate} onChange={(e) => set('hourly_rate', e.target.value)} /></Field>
        </div>
        <Field label={t('app.onb.payIns')} hint={t('app.onb.payInsHint')} optional>
          <Textarea rows={3} maxLength={800} value={f.pay_instructions} onChange={(e) => set('pay_instructions', e.target.value)} placeholder={t('app.onb.payInsPh')} />
        </Field>
        <fieldset className="checks">
          <legend className="ss-label">{t('app.onb.notifyTitle')}</legend>
          {NOTIFY.map(([k, label]) => <label key={k}><input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} />{t(`app.onb.${label}`)}</label>)}
        </fieldset>
        <div><Button type="submit" loading={save.isPending}>{t('app.set.save')}</Button></div>
      </form>
    </Card>
  );
}

interface Factor { id: string; status: string; factor_type?: string }
interface Enrollment { id: string; qr: string; secret: string }

/** Authenticator-app (TOTP) two-step sign-in through Supabase Auth. */
function Mfa() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [enroll, setEnroll] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [turningOff, setTurningOff] = useState(false);
  const factors = useQuery({
    queryKey: ['mfa-factors'],
    queryFn: async () => ok(await (await db()).auth.mfa.listFactors()) as { all: Factor[]; totp: Factor[] },
  });
  const on = (factors.data?.totp ?? []).filter((x) => x.status === 'verified');

  const start = useMutation({
    mutationFn: async () => {
      const sb = await db();
      // Clear half-finished setups first; Supabase allows only a few unverified factors.
      for (const x of (factors.data?.all ?? []).filter((y) => y.status !== 'verified')) await sb.auth.mfa.unenroll({ factorId: x.id });
      const e = ok(await sb.auth.mfa.enroll({ factorType: 'totp' })) as { id: string; totp: { qr_code: string; secret: string } };
      return { id: e.id, qr: e.totp.qr_code, secret: e.totp.secret };
    },
    onSuccess: setEnroll,
    onError: (e) => toast({ title: errText(e), tone: 'danger' }),
  });
  const verify = useMutation({
    mutationFn: async () => ok(await (await db()).auth.mfa.challengeAndVerify({ factorId: enroll!.id, code: code.trim() })),
    onSuccess: () => { setEnroll(null); setCode(''); toast({ title: t('app.set.mfaOnToast'), tone: 'success' }); void qc.invalidateQueries({ queryKey: ['mfa-factors'] }); },
    onError: (e) => toast({ title: errText(e), tone: 'danger' }),
  });

  if (factors.isError) return <Card><p className="text-danger">{(factors.error as Error).message}</p></Card>;
  if (!factors.data) return <Card><Skeleton height={48} /></Card>;
  return (
    <Card className="stack">
      {on.length ? (<>
        <p className="row"><Badge tone="success">{t('app.set.mfaOn')}</Badge>{t('app.set.mfaOnBody')}</p>
        <div><Button variant="ghost" size="sm" onClick={() => setTurningOff(true)}>{t('app.set.mfaOff')}</Button></div>
      </>) : enroll ? (
        <form className="stack mfa-enroll" onSubmit={(e: FormEvent) => { e.preventDefault(); verify.mutate(); }}>
          <p>{t('app.set.mfaScan')}</p>
          <img className="mfa-qr" src={enroll.qr} alt={t('app.set.mfaQrAlt')} width={180} height={180} />
          <p className="muted small">{t('app.set.mfaKey')} <code className="break">{enroll.secret}</code></p>
          <Field label={t('app.set.mfaCode')}>
            <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
          </Field>
          <div className="row">
            <Button type="submit" loading={verify.isPending}>{t('app.set.mfaVerify')}</Button>
            <Button variant="ghost" onClick={() => setEnroll(null)}>{t('actions.cancel')}</Button>
          </div>
        </form>
      ) : (<>
        <p className="muted">{t('app.set.mfaIntro')}</p>
        <div><Button icon="shield" loading={start.isPending} onClick={() => start.mutate()}>{t('app.set.mfaStart')}</Button></div>
      </>)}
      <Confirm open={turningOff} onClose={() => setTurningOff(false)} title={t('app.set.mfaOffTitle')} body={t('app.set.mfaOffBody')} action={t('app.set.mfaOff')}
        onConfirm={async () => {
          const sb = await db();
          for (const x of on) ok(await sb.auth.mfa.unenroll({ factorId: x.id }));
          await qc.invalidateQueries({ queryKey: ['mfa-factors'] });
        }} />
    </Card>
  );
}

function DataBlock() {
  const { t } = useTranslation();
  const { user, profile, signOut } = useApp();
  const toast = useToast();
  const exp = useMutation({
    mutationFn: () => exportAll(user.id, profile),
    onSuccess: (data) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = `signedscope-export-${today()}.json`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    onError: (e) => toast({ title: errText(e), tone: 'danger' }),
  });
  return (
    <Card className="stack">
      <p className="muted">{t('app.set.exportBody')}</p>
      <div className="row">
        <Button variant="secondary" icon="download" loading={exp.isPending} onClick={() => exp.mutate()}>{t('app.set.export')}</Button>
        <Button variant="ghost" icon="logout" onClick={signOut}>{t('app.nav.signOut')}</Button>
      </div>
    </Card>
  );
}
