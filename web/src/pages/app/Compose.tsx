// Proposal or agreement for a project (/app/projects/:id/compose): written sections (optionally
// drafted by AI from the project's estimate), the lines the client approves, a payment
// schedule, optional terms from the clause library, and how the client pays. Sealed into the
// same kind of sign-off link as a scope, filed to the project.
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { usePrefs } from '../../app/preferences';
import { api } from '../../lib/api';
import { CLAUSES, CLAUSE_VARS, LAW, LAW_COUNTRIES, LAW_DISPUTES, fillClause, type ClauseVar } from '../../lib/clauses';
import { getClient, getProject, listEstimates, projectKeys, clientKeys } from '../../lib/db';
import { linesFromEstimate } from '../../lib/draft';
import { LANGUAGES, type Language } from '../../lib/locale';
import { Button, ButtonLink, Card, EmptyState, Field, Icon, IconButton, Input, Select, Skeleton, Textarea, useToast } from '../../ui';
import { DocParts, LinkBox } from '../doc/parts';
import '../doc/doc.css';
import { ItemsEditor, itemsTotal, newItem, toSealItems, type EditItem } from '../new/ItemsEditor';
import '../new/new.css';
import { useApp } from './context';
import { LANG_NAME } from './places';
import { errText } from './shared';

type Kind = 'proposal' | 'agreement';
interface Section { key: string; heading: string; body: string }
interface PlanRow { key: string; label: string; amount: string; due: string }
let seq = 0;
const k = () => 'c' + ++seq;
const PRESETS: Record<string, [string, number, string][]> = {
  '50-50': [['deposit', 50, 'onSigning'], ['final', 50, 'atLaunch']],
  '30-40-30': [['deposit', 30, 'onSigning'], ['milestone', 40, 'atDesign'], ['final', 30, 'atLaunch']],
  '100': [['full', 100, 'onSigning']],
  none: [],
};

export default function Compose() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const project = useQuery({ queryKey: projectKeys.one(id), queryFn: () => getProject(id) });
  const estimates = useQuery({ queryKey: projectKeys.estimates(id), queryFn: () => listEstimates(id) });
  const clientId = project.data?.client_id;
  const client = useQuery({ queryKey: clientKeys.one(clientId ?? ''), queryFn: () => getClient(clientId!), enabled: Boolean(clientId) });

  if (project.isError) return <EmptyState art="inbox" title={t('app.dash.error')} body={(project.error as Error).message} />;
  if (project.isPending || estimates.isPending || (clientId && client.isPending)) return <div className="stack" aria-busy="true"><Skeleton height={36} width="50%" /><Card><Skeleton height={160} /></Card></div>;
  if (!project.data) return <EmptyState art="projects" title={t('app.proj.notFound')} action={<ButtonLink to="/app/projects" variant="secondary">{t('app.proj.all')}</ButtonLink>} />;
  return <Composer key={id} p={project.data} est={estimates.data?.[0]} client={client.data ?? null} />;
}

