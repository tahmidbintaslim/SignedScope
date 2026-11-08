// Checks that a sign-off or receipt link was issued by SignedScope and not changed.
// A link pasted here, or opened as /verify#<token> (the badge on receipts), is verified by the API.
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefs } from '../../app/preferences';
import { api } from '../../lib/api';
import { Badge, Button, Card, Field, Icon, Input } from '../../ui';
import './legal.css';

interface Verified {
  hash: string;
  data: { type?: string; title?: string; revision?: number; createdAt?: string; signedAt?: string; outcome?: string; signer?: { name: string }; doc?: { title: string } };
}

/** Accepts a full link (…/receipt#v1.…, …/new#cr=…) or a bare token. */
export const tokenFrom = (v: string) => {
  const s = v.trim();
  return decodeURIComponent(s.includes('#') ? s.slice(s.indexOf('#') + 1) : s).replace(/^cr=/, '');
};

export default function Verify() {
  const { t } = useTranslation();
  const { date } = usePrefs();
  const [link, setLink] = useState('');
  const check = useMutation({ mutationFn: (token: string) => api<Verified>('verify', { token }, { auth: false }) });
  const submit = (e: FormEvent) => { e.preventDefault(); check.mutate(tokenFrom(link)); };

  // /verify#<token>: check straight away.
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (h) { setLink(window.location.href); check.mutate(tokenFrom(h)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = check.data?.data;
  return (
    <section className="container legal">
      <h1>{t('verify.title')}</h1>
      <p className="muted">{t('verify.lede')}</p>
      <Card>
        <form onSubmit={submit} className="stack">
          <Field label={t('verify.label')}><Input value={link} onChange={(e) => setLink(e.target.value)} required placeholder="https://…/receipt#v1.…" autoComplete="off" spellCheck={false} /></Field>
          <div><Button type="submit" icon="shield" loading={check.isPending}>{t('verify.go')}</Button></div>
        </form>
      </Card>
      <div aria-live="polite">
        {check.isError && (
          <Card className="verify-result is-bad"><Badge tone="danger"><Icon name="alert" size={14} />{t('verify.bad')}</Badge><p>{(check.error as Error).message}</p></Card>
        )}
        {d && (
          <Card className="verify-result is-ok">
            <Badge tone="success"><Icon name="check" size={14} />{d.type === 'receipt' ? t('verify.okReceipt') : t('verify.okLink')}</Badge>
            {d.type === 'receipt'
              ? <p>{t('verify.receipt', { title: d.doc?.title ?? '', name: d.signer?.name ?? '', when: d.signedAt ? date(d.signedAt, 'datetime') : '', outcome: (d.outcome ?? '').replace('_', ' ') })}</p>
              : <p>{t('verify.link', { title: d.title ?? '', revision: d.revision ?? 1, when: d.createdAt ? date(d.createdAt, 'datetime') : '' })}</p>}
            <p className="mono muted verify-hash">sha256 {check.data!.hash}</p>
          </Card>
        )}
      </div>
    </section>
  );
}
