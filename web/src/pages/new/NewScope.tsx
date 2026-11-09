// New scope (/new): lines the client approves one by one, with optional prices, sealed into a
// sign-off link. Three ways in:
//   /new                       blank, or filled from an AI estimate (sessionStorage "ss-draft")
//   /new#cr=<receipt>          change request against a signed receipt (same currency, ids kept)
//   /new?project=<id>          signed in: filed to that project and your details filled in
// The link is made by the server (api/seal); this page keeps no copy.
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefs } from '../../app/preferences';
import { api } from '../../lib/api';
import { fullySignedIn } from '../../lib/auth';
import { getProfile } from '../../lib/db';
import { takeDraft } from '../../lib/draft';
import { safeDecode } from '../../lib/sealed';
import { CURRENCIES } from '../../lib/locale';
import type { SealedReceipt, Verified } from '../../lib/sealed';
import { Button, Card, Field, Icon, Input, Select, Textarea } from '../../ui';
import { LinkBox } from '../doc/parts';
import { ItemsEditor, itemsTotal, newItem, toSealItems, type EditItem } from './ItemsEditor';
import './new.css';
import '../../i18n/pages';

interface Form { title: string; client: string; agency: string; agencyEmail: string; currency: string; payLink: string; payInstructions: string; notes: string }
type Banner = { tone: 'info' | 'warn'; text: string } | null;