function Composer({ p, est, client }: { p: NonNullable<Awaited<ReturnType<typeof getProject>>>; est?: Awaited<ReturnType<typeof listEstimates>>[number]; client: Awaited<ReturnType<typeof getClient>> }) {
  const { t } = useTranslation();
  const { user, profile } = useApp();
  const { money } = usePrefs();
  const toast = useToast();
  const me = profile?.business_name || profile?.name || '';
  const clientName = client?.company || client?.name || '';
  const cur = est?.currency ?? p.currency;
  const milestones = useMemo(() => (est?.data.milestones ?? []).map((m, i) => `${i + 1}. ${m.name} (${t('compose.weeks', { count: m.weeks })})`), [est, t]);

  const [kind, setKind] = useState<Kind>('proposal');
  const [title, setTitle] = useState(`${p.title}: ${t('doc.kind.proposal')}`);
  const outline = (kd: Kind): Section[] => {
    const s = (heading: string, body: string): Section => ({ key: k(), heading, body });
    const summary = est?.data.summary ?? '';
    return kd === 'agreement'
      ? [s(t('compose.sec.parties'), t('compose.partiesBody', { me: me || t('compose.yourBusiness'), client: clientName || t('compose.theClient'), title: p.title })), s(t('compose.sec.summary'), summary),
        ...(milestones.length ? [s(t('compose.sec.timeline'), milestones.join('\n'))] : [])]
      : [s(t('compose.sec.intro'), summary), ...(milestones.length ? [s(t('compose.sec.approach'), milestones.join('\n'))] : []),
        ...(est?.data.assumptions?.length ? [s(t('compose.sec.assumptions'), est.data.assumptions.map((a) => '- ' + a).join('\n'))] : []),
        s(t('compose.sec.next'), t('compose.nextBody'))];
  };
  const [sections, setSections] = useState<Section[]>(() => outline('proposal'));
  const [touched, setTouched] = useState(false);
  const [items, setItems] = useState<EditItem[]>(() => (est ? linesFromEstimate(est) : []).map((l) => newItem(l.kind, l.text, l.price)));
  const total = itemsTotal(items);
  const [preset, setPreset] = useState('50-50');
  const planFor = (key: string, tot: number): PlanRow[] => PRESETS[key].map(([label, pct, due]) => ({ key: k(), label: `${t(`compose.pay.${label}`)} ${pct}%`, amount: String(Math.round((tot * pct) / 100)), due: t(`compose.when.${due}`) }));
  const [plan, setPlan] = useState<PlanRow[]>(() => planFor('50-50', total));
  const [termsOn, setTermsOn] = useState(false);
  const [vars, setVars] = useState<Record<ClauseVar, string>>(() => Object.fromEntries(Object.entries(CLAUSE_VARS).map(([a, b]) => [a, String(b)])) as Record<ClauseVar, string>);
  const [law, setLaw] = useState(client?.country && LAW_COUNTRIES.includes(client.country) ? client.country : '');
  const [picked, setPicked] = useState<Set<string>>(() => new Set(CLAUSES.filter((c) => c.on).map((c) => c.id)));
  const [payIns, setPayIns] = useState(profile?.pay_instructions ?? '');
  const [payLink, setPayLink] = useState('');
  const [lang, setLang] = useState<Language>(profile?.lang ?? 'en');
  const [preview, setPreview] = useState(false);

  const changeKind = (kd: Kind) => {
    setKind(kd);
    setTitle(`${p.title}: ${t(`doc.kind.${kd}`)}`);
    if (kd === 'agreement') setTermsOn(true);
    if (!touched) setSections(outline(kd));
  };
  const editSections = (next: Section[]) => { setSections(next); setTouched(true); };

  const termsSection = () => {
    if (!termsOn) return null;
    const rateText = profile?.hourly_rate ? t('compose.rateText', { rate: money(Number(profile.hourly_rate), cur) }) : '';
    const v = { ...vars, freelancer: me || t('compose.theFreelancer'), client: clientName || t('compose.theClient'), rateText };
    const chosen = CLAUSES.filter((c) => picked.has(c.id));
    const body = [...chosen.map((c, i) => `${i + 1}. ${c.title}. ${fillClause(c.text, v)}`), `${chosen.length + 1}. Governing law. ${fillClause(LAW[law] + LAW_DISPUTES, v)}`].join('\n\n');
    return { heading: t('compose.terms'), body };
  };
  const doc = () => ({
    kind, title: title.trim(), client: clientName || t('compose.clientFallback'), agency: me || user.email || 'Freelancer', agencyEmail: profile?.email || user.email || '', currency: cur,
    sections: [...sections.filter((s) => s.heading.trim() && s.body.trim()).map(({ heading, body }) => ({ heading: heading.trim(), body: body.trim() })), termsSection()].filter(Boolean) as { heading: string; body: string }[],
    items: toSealItems(items), schedule: plan.filter((x) => x.label.trim() && Number(x.amount) > 0).map((x) => ({ label: x.label.trim(), amount: Number(x.amount), due: x.due.trim() })),
    payInstructions: payIns.trim(), payLink: payLink.trim(), projectId: p.id,
  });

  const write = useMutation({
    mutationFn: () => api<{ intro: string; approach: string; nextSteps: string }>('proposal', {
      project: p.title, client: clientName, freelancer: me, lang, summary: est?.data.summary ?? '', milestones, assumptions: est?.data.assumptions ?? [],
      features: est ? (est.data.features ?? []).map((x) => x.name) : toSealItems(items).map((l) => l.text),
    }),
    onSuccess: (r) => {
      // Fill a section by heading; a missing one goes after `after` (or first), keeping the order readable.
      const put = (list: Section[], heading: string, body: string, after?: string) => {
        if (list.some((s) => s.heading === heading)) return list.map((s) => (s.heading === heading ? { ...s, body } : s));
        const at = after ? list.findIndex((s) => s.heading === after) + 1 : 0;
        return [...list.slice(0, at), { key: k(), heading, body }, ...list.slice(at)];
      };
      let next = sections;
      if (kind === 'agreement') next = put(next, t('compose.sec.summary'), r.intro);
      else {
        next = put(next, t('compose.sec.intro'), r.intro);
        next = put(next, t('compose.sec.approach'), r.approach + (milestones.length ? '\n\n' + milestones.join('\n') : ''), t('compose.sec.intro'));
        next = put(next, t('compose.sec.next'), r.nextSteps, t('compose.sec.approach'));
      }
      editSections(next);
      toast({ title: t('compose.written'), tone: 'success' });
    },
    onError: (e) => toast({ title: errText(e), tone: 'danger' }),
  });
  const seal = useMutation({
    mutationFn: async () => {
      const d = doc();
      if (!d.items.length) throw new Error(t('compose.needLines'));
      return api<{ token: string }>('seal', d);
    },
    onError: (e) => toast({ title: errText(e), tone: 'danger' }),
  });

  if (seal.data) {
    const url = `${window.location.origin}/sign#${seal.data.token}`;
    return (
      <div className="detail">
        <Card className="stack new-done">
          <Icon name="link" size={28} />
          <h1>{t('new.readyTitle')}</h1>
          <p className="muted">{t('compose.readyBody')}</p>
          <LinkBox url={url} label={t('new.linkLabel')} />
          <div className="row">
            <a className="ss-btn ss-btn--secondary ss-btn--md" href={url} target="_blank" rel="noopener"><span className="ss-btn-label"><Icon name="eye" size={18} />{t('new.preview')}</span></a>
            <ButtonLink to={`/app/projects/${p.id}`} variant="ghost">{t('new.backToProject')}</ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  const d = preview ? doc() : null;
  return (
    <div className="detail">
      <Link to={`/app/projects/${p.id}`} className="back-link"><Icon name="arrow" size={16} />{p.title}</Link>
      <div className="page-head">
        <h1>{t('app.proj.compose')}</h1>
        <Select aria-label={t('compose.type')} value={kind} onChange={(e) => changeKind(e.target.value as Kind)}>
          <option value="proposal">{t('doc.kind.proposal')}</option><option value="agreement">{t('doc.kind.agreement')}</option>
        </Select>
      </div>
      <Field label={t('app.proj.title')}><Input maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>

      <section className="sect">
        <div className="sect-head">
          <h2>{t('compose.sections')}</h2>
          <div className="row">
            <Select aria-label={t('compose.aiLang')} value={lang} onChange={(e) => setLang(e.target.value as Language)}>{LANGUAGES.map((l) => <option key={l} value={l}>{LANG_NAME[l]}</option>)}</Select>
            <Button variant="secondary" size="sm" icon="spark" loading={write.isPending} onClick={() => write.mutate()}>{t('compose.writeAi')}</Button>
            <Button variant="ghost" size="sm" icon="plus" onClick={() => editSections([...sections, { key: k(), heading: '', body: '' }])}>{t('compose.addSection')}</Button>
          </div>
        </div>
        {sections.map((s, i) => (
          <Card key={s.key} className="comp-sec">
            <div className="comp-sec-head">
              <Input aria-label={t('compose.heading', { n: i + 1 })} maxLength={120} value={s.heading} onChange={(e) => editSections(sections.map((x) => (x.key === s.key ? { ...x, heading: e.target.value } : x)))} />
              <IconButton icon="x" size="sm" label={t('compose.removeSection', { n: i + 1 })} onClick={() => editSections(sections.filter((x) => x.key !== s.key))} />
            </div>
            <Textarea aria-label={t('compose.body', { n: i + 1 })} maxLength={6000} rows={Math.min(8, Math.max(3, s.body.split('\n').length + 1))} value={s.body}
              onChange={(e) => editSections(sections.map((x) => (x.key === s.key ? { ...x, body: e.target.value } : x)))} />
          </Card>
        ))}
      </section>

      <section className="sect">
        <h2>{t('compose.lines')}</h2>
        {!items.length && <p className="muted">{t('compose.noEstimate')}</p>}
        <ItemsEditor items={items} onChange={setItems} kinds={['scope', 'out']} currency={cur} />
      </section>

      <section className="sect">
        <div className="sect-head">
          <h2>{t('doc.schedule')}</h2>
          <Select aria-label={t('compose.schedulePreset')} value={preset} onChange={(e) => { setPreset(e.target.value); setPlan(planFor(e.target.value, total)); }}>
            {Object.keys(PRESETS).map((x) => <option key={x} value={x}>{t(`compose.preset.${x}`)}</option>)}
          </Select>
        </div>
        {plan.map((x, i) => (
          <div key={x.key} className="comp-pay">
            <Field label={t('compose.payment', { n: i + 1 })}><Input maxLength={120} value={x.label} onChange={(e) => setPlan(plan.map((y) => (y.key === x.key ? { ...y, label: e.target.value } : y)))} /></Field>
            <Field label={t('app.pay.amount')}><Input inputMode="decimal" value={x.amount} onChange={(e) => setPlan(plan.map((y) => (y.key === x.key ? { ...y, amount: e.target.value.replace(/[^\d.]/g, '') } : y)))} /></Field>
            <Field label={t('compose.when.label')}><Input maxLength={60} value={x.due} onChange={(e) => setPlan(plan.map((y) => (y.key === x.key ? { ...y, due: e.target.value } : y)))} /></Field>
            <IconButton icon="x" size="sm" label={t('compose.removePayment', { n: i + 1 })} onClick={() => setPlan(plan.filter((y) => y.key !== x.key))} />
          </div>
        ))}
        <p className="muted small">{t('compose.scheduleHint')}</p>
      </section>

      <section className="sect">
        <h2>{t('compose.terms')}</h2>
        <Card className="stack comp-terms">
          <label><input type="checkbox" checked={termsOn} onChange={(e) => setTermsOn(e.target.checked)} />{t('compose.includeTerms')}</label>
          <p className="doc-banner is-warn" role="note"><Icon name="alert" size={18} />{t('compose.notLegal')}</p>
          {termsOn && (<>
            <div className="new-grid">
              {(Object.keys(CLAUSE_VARS) as ClauseVar[]).map((v) => (
                <Field key={v} label={t(`compose.var.${v}`)}><Input type="number" min={0} max={365} value={vars[v]} onChange={(e) => setVars({ ...vars, [v]: e.target.value })} /></Field>
              ))}
              <Field label={t('compose.law')}>
                <Select value={law} onChange={(e) => setLaw(e.target.value)}>
                  <option value="">{t('compose.lawHome')}</option>
                  {LAW_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
            <div className="comp-groups">
              {[...new Set(CLAUSES.map((c) => c.group))].map((g) => (
                <fieldset key={g}>
                  <legend>{g}</legend>
                  {CLAUSES.filter((c) => c.group === g).map((c) => (
                    <label key={c.id}><input type="checkbox" checked={picked.has(c.id)} onChange={(e) => { const n = new Set(picked); if (e.target.checked) n.add(c.id); else n.delete(c.id); setPicked(n); }} />{c.title}</label>
                  ))}
                </fieldset>
              ))}
            </div>
          </>)}
        </Card>
      </section>

      <section className="sect">
        <h2>{t('compose.howPaid')}</h2>
        <Field label={t('new.payIns')} optional><Textarea rows={2} maxLength={800} value={payIns} onChange={(e) => setPayIns(e.target.value)} placeholder={t('app.onb.payInsPh')} /></Field>
        <Field label={t('new.payLink')} optional hint={t('new.payLinkHint')}><Input type="url" maxLength={500} value={payLink} onChange={(e) => setPayLink(e.target.value)} placeholder="https://buy.stripe.com/…" /></Field>
      </section>

      <div className="row">
        <Button variant="secondary" icon="eye" onClick={() => setPreview((x) => !x)} aria-expanded={preview}>{t(preview ? 'compose.hidePreview' : 'compose.preview')}</Button>
        <Button icon="link" loading={seal.isPending} onClick={() => seal.mutate()}>{t('compose.create')}</Button>
      </div>

      {d && (
        <Card className="comp-preview doc">
          <p className="muted small">{t('compose.previewMeta', { kind: t(`doc.kind.${d.kind}`), agency: d.agency, client: d.client })}</p>
          <h2>{d.title}</h2>
          <DocParts d={d} />
          <h2>{t('compose.lines')}</h2>
          <ul>{d.items.map((it, i) => <li key={i}>{it.text}{'price' in it && it.price ? ` · ${money(Number(it.price), cur)}` : ''}{it.kind === 'out' ? ` (${t('doc.items.out')})` : ''}</li>)}</ul>
        </Card>
      )}
    </div>
  );
}
