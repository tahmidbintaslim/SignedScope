// The client's sign-off page (/sign#<token>). The client decides every line (accept or reject
// with a comment; exclusions are acknowledged), sees the total change live, and signs with their
// name. The server checks the token, records the decisions and returns a sealed receipt.
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefs } from '../../app/preferences';
import { api } from '../../lib/api';
import { KINDS, diffStatus, useHashToken, proposedTotal, type Decision, type DecisionStatus, type SealedDoc, type SealedItem, type Verified } from '../../lib/sealed';
import { Badge, Button, Card, Field, Icon, Input, Skeleton } from '../../ui';
import { CantOpen, DocParts, LinkBox, PayBox } from './parts';
import './doc.css';

interface Signed { receipt: string; outcome: 'approved' | 'changes_requested'; payable: boolean }

export default function Sign() {
  const { t } = useTranslation();
  const token = useHashToken(); // only in the browser, after "#"
  const doc = useQuery({
    queryKey: ['sign', token],
    queryFn: async () => {
      const r = await api<Verified<SealedDoc>>('verify', { token, viewed: true }, { auth: false });
      if (r.data.type !== 'doc') throw new Error(t('sign.notDoc'));
      return r.data;
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  });

  if (token === '') return <div className="container doc"><CantOpen title={t('sign.cantOpen')} message={t('sign.missing')} /></div>;
  if (doc.isError) return <div className="container doc"><CantOpen title={t('sign.cantOpen')} message={(doc.error as Error).message} /></div>;
  if (!doc.data) {
    return (
      <div className="container doc" aria-busy="true" role="status" aria-label={t('states.loading')}>
        <Skeleton width="40%" /><Skeleton height={40} width="70%" /><Card><Skeleton height={64} /></Card><Card><Skeleton height={64} /></Card>
      </div>
    );
  }
  return <SignForm key={token} token={token!} d={doc.data} />;
}

function SignForm({ token, d }: { token: string; d: SealedDoc }) {
  const { t } = useTranslation();
  const { money, date } = usePrefs();
  const cur = d.currency || 'USD';
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [who, setWho] = useState({ name: '', email: '', agree: false });
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (d.kind && d.kind !== 'scope') document.title = `${t(`doc.kind.${d.kind}`)} · SignedScope`;
  }, [d.kind, t]);

  const statusById = useMemo(() => Object.fromEntries(Object.entries(decisions).map(([k, v]) => [k, v.status])) as Record<string, DecisionStatus>, [decisions]);
  const total = proposedTotal(d.items, statusById);
  const base = d.parent?.total ?? null;
  const removed = d.parent ? d.parent.items.filter((p) => !d.items.some((i) => i.id === p.id)) : [];
  const undecided = d.items.filter((i) => !decisions[i.id]).length;

  const sign = useMutation({
    mutationFn: () => api<Signed>('sign', { token, name: who.name, email: who.email, agree: who.agree, decisions }, { auth: false }),
    onSuccess: () => window.scrollTo({ top: 0 }),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (undecided) { setMissing(true); document.querySelector<HTMLElement>('.decide.is-missing input')?.focus(); return; }
    sign.mutate();
  };
  const decide = (id: string, status: DecisionStatus) => setDecisions((x) => ({ ...x, [id]: { status, note: status === 'rejected' ? x[id]?.note ?? '' : undefined } }));

  if (sign.data) {
    const url = `${window.location.origin}/receipt#${sign.data.receipt}`;
    return (
      <div className="container doc">
        <Card className="doc-done stack">
          <Badge tone={sign.data.outcome === 'approved' ? 'success' : 'warning'}><Icon name="check" size={14} />{t(`receipt.${sign.data.outcome}`)}</Badge>
          <h1>{t(sign.data.outcome === 'approved' ? 'sign.doneOk' : 'sign.doneChanges')}</h1>
          <p className="muted">{t('sign.doneBody')}</p>
          <LinkBox url={url} label={t('sign.receiptLink')} />
          <div className="row"><a className="ss-btn ss-btn--secondary ss-btn--md" href={url}><span className="ss-btn-label"><Icon name="receipt" size={18} />{t('sign.openReceipt')}</span></a></div>
        </Card>
        {sign.data.payable && <PayBox d={d} label={t('sign.payNow')} />}
      </div>
    );
  }

  return (
    <article className="container doc">
      <p className="muted small">{t('sign.meta', { agency: d.agency, email: d.agencyEmail ? ` <${d.agencyEmail}>` : '', client: d.client, revision: d.revision || 1 })}</p>
      {d.anon && <p className="doc-banner is-warn" role="note"><Icon name="alert" size={18} />{t('sign.unverified')}</p>}
      <h1>{d.title}</h1>
      {d.parent && <p className="doc-banner"><Icon name="change" size={18} />{t('sign.crBanner', { title: d.parent.title, signer: d.parent.signer, when: date(d.parent.signedAt, 'datetime') })}</p>}
      {d.notes && <p className="muted pre">{d.notes}</p>}
      <div className="noprint"><Button variant="ghost" size="sm" icon="download" onClick={() => window.print()}>{t('sign.pdf')}</Button></div>
      <DocParts d={d} />

      <form onSubmit={submit} noValidate className="stack">
        {KINDS.map((kind) => {
          const its = d.items.filter((i) => i.kind === kind);
          if (!its.length) return null;
          return (
            <section key={kind} className="doc-group">
              <h2>{t(`doc.items.${kind}`)}</h2>
              {its.map((it) => <Line key={it.id} it={it} d={d} value={decisions[it.id]} missing={missing && !decisions[it.id]} onDecide={(s) => decide(it.id, s)}
                onNote={(note) => setDecisions((x) => ({ ...x, [it.id]: { ...x[it.id], note } }))} />)}
            </section>
          );
        })}
        {removed.length > 0 && (
          <section className="doc-group">
            <h2>{t('sign.removed')}</h2>
            {removed.map((r) => <p key={r.id} className="decide is-removed"><Badge tone="danger">{t('sign.diff.removed')}</Badge> {t(`doc.items.${r.kind}`)}: {r.text}</p>)}
          </section>
        )}
        {total.priced > 0 && (
          <div className="doc-total" aria-live="polite">
            <div className="doc-total-row"><span>{t(total.allDecided ? 'sign.totalFinal' : 'sign.totalProposed')}</span><b>{money(total.amount, cur)}</b></div>
            <p className="muted small">{base != null
              ? t('sign.totalDelta', { before: money(base, cur), delta: `${total.amount - base >= 0 ? '+' : '−'}${money(Math.abs(Math.round((total.amount - base) * 100) / 100), cur)}` })
              : t('sign.totalHint')}</p>
          </div>
        )}

        <Card className="stack doc-signer">
          <h2>{t('sign.signTitle')}</h2>
          <div className="doc-grid">
            <Field label={t('sign.name')}><Input required maxLength={120} autoComplete="name" value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} /></Field>
            <Field label={t('sign.email')} optional><Input type="email" maxLength={254} autoComplete="email" value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} /></Field>
          </div>
          <label className="doc-agree">
            <input type="checkbox" required checked={who.agree} onChange={(e) => setWho({ ...who, agree: e.target.checked })} />
            <span>{t('sign.agree')}{d.kind === 'agreement' ? ' ' + t('sign.agreeTerms') : ''}</span>
          </label>
          <p className="muted small">{t('sign.recorded')} <a href="/privacy">{t('home.footer.privacy')}</a></p>
          {missing && undecided > 0 && <p className="ss-error" role="alert">{t('sign.undecided', { count: undecided })}</p>}
          {sign.isError && <p className="ss-error" role="alert">{(sign.error as Error).message}</p>}
          <div><Button type="submit" size="lg" icon="sign" loading={sign.isPending} disabled={!who.name.trim() || !who.agree}>{t('sign.submit')}</Button></div>
        </Card>
      </form>
    </article>
  );
}