export default function NewScope() {
  const { t } = useTranslation();
  const { locale, date } = usePrefs();
  const [f, setF] = useState<Form>({ title: '', client: '', agency: '', agencyEmail: '', currency: locale.currency, payLink: '', payInstructions: '', notes: '' });
  // The stored locale arrives after hydration; follow it until the currency is chosen or set by a
  // draft or change request.
  const currencySet = useRef(false);
  useEffect(() => { if (!currencySet.current) setF((x) => (x.currency === locale.currency ? x : { ...x, currency: locale.currency })); }, [locale.currency]);
  const [items, setItems] = useState<EditItem[]>(() => [newItem('scope'), newItem('uat'), newItem('out')]);
  const [parent, setParent] = useState<string | null>(null);
  // Share of the approved amount due on signing; change requests default to 100% of the increase.
  const [deposit, setDeposit] = useState('');
  const [heading, setHeading] = useState('');
  const [banner, setBanner] = useState<Banner>(null);
  const [paste, setPaste] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  // Start: change request, then an estimate draft, then blank. Runs in the browser only.
  useEffect(() => {
    const pid = new URLSearchParams(window.location.search).get('project');
    setProjectId(pid);
    const h = safeDecode(window.location.hash.slice(1));
    if (h.startsWith('cr=')) {
      const token = h.slice(3);
      api<Verified<SealedReceipt>>('verify', { token }, { auth: false }).then(({ data }) => {
        if (data.type !== 'receipt') throw new Error(t('receipt.notReceipt'));
        const d = data.doc;
        setParent(token);
        setDeposit('100');
        setHeading(t('new.crTitle', { n: (d.revision || 1) + 1 }));
        setBanner({ tone: 'info', text: t('new.crBanner', { title: d.title, signer: data.signer.name, when: date(data.signedAt, 'datetime') }) });
        currencySet.current = true;
        setF({ title: d.title, client: d.client, agency: d.agency, agencyEmail: d.agencyEmail ?? '', currency: d.currency || 'USD', payLink: d.payLink ?? '', payInstructions: d.payInstructions ?? '', notes: '' });
        setItems(d.items.map((it) => newItem(it.kind, it.text, it.price ?? undefined, it.id)));
      }).catch((e: Error) => setBanner({ tone: 'warn', text: t('new.crFailed', { error: e.message }) }));
      return;
    }
    const draft = takeDraft();
    if (draft) {
      currencySet.current = true;
      setF((x) => ({ ...x, title: draft.title, client: draft.client ?? x.client, notes: draft.notes, currency: (CURRENCIES as readonly string[]).includes(draft.currency) ? draft.currency : x.currency }));
      setItems(draft.items.map((it) => newItem(it.kind, it.text, it.price)));
      setBanner({ tone: 'info', text: t('new.fromEstimate') });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Your details from the profile, only into empty fields.
  // Signed in (even without a project): the link is made with your account, so it shows as verified.
  const session = useQuery({ queryKey: ['session'], queryFn: fullySignedIn, staleTime: 60_000 });
  useEffect(() => {
    const s = session.data;
    if (!s) return;
    getProfile(s.user.id).then((p) => setF((x) => ({
      ...x, agency: x.agency || p?.business_name || p?.name || '', agencyEmail: x.agencyEmail || p?.email || s.user.email || '', payInstructions: x.payInstructions || p?.pay_instructions || '',
    }))).catch(() => undefined);
  }, [session.data]);

  const draft = useMutation({
    mutationFn: () => api<{ items: { kind: EditItem['kind']; text: string }[]; source: string }>('draft', { text: paste.trim() }, { auth: false }),
    onSuccess: ({ items: got, source }) => {
      setItems((cur) => [...cur.filter((i) => i.text.trim()), ...got.map((it) => newItem(it.kind, it.text))]);
      setDraftNote(got.length ? t(source === 'ai' ? 'new.draftedAi' : 'new.drafted', { count: got.length }) : t('new.draftedNone'));
    },
    onError: (e) => setDraftNote((e as Error).message),
  });

  const seal = useMutation({
    mutationFn: () => api<{ token: string; documentId?: string }>('seal', {
      ...f, payLink: f.payLink.trim(), payInstructions: f.payInstructions.trim(), items: toSealItems(items),
      ...(parent ? { parent } : {}), ...(projectId ? { projectId } : {}),
      ...(Number(deposit) > 0 && itemsTotal(items) > 0 ? { deposit: Number(deposit) } : {}),
    }),
    onSuccess: () => window.scrollTo({ top: 0 }),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); seal.mutate(); };

  if (seal.data) {
    const url = `${window.location.origin}/sign#${seal.data.token}`;
    return (
      <div className="container new">
        <Card className="stack new-done">
          <Icon name="link" size={28} />
          <h1>{t('new.readyTitle')}</h1>
          <p className="muted">{t('new.readyBody')}</p>
          <LinkBox url={url} label={t('new.linkLabel')} />
          <div className="row">
            <a className="ss-btn ss-btn--secondary ss-btn--md" href={url} target="_blank" rel="noopener"><span className="ss-btn-label"><Icon name="eye" size={18} />{t('new.preview')}</span></a>
            {/* Hash form: works on the old workspace and redirects in the new one. */}
            {seal.data.documentId && projectId && <a className="ss-btn ss-btn--ghost ss-btn--md" href={`/app#/projects/${encodeURIComponent(projectId)}`}><span className="ss-btn-label">{t('new.backToProject')}</span></a>}
          </div>
          {seal.data.documentId && <p className="muted small">{t('new.filed')}</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="container new">
      <h1>{heading || t('new.title')}</h1>
      {banner && <p className={'doc-banner' + (banner.tone === 'warn' ? ' is-warn' : '')} role={banner.tone === 'warn' ? 'alert' : 'status'}><Icon name={banner.tone === 'warn' ? 'alert' : 'info'} size={18} />{banner.text}</p>}
      {projectId && session.isSuccess && !session.data && <p className="doc-banner is-warn" role="status"><Icon name="alert" size={18} />{t('new.signInToFile')}</p>}
      <form className="stack" onSubmit={submit}>
        <div className="new-grid">
          <Field label={t('new.titleLabel')}><Input required maxLength={160} value={f.title} onChange={set('title')} placeholder={t('new.titlePh')} /></Field>
          <Field label={t('new.client')}><Input required maxLength={120} value={f.client} onChange={set('client')} placeholder="Acme Co." /></Field>
          <Field label={t('new.agency')}><Input required maxLength={120} value={f.agency} onChange={set('agency')} autoComplete="organization" /></Field>
          <Field label={t('new.agencyEmail')} optional><Input type="email" maxLength={254} value={f.agencyEmail} onChange={set('agencyEmail')} autoComplete="email" /></Field>
        </div>

        {!parent && (
          <Card className="stack">
            <Field label={t('new.paste')} optional hint={draftNote || t('new.pasteHint')}>
              <Textarea rows={3} maxLength={6000} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={t('new.pastePh')} />
            </Field>
            <div><Button variant="secondary" size="sm" icon="spark" loading={draft.isPending} disabled={!paste.trim()} onClick={() => draft.mutate()}>{t('new.draft')}</Button></div>
          </Card>
        )}

        <section className="stack">
          <div><h2>{t('new.items')}</h2><p className="muted small">{t('new.itemsHint')}</p></div>
          <ItemsEditor items={items} onChange={setItems} kinds={['scope', 'uat', 'out']} currency={f.currency} />
        </section>

        <div className="new-grid">
          <Field label={t('new.currency')} hint={parent ? t('new.currencyLocked') : undefined}>
            <Select value={f.currency} onChange={(e) => { currencySet.current = true; set('currency')(e); }} disabled={Boolean(parent)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>
          </Field>
          <Field label={t('new.deposit')} hint={!itemsTotal(items) ? t('new.depositNeedsPrice') : t(parent ? 'new.depositHintCr' : 'new.depositHint')}>
            <Select value={deposit} onChange={(e) => setDeposit(e.target.value)} disabled={!itemsTotal(items)}>
              <option value="">{t('new.depositNone')}</option>
              {[25, 30, 50, 100].map((p) => <option key={p} value={p}>{t('new.depositPct', { pct: p })}</option>)}
            </Select>
          </Field>
          <Field label={t('new.payLink')} optional hint={t('new.payLinkHint')}>
            <Input type="url" maxLength={500} value={f.payLink} onChange={set('payLink')} placeholder="https://buy.stripe.com/…" />
          </Field>
        </div>
        <Field label={t('new.payIns')} optional hint={t('new.payInsHint')}>
          <Textarea rows={2} maxLength={800} value={f.payInstructions} onChange={set('payInstructions')} placeholder={t('app.onb.payInsPh')} />
        </Field>
        <Field label={t('new.notes')} optional><Textarea rows={3} maxLength={2000} value={f.notes} onChange={set('notes')} /></Field>
        {seal.isError && <p className="ss-error" role="alert">{(seal.error as Error).message}</p>}
        <div><Button type="submit" size="lg" icon="link" loading={seal.isPending}>{t('new.create')}</Button></div>
      </form>
    </div>
  );
}
