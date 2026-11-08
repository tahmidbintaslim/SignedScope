// Pieces shared by the client sign page and the receipt: the written sections and payment
// schedule of a proposal or agreement, the payment box, and the "can't open" state.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefs } from '../../app/preferences';
import { payHost, type SealedDoc } from '../../lib/sealed';
import { Button, ButtonLink, Card, EmptyState, Icon } from '../../ui';

export function DocParts({ d }: { d: Pick<SealedDoc, 'sections' | 'schedule' | 'currency'> }) {
  const { t } = useTranslation();
  const { money } = usePrefs();
  return (
    <>
      {(d.sections ?? []).map((s, i) => <section key={i} className="doc-sec"><h2>{s.heading}</h2><p className="pre">{s.body}</p></section>)}
      {(d.schedule ?? []).length > 0 && (
        <section className="doc-sec">
          <h2>{t('doc.schedule')}</h2>
          <table className="doc-sched"><tbody>
            {d.schedule!.map((x, i) => <tr key={i}><td>{x.label}</td><td className="muted">{x.due ?? ''}</td><td className="num">{money(x.amount, d.currency)}</td></tr>)}
          </tbody></table>
        </section>
      )}
    </>
  );
}

/** Pay button (https links only, host named) and plain-text instructions. Money never passes through us. */
export function PayBox({ d, label }: { d: Pick<SealedDoc, 'payLink' | 'payInstructions' | 'agency'>; label: string }) {
  const { t } = useTranslation();
  const host = payHost(d.payLink);
  if (!host && !d.payInstructions) return null;
  return (
    <Card className="doc-pay stack">
      {host && (<>
        <a className="ss-btn ss-btn--primary ss-btn--lg" href={d.payLink} target="_blank" rel="noopener noreferrer"><span className="ss-btn-label"><Icon name="pay" size={18} />{label}<Icon name="external" size={16} /></span></a>
        <p className="muted small">{t('doc.payNote', { agency: d.agency, host })}</p>
      </>)}
      {d.payInstructions && <div><h3>{t('doc.howToPay')}</h3><p className="pre">{d.payInstructions}</p></div>}
    </Card>
  );
}

export function CantOpen({ title, message }: { title: string; message: string }) {
  const { t } = useTranslation();
  return (
    <div className="doc-empty" aria-live="polite">
      <EmptyState art="inbox" title={title} body={<>{message}<br />{t('doc.cutOff')}</>}
        action={<div className="row"><ButtonLink to="/#demo">{t('doc.howItWorks')}</ButtonLink><ButtonLink to="/verify" variant="secondary">{t('doc.checkLink')}</ButtonLink></div>} />
    </div>
  );
}

/** Copyable read-only link with a Copy button. */
export function LinkBox({ url, label }: { url: string; label: string }) {
  const { t } = useTranslation();
  return (
    <div className="doc-share">
      <input className="ss-input" readOnly value={url} aria-label={label} onFocus={(e) => e.currentTarget.select()} />
      <CopyButton text={url} label={t('actions.copy')} />
    </div>
  );
}
function CopyButton({ text, label }: { text: string; label: string }) {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);
  return <Button variant="secondary" icon={done ? 'check' : 'copy'} onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch { window.prompt(label, text); } }}>{done ? t('actions.copied') : label}</Button>;
}