function Line({ it, d, value, missing, onDecide, onNote }: { it: SealedItem; d: SealedDoc; value?: Decision; missing: boolean; onDecide: (s: DecisionStatus) => void; onNote: (n: string) => void }) {
  const { t } = useTranslation();
  const { money } = usePrefs();
  const diff = diffStatus(it, d.parent);
  const prev = diff === 'changed' ? d.parent!.items.find((x) => x.id === it.id) : undefined;
  const opts: DecisionStatus[] = it.kind === 'out' ? ['acknowledged'] : ['accepted', 'rejected'];
  const name = 'd-' + it.id;
  return (
    <fieldset className={'decide' + (diff ? ` is-${diff}` : '') + (value ? ` is-${value.status}` : '') + (missing ? ' is-missing' : '')}>
      <legend className="visually-hidden">{it.text}</legend>
      <div className="decide-head">
        <div>
          {diff && <Badge tone={diff === 'added' ? 'success' : 'warning'}>{t(`sign.diff.${diff}`)}</Badge>}
          <p className="pre decide-text" aria-hidden="true">{it.text}</p>
          {prev && <p className="muted small">{t('sign.was', { text: prev.text })}{prev.price != null ? ` (${money(prev.price, d.currency)})` : ''}</p>}
        </div>
        {it.price != null && <b className={'decide-price' + (value?.status === 'rejected' ? ' is-struck' : '')}>{money(it.price, d.currency)}</b>}
      </div>
      <div className="decide-opts">
        {opts.map((o) => (
          <label key={o} className={'decide-opt is-' + o}>
            <input type="radio" name={name} value={o} checked={value?.status === o} onChange={() => onDecide(o)} />
            <Icon name={o === 'rejected' ? 'x' : 'check'} size={16} />{t(`sign.opt.${o}`)}
          </label>
        ))}
      </div>
      {value?.status === 'rejected' && (
        <Field label={t('sign.whatChange')}><Input required maxLength={600} value={value.note ?? ''} onChange={(e) => onNote(e.target.value)} autoFocus /></Field>
      )}
    </fieldset>
  );
}
