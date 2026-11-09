// AI estimator: paste a brief, get features, stories, milestones and a price range from your rate.
// The API returns hours only; every price here is computed from the rate and buffer, so edits
// to hours, rate or buffer update all totals at once. Nothing is stored unless you save it.
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { AppLink } from '../../app/AppLink';
import { usePrefs } from '../../app/preferences';
import { api, ApiError } from '../../lib/api';
import { fullySignedIn } from '../../lib/auth';
import { CURRENCIES, type Currency } from '../../lib/locale';
import { supabase } from '../../lib/supabase';
import { Badge, Button, Card, Field, Icon, IconButton, Input, Select, Skeleton, Textarea, useToast } from '../../ui';
import { featurePrice, toDraft, totals } from './math';
import { SAMPLE_BRIEF, SAMPLE_ESTIMATE } from './sample';
import type { Estimate as Est, Story } from './types';
import './estimate.css';
import '../../i18n/pages';

const LOCAL_CURRENCY: Record<string, Currency> = { th: 'THB', bn: 'BDT' };

export default function Estimate() {
  const { t } = useTranslation();
  const { locale, money } = usePrefs();
  const toast = useToast();
  const [params] = useSearchParams();
  const [brief, setBrief] = useState('');
  const [rate, setRate] = useState(50);
  const [buffer, setBuffer] = useState(15);
  const [currency, setCurrency] = useState<Currency>(locale.currency);
  const [est, setEst] = useState<Est | null>(null);
  const [sample, setSample] = useState(false);
  const [edits, setEdits] = useState(0);
  const [error, setError] = useState('');
  const out = useRef<HTMLElement>(null);
  const fmt = (n: number) => money(n, currency);

  useEffect(() => { setCurrency(LOCAL_CURRENCY[locale.language] ?? locale.currency); }, [locale.language, locale.currency]);

  const run = useMutation({
    mutationFn: () => api<{ estimate: Est }>('estimate', { brief, lang: locale.language, rate, buffer, currency }, { auth: false }),
    onMutate: () => setError(''),
    onSuccess: (r) => show(r.estimate, false),
    onError: (e) => {
      // When AI is off, the sample brief still gets a clearly labelled sample result.
      if (e instanceof ApiError && e.status === 503 && brief.trim() === SAMPLE_BRIEF.trim()) show(structuredClone(SAMPLE_ESTIMATE), true);
      else setError((e as Error).message);
    },
  });

  function show(e: Est, isSample: boolean) {
    setEst(e); setSample(isSample); setEdits(0);
    requestAnimationFrame(() => out.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
  }
  const submit = (e: FormEvent) => { e.preventDefault(); run.mutate(); };
  const useSample = () => { setBrief(SAMPLE_BRIEF); setCurrency('THB'); setRate(600); };

  // Immutable edits so totals recompute and React re-renders only what changed.
  const editStory = (fi: number, si: number, patch: Partial<Story>) => {
    // Keep each range valid: raising the minimum above the maximum moves the maximum too, and back.
    const fix = (s: Story): Story => {
      const n = { ...s, ...patch };
      if ('hoursLow' in patch && n.hoursLow > n.hoursHigh) n.hoursHigh = n.hoursLow;
      if ('hoursHigh' in patch && n.hoursHigh < n.hoursLow) n.hoursLow = n.hoursHigh;
      return n;
    };
    setEst((e) => e && { ...e, features: e.features.map((f, i) => i !== fi ? f : { ...f, stories: f.stories.map((s, j) => j !== si ? s : fix(s)) }) });
    setEdits((n) => n + 1);
  };
  const removeStory = (fi: number, si: number) => {
    setEst((e) => e && { ...e, features: e.features.map((f, i) => i !== fi ? f : { ...f, stories: f.stories.filter((_, j) => j !== si) }) });
    setEdits((n) => n + 1);
  };

  const sum = useMemo(() => est && totals(est, rate, buffer), [est, rate, buffer]);

  const toScope = () => {
    if (!est) return;
    try { sessionStorage.setItem('ss-draft', JSON.stringify(toDraft(est, rate, buffer, currency, t('estimate.notesAssumptions')))); } catch { /* storage blocked */ }
    window.location.href = '/new';
  };
  const copy = async () => {
    if (!est || !sum) return;
    const lines = [est.summary, ''];
    est.features.forEach((f) => {
      lines.push(`${f.name} (${fmt(featurePrice(f, rate, buffer))})`);
      f.stories.forEach((s) => lines.push(`  - ${s.title}: ${t('estimate.hrs', { low: s.hoursLow, high: s.hoursHigh })}`));
    });
    lines.push('', `${t('estimate.priceRange')}: ${fmt(sum.priceLow)} – ${fmt(sum.priceHigh)}`, `${t('estimate.timeline')}: ${t('estimate.weeks', { count: sum.weeks })}`);
    est.milestones.forEach((m, i) => lines.push(`${i + 1}. ${m.name} (${t('estimate.weeks', { count: m.weeks })})`));
    if (est.outOfScope.length) lines.push('', `${t('estimate.outOfScope')}:`, ...est.outOfScope.map((x) => `- ${x}`));
    try { await navigator.clipboard.writeText(lines.join('\n')); toast({ title: t('estimate.copied'), tone: 'success' }); } catch { toast({ title: t('states.error'), tone: 'danger' }); }
  };

  return (
    <div className="container est">
      <header className="est-head">
        <Badge tone="brand"><Icon name="spark" size={14} />{t('estimate.beta')}</Badge>
        <h1>{t('estimate.h1')}</h1>
        <p className="est-lede muted">{t('estimate.lede')}</p>
      </header>

      <Card className="est-form">
        <form onSubmit={submit} className="stack">
          <Field label={t('estimate.briefLabel')} hint={t('estimate.privacy')}>
            <Textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder={t('estimate.briefPh')} rows={7} required minLength={20} maxLength={12000} />
          </Field>
          <div><Button variant="ghost" size="sm" icon="brief" onClick={useSample}>{t('estimate.sample')}</Button></div>
          <div className="est-inputs">
            <Field label={t('estimate.rate')}><Input type="number" inputMode="decimal" min={0} max={100000} value={rate} onChange={(e) => setRate(Math.max(0, Number(e.target.value) || 0))} /></Field>
            <Field label={t('estimate.currency')}>
              <Select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>
            </Field>
            <Field label={t('estimate.buffer')}><Input type="number" inputMode="numeric" min={0} max={100} value={buffer} onChange={(e) => setBuffer(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} /></Field>
          </div>
          <div className="row">
            <Button type="submit" size="lg" icon="spark" loading={run.isPending}>{t('estimate.go')}</Button>
            {run.isPending && <p className="muted" role="status">{t('estimate.wait')}</p>}
          </div>
          {error && <p className="ss-error" role="alert">{error}</p>}
        </form>
      </Card>

      {run.isPending && !est && (
        <div className="est-loading" aria-hidden="true">
          <Skeleton height={96} radius={16} /><Skeleton height={180} radius={16} /><Skeleton height={180} radius={16} />
        </div>
      )}

      {est && sum && (
        <section ref={out} className="est-out" aria-labelledby="est-summary-h" tabIndex={-1}>
          {sample && <p className="est-note" role="note"><Icon name="info" size={18} />{t('estimate.sampleNote')}</p>}
          <h2 id="est-summary-h" className="visually-hidden">{t('estimate.priceRange')}</h2>
          <p className="est-summary">{est.summary}</p>
          <div className="est-kpis">
            <Card><p className="muted">{t('estimate.priceRange')}</p><p className="est-kpi">{fmt(sum.priceLow)} – {fmt(sum.priceHigh)}</p></Card>
            <Card><p className="muted">{t('estimate.hours')}</p><p className="est-kpi">{t('estimate.hrs', { low: sum.low, high: sum.high })}</p></Card>
            <Card><p className="muted">{t('estimate.timeline')}</p><p className="est-kpi">{t('estimate.weeks', { count: sum.weeks })}</p></Card>
          </div>
          <p className="muted est-formula">{t('estimate.formula', { rate: fmt(rate), buffer })}</p>

          <div className="est-section-head"><h2>{t('estimate.features')}</h2><p className="muted">{t('estimate.editHint')}</p></div>
          <div className="est-features">
            {est.features.map((f, fi) => (
              <Card key={fi} className="est-feature">
                <div className="est-fh">
                  <h3>{f.name}</h3>
                  <Badge tone={f.kind === 'nonfunctional' ? 'warning' : 'success'}>{t(`estimate.${f.kind}`)}</Badge>
                  <b className="mono est-fprice">{fmt(featurePrice(f, rate, buffer))}</b>
                </div>
                <div className="est-table-wrap">
                  <table className="est-table">
                    <thead><tr><th scope="col">{t('estimate.story')}</th><th scope="col">{t('estimate.low')}</th><th scope="col">{t('estimate.high')}</th><th scope="col"><span className="visually-hidden">{t('estimate.remove')}</span></th></tr></thead>
                    <tbody>
                      {f.stories.map((s, si) => (
                        <tr key={si}>
                          <td>{s.title}</td>
                          {(['hoursLow', 'hoursHigh'] as const).map((k) => (
                            <td key={k}><input className="ss-input est-hrs" type="number" min={0} max={400} step={0.5} value={s[k]}
                              aria-label={`${t(k === 'hoursLow' ? 'estimate.low' : 'estimate.high')}: ${s.title}`}
                              onChange={(e) => editStory(fi, si, { [k]: Math.max(0, Number(e.target.value) || 0) })} /></td>
                          ))}
                          <td><IconButton icon="x" size="sm" label={`${t('estimate.remove')}: ${s.title}`} onClick={() => removeStory(fi, si)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>

          <div className="est-grid">
            <Card>
              <h2 className="est-h">{t('estimate.milestones')}</h2>
              <ol className="est-milestones">
                {est.milestones.map((m, i) => (
                  <li key={i}><b>{m.name}</b> · {t('estimate.weeks', { count: m.weeks })}
                    {m.featureIndexes.length > 0 && <span className="muted"> {t('estimate.delivers')}: {m.featureIndexes.map((x) => est.features[x]?.name).filter(Boolean).join(', ')}</span>}
                  </li>
                ))}
              </ol>
            </Card>
            {([['questions', est.openQuestions], ['assumptions', est.assumptions], ['risks', est.risks], ['outOfScope', est.outOfScope]] as const).map(([k, items]) => items.length > 0 && (
              <Card key={k}><h2 className="est-h">{t(`estimate.${k}`)}</h2><ul className="est-list">{items.map((x) => <li key={x}>{x}</li>)}</ul></Card>
            ))}
          </div>

          <Card className="est-next">
            <h2 className="est-h">{t('estimate.nextH')}</h2>
            <p className="muted">{t('estimate.nextP')}</p>
            <div className="row">
              <Button iconEnd="arrow" onClick={toScope}>{t('estimate.toScope')}</Button>
              <Button variant="secondary" icon="copy" onClick={copy}>{t('estimate.copy')}</Button>
            </div>
          </Card>

          <SaveToWorkspace est={est} brief={brief} rate={rate} buffer={buffer} currency={currency} preferProject={params.get('project')} />
          <Feedback est={est} edits={edits} sample={sample} />
          <p className="muted est-disclaimer">{t('estimate.disclaimer')}</p>
        </section>
      )}
    </div>
  );
}

/** Signed-in users can file the estimate under a project (new or existing). */
function SaveToWorkspace({ est, brief, rate, buffer, currency, preferProject }: { est: Est; brief: string; rate: number; buffer: number; currency: Currency; preferProject: string | null }) {
  const { t } = useTranslation();
  const { locale } = usePrefs();
  const toast = useToast();
  const session = useQuery({ queryKey: ['session'], queryFn: fullySignedIn, staleTime: 60_000 });
  const projects = useQuery({
    queryKey: ['projects', 'titles'],
    enabled: Boolean(session.data),
    queryFn: async () => {
      const sb = (await supabase())!;
      const { data, error } = await sb.from('projects').select('id, title').order('updated_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data as { id: string; title: string }[];
    },
  });
  const [projectId, setProjectId] = useState(preferProject ?? '');
  const [newName, setNewName] = useState('');
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: async () => {
      const sb = (await supabase())!;
      let id = projectId;
      if (!id) {
        const title = newName.trim() || (est.projectType || est.summary || 'New project').slice(0, 160);
        const { data, error } = await sb.from('projects').insert({ title, currency, status: 'estimating' }).select('id').single();
        if (error) throw new Error(error.message);
        id = data.id;
        await sb.from('activity').insert({ project_id: id, kind: 'project_created', detail: { title } });
      }
      const s = totals(est, rate, buffer);
      const { error } = await sb.from('estimates').insert({ project_id: id, brief: brief.slice(0, 12000), lang: locale.language, currency, rate, buffer_pct: buffer, data: est,
        hours_low: s.low, hours_high: s.high, price_low: s.priceLow, price_high: s.priceHigh });
      if (error) throw new Error(error.message);
      await sb.from('activity').insert({ project_id: id, kind: 'estimate_saved', detail: { range: `${s.priceLow}–${s.priceHigh} ${currency}` } });
      return id;
    },
    onSuccess: (id) => { setSavedTo(id); toast({ title: t('estimate.saved'), tone: 'success' }); },
    onError: (e) => toast({ title: (e as Error).message, tone: 'danger' }),
  });

  if (session.isPending) return null;
  if (!session.data) {
    return (
      <Card className="est-save">
        <h2 className="est-h">{t('estimate.saveH')}</h2>
        <AppLink to="/login?next=/estimate">{t('estimate.signInToSave')}</AppLink>
      </Card>
    );
  }
  return (
    <Card className="est-save">
      <h2 className="est-h">{t('estimate.saveH')}</h2>
      <div className="est-inputs">
        <Field label={t('estimate.saveProject')}>
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">{t('estimate.newProjectOpt')}</option>
            {projects.data?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
        </Field>
        {!projectId && <Field label={t('estimate.saveNew')}><Input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={160} /></Field>}
      </div>
      <div className="row">
        <Button icon="folder" loading={save.isPending} onClick={() => save.mutate()}>{t('estimate.save')}</Button>
        {savedTo && <AppLink to={`/app#/projects/${savedTo}`}>{t('estimate.openProject')}</AppLink>}
      </div>
    </Card>
  );
}

/** "Would you send this to a real client?" Anonymous; stores no brief text (api/feedback.js). */
function Feedback({ est, edits, sample }: { est: Est; edits: number; sample: boolean }) {
  const { t } = useTranslation();
  const { locale } = usePrefs();
  const [answer, setAnswer] = useState('');
  const [note, setNote] = useState('');
  const send = useMutation({
    mutationFn: () => {
      const all = est.features.flatMap((f) => f.stories);
      let ref: string | undefined;
      try { ref = sessionStorage.getItem('ss-ref') || undefined; } catch { /* blocked */ }
      return api('feedback', { answer, note, lang: locale.language, ref, edits, features: est.features.length, sample,
        hoursLow: all.reduce((x, s) => x + s.hoursLow, 0), hoursHigh: all.reduce((x, s) => x + s.hoursHigh, 0) }, { auth: false });
    },
  });
  if (send.isSuccess) return <Card className="est-fb"><p role="status" className="est-fb-done"><Icon name="check" size={18} />{t('estimate.fbThanks')}</p></Card>;
  return (
    <Card className="est-fb">
      <form onSubmit={(e) => { e.preventDefault(); if (answer) send.mutate(); }} className="stack">
        <fieldset className="est-fb-set">
          <legend className="est-h">{t('estimate.fbH')}</legend>
          <div className="row">
            {([['as_is', 'fbYes'], ['with_edits', 'fbEdits'], ['no', 'fbNo']] as const).map(([v, k]) => (
              <label key={v} className={'est-choice' + (answer === v ? ' is-on' : '')}>
                <input type="radio" name="answer" value={v} checked={answer === v} onChange={() => setAnswer(v)} />{t(`estimate.${k}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={t('estimate.fbNote')}><Textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="row">
          <Button type="submit" variant="secondary" disabled={!answer} loading={send.isPending}>{t('estimate.fbSend')}</Button>
          {send.isError && <p className="ss-error" role="alert">{(send.error as Error).message}</p>}
        </div>
      </form>
    </Card>
  );
}
