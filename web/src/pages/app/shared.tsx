// Small pieces shared by the workspace pages: confirm dialog, copy-to-clipboard, status badges,
// the new-project dialog and the client form.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { createClient, createProject, keys, listClients, updateClient, type Client, type Doc, type Payment } from '../../lib/db';
import { CURRENCIES } from '../../lib/locale';
import { Badge, Button, Dialog, Field, Input, Select, Textarea, useToast } from '../../ui';
import { useApp } from './context';

export const today = () => new Date().toISOString().slice(0, 10);
export const fmtSize = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
export const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Copies text and confirms with a toast; falls back to a prompt where the clipboard is blocked. */
export function useCopy() {
  const { t } = useTranslation();
  const toast = useToast();
  return async (text: string, title = t('app.common.linkCopied')) => {
    try { await navigator.clipboard.writeText(text); toast({ title, tone: 'success' }); } catch { window.prompt(t('app.common.copyThis'), text); }
  };
}

/** A destructive confirmation. Escape and the backdrop don't close it; the button shows progress. */
export function Confirm({ open, onClose, title, body, action, onConfirm }: { open: boolean; onClose: () => void; title: ReactNode; body: ReactNode; action: string; onConfirm: () => Promise<unknown> }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { await onConfirm(); onClose(); } catch (e) { toast({ title: errText(e), tone: 'danger' }); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} title={title} description={body} dismissible={!busy}
      footer={<><Button variant="ghost" onClick={onClose} disabled={busy}>{t('actions.cancel')}</Button><Button variant="danger" onClick={run} loading={busy}>{action}</Button></>} />
  );
}

const DOC_TONE: Record<Doc['status'], 'brand' | 'warning' | 'success' | 'danger'> = { sent: 'brand', viewed: 'warning', signed: 'success', changes_requested: 'danger' };
export function DocStatus({ status }: { status: Doc['status'] }) {
  const { t } = useTranslation();
  return <Badge tone={DOC_TONE[status]}>{t(`app.doc.${status}`)}</Badge>;
}
const PAY_TONE: Record<Payment['status'], 'neutral' | 'success' | 'warning'> = { requested: 'warning', paid_manual: 'success', paid_provider: 'success', cancelled: 'neutral' };
export function PayStatus({ status }: { status: Payment['status'] }) {
  const { t } = useTranslation();
  return <Badge tone={PAY_TONE[status]}>{t(`app.pay.${status}`)}</Badge>;
}

/** New project, optionally with a new client in the same step. Opens the project when created. */
export function NewProjectDialog({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId?: string }) {
  const { t } = useTranslation();
  const { profile } = useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const clients = useQuery({ queryKey: keys.clients, queryFn: listClients, enabled: open });
  const [f, setF] = useState({ title: '', client: clientId ?? '', newClient: '', currency: profile?.currency || 'USD' });
  const create = useMutation({
    mutationFn: async () => {
      let cid = f.client && f.client !== '__new' ? f.client : null;
      if (f.client === '__new') cid = (await createClient({ name: f.newClient.trim().slice(0, 120) })).id;
      return createProject({ title: f.title.trim().slice(0, 160), client_id: cid, currency: f.currency });
    },
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: keys.projects });
      void qc.invalidateQueries({ queryKey: keys.clients });
      onClose();
      navigate(`/app/projects/${p.id}`);
    },
    onError: (e) => toast({ title: errText(e), tone: 'danger' }),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(); };
  return (
    <Dialog open={open} onClose={onClose} title={t('app.proj.newTitle')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('actions.cancel')}</Button><Button type="submit" form="new-project" loading={create.isPending}>{t('app.proj.create')}</Button></>}>
      <form id="new-project" className="stack" onSubmit={submit}>
        <Field label={t('app.proj.title')}><Input required maxLength={160} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={t('app.onb.projectPh')} autoFocus /></Field>
        <Field label={t('app.proj.client')}>
          <Select value={f.client} onChange={(e) => setF({ ...f, client: e.target.value })}>
            <option value="">{t('app.proj.noClient')}</option>
            <option value="__new">{t('app.proj.addClient')}</option>
            {clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        {f.client === '__new' && <Field label={t('app.onb.clientName')}><Input required maxLength={120} value={f.newClient} onChange={(e) => setF({ ...f, newClient: e.target.value })} autoFocus /></Field>}
        <Field label={t('app.proj.currency')}>
          <Select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>
        </Field>
      </form>
    </Dialog>
  );
}

type ClientFields = Pick<Client, 'name' | 'company' | 'email' | 'phone' | 'country' | 'notes'>;
const toForm = (c?: Client | null) => ({ name: c?.name ?? '', company: c?.company ?? '', email: c?.email ?? '', phone: c?.phone ?? '', country: c?.country ?? '', notes: c?.notes ?? '' });
const toRow = (f: ReturnType<typeof toForm>): ClientFields => ({
  name: f.name.trim(), company: f.company.trim() || null, email: f.email.trim() || null, phone: f.phone.trim() || null,
  country: f.country.trim().toUpperCase() || null, notes: f.notes.trim() || null,
});

/** Add or edit a client. `formId` lets a dialog footer submit it. */
export function ClientForm({ client, formId, onSaved, footer }: { client?: Client | null; formId: string; onSaved: (c: Client) => void; footer?: (busy: boolean) => ReactNode }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState(() => toForm(client));
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = useMutation({
    mutationFn: () => (client ? updateClient(client.id, toRow(f)) : createClient(toRow(f))),
    onSuccess: (c) => {
      qc.setQueryData(['client', c.id], c);
      void qc.invalidateQueries({ queryKey: keys.clients });
      toast({ title: t('app.common.saved'), tone: 'success' });
      onSaved(c);
    },
    onError: (e) => toast({ title: errText(e), tone: 'danger' }),
  });
  return (
    <form id={formId} className="stack" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <div className="form-grid">
        <Field label={t('app.cli.name')}><Input required maxLength={120} value={f.name} onChange={set('name')} autoComplete="off" /></Field>
        <Field label={t('app.cli.company')} optional><Input maxLength={120} value={f.company} onChange={set('company')} autoComplete="off" /></Field>
        <Field label={t('app.cli.email')} optional><Input type="email" maxLength={254} value={f.email} onChange={set('email')} autoComplete="off" /></Field>
        <Field label={t('app.cli.phone')} optional><Input maxLength={40} value={f.phone} onChange={set('phone')} autoComplete="off" /></Field>
        <Field label={t('app.cli.country')} hint={t('app.cli.countryHint')} optional><Input maxLength={2} pattern="[A-Za-z]{2}" value={f.country} onChange={set('country')} placeholder="TH" autoComplete="off" /></Field>
      </div>
      <Field label={t('app.cli.notes')} optional><Textarea rows={3} maxLength={2000} value={f.notes} onChange={set('notes')} /></Field>
      {footer?.(save.isPending)}
    </form>
  );
}
