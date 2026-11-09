// A signed receipt (/receipt#<token>): who approved what and when, the approved total, the
// evidence hashes, and the payment details when something payable was approved. The badge
// links to /verify so anyone can check the receipt independently.
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usePrefs } from '../../app/preferences';
import { api } from '../../lib/api';
import { KINDS, useHashToken, isPayable, type SealedReceipt, type Verified } from '../../lib/sealed';
import { Badge, Button, ButtonLink, Card, Icon, Skeleton } from '../../ui';
import { CantOpen, DocParts, DueBox, PayBox } from './parts';
import './doc.css';
import '../../i18n/pages';

/** Print to PDF with a useful file name (browsers use the page title), then restore the title. */
function auditPdf(name: string) {
  const before = document.title;
  document.title = name.replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 120);
  window.addEventListener('afterprint', () => { document.title = before; }, { once: true });
  window.print();
}

export default function Receipt() {
  const { t } = useTranslation();
  const { money, date } = usePrefs();
  const token = useHashToken();
  const q = useQuery({
    queryKey: ['receipt', token],
    queryFn: async () => {
      const r = await api<Verified<SealedReceipt>>('verify', { token }, { auth: false });
      if (r.data.type !== 'receipt') throw new Error(t('receipt.notReceipt'));
      return r;
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  });

  if (token === '' || q.isError) return <div className="container doc"><CantOpen title={t('receipt.cantOpen')} message={q.isError ? (q.error as Error).message : t('sign.missing')} /></div>;
  if (!q.data) return <div className="container doc" aria-busy="true" role="status" aria-label={t('states.loading')}><Skeleton width="30%" /><Skeleton height={40} width="70%" /><Card><Skeleton height={120} /></Card></div>;

  const r = q.data.data, d = r.doc, cur = r.totals?.currency ?? d.currency ?? 'USD';
  const payable = (Boolean(d.payLink) || Boolean(d.payInstructions)) && isPayable(d.items, r.decisions, r.totals?.accepted);
  const delta = r.totals?.baseline != null ? Math.round((r.totals.accepted - r.totals.baseline) * 100) / 100 : null;

  return (
    <article className="container doc">
      <div className="row">
        <a className="doc-verified" href={`/verify#${encodeURIComponent(token!)}`} title={t('receipt.verifyHint')}>
          <Badge tone="success"><Icon name="shield" size={14} />{t('receipt.verified')}</Badge>
        </a>
        <Badge tone={r.outcome === 'approved' ? 'success' : 'warning'}>{t(`receipt.${r.outcome}`)}</Badge>
      </div>
      <h1>{d.title}</h1>
      <p className="muted">{t('receipt.meta', { name: r.signer.name, email: r.signer.email ? ` <${r.signer.email}>` : '', client: d.client, when: date(r.signedAt, 'datetime'), agency: d.agency, revision: d.revision || 1 })}</p>
      <DocParts d={d} />

      {KINDS.map((kind) => {
        const its = d.items.filter((i) => i.kind === kind);
        if (!its.length) return null;
        return (
          <section key={kind} className="doc-group">
            <h2>{t(`doc.items.${kind}`)}</h2>
            {its.map((it) => {
              const dec = r.decisions[it.id];
              return (
                <div key={it.id} className={'decide' + (dec ? ` is-${dec.status}` : '')}>
                  <div className="decide-head">
                    <div>
                      <Badge tone={dec?.status === 'rejected' ? 'warning' : 'success'}>{dec ? t(`sign.opt.${dec.status}`) : '?'}</Badge>
                      <p className="pre decide-text">{it.text}</p>
                      {dec?.note && <p className="muted small">{t('receipt.comment', { note: dec.note })}</p>}
                    </div>
                    {it.price != null && <b className={'decide-price' + (dec?.status === 'rejected' ? ' is-struck' : '')}>{money(it.price, d.currency)}</b>}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}

      {r.totals && (
        <div className="doc-total">
          <div className="doc-total-row"><span>{t('receipt.total')}</span><b>{money(r.totals.accepted, cur)}</b></div>
          {delta != null && <p className="muted small">{t('receipt.totalDelta', { base: money(r.totals.baseline!, cur), delta: `${delta >= 0 ? '+' : '−'}${money(Math.abs(delta), cur)}`, total: money(r.totals.accepted, cur) })}</p>}
        </div>
      )}

      {r.due && <DueBox due={r.due} currency={r.due.currency} changeRequest={Boolean(d.parent)} />}
      {payable && <PayBox d={d} label={t('receipt.pay')} />}

      <Card className="doc-evidence">
        <h2>{t('receipt.evidence')}</h2>
        <p className="print-only small">{t('receipt.auditPrinted', { when: new Date().toISOString() })}</p>
        <dl>
          <dt>{t('receipt.signer')}</dt><dd>{r.signer.name}{r.signer.email ? ` <${r.signer.email}>` : ''}</dd>
          <dt>{t('receipt.signedAt')}</dt><dd className="mono">{r.signedAt}</dd>
          {d.createdAt && <><dt>{t('receipt.createdAt')}</dt><dd className="mono">{d.createdAt}</dd></>}
          <dt>{t('receipt.outcomeLabel')}</dt><dd>{t(`receipt.${r.outcome}`)} · {t('receipt.revisionN', { n: d.revision || 1 })}</dd>
          <dt>{t('receipt.preparedBy')}</dt><dd>{d.agency}{d.agencyEmail ? ` <${d.agencyEmail}>` : ''}{d.anon ? ` · ${t('receipt.unverifiedSender')}` : ''}</dd>
          <dt>{t('receipt.docHash')}</dt><dd className="mono">{r.docHash}</dd>
          <dt>{t('receipt.receiptHash')}</dt><dd className="mono">{q.data.hash}</dd>
          <dt>{t('receipt.country')}</dt><dd>{r.evidence.country || t('receipt.na')}</dd>
          <dt>{t('receipt.ua')}</dt><dd className="mono">{r.evidence.uaHash}</dd>
          {d.parent && <><dt>{t('receipt.supersedes')}</dt><dd className="mono">{d.parent.receiptHash}</dd></>}
        </dl>
        <p className="small">{t('receipt.howToVerify', { url: `${window.location.origin}/verify` })}</p>
        <p className="muted small">{t('receipt.notLegal')}</p>
      </Card>

      <div className="row noprint">
        <Button variant="secondary" icon="download" onClick={() => auditPdf(`SignedScope receipt - ${d.title} - ${r.signedAt.slice(0, 10)}`)}>{t('receipt.print')}</Button>
        <ButtonLink to={`/new#cr=${encodeURIComponent(token!)}`} variant="ghost" icon="change">{t('receipt.changeRequest')}</ButtonLink>
      </div>
    </article>
  );
}
