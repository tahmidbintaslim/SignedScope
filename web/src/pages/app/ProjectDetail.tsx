// One project: status and client, estimates, documents and their client links, payments,
// private files and activity. Status and client changes show at once and roll back on error.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { usePrefs } from '../../app/preferences';
import {
  MAX_FILE, answerQuestion, blockedFile, deleteProject, fileUrl, getProject, keys, listClients, listEstimates, listFiles, listProjectActivity, listProjectDocuments,
  listProjectPayments, listQuestions, markPaid, projectKeys, removeFile, requestPayment, sumByCurrency, updateProject, uploadFile, type Doc, type Payment, type Project, type Question, type VaultFile,
} from '../../lib/db';
import { linesFromEstimate, saveDraft } from '../../lib/draft';
import { CURRENCIES } from '../../lib/locale';
import { Button, ButtonLink, Card, Dialog, EmptyState, Field, Icon, Input, Select, Skeleton, Textarea, useToast } from '../../ui';
import { useApp } from './context';
import { useActivityText } from './Dashboard';
import { STATUSES } from './Projects';
import { Confirm, DocStatus, PayStatus, errText, fmtSize, today, useCopy } from './shared';

export default function ProjectDetail() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { user } = useApp();
  const { money, date } = usePrefs();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const copy = useCopy();
  const actText = useActivityText();

  const project = useQuery({ queryKey: projectKeys.one(id), queryFn: () => getProject(id) });
  const clients = useQuery({ queryKey: keys.clients, queryFn: listClients });
  const estimates = useQuery({ queryKey: projectKeys.estimates(id), queryFn: () => listEstimates(id) });
  const docs = useQuery({ queryKey: projectKeys.documents(id), queryFn: () => listProjectDocuments(id) });
  const pays = useQuery({ queryKey: projectKeys.payments(id), queryFn: () => listProjectPayments(id) });
  const acts = useQuery({ queryKey: projectKeys.activity(id), queryFn: () => listProjectActivity(id) });
  const [deleting, setDeleting] = useState(false);

  // Optimistic: the select shows the new value at once; an error puts the old one back.
  const update = useMutation({
    mutationFn: (patch: Partial<Pick<Project, 'status' | 'client_id'>>) => updateProject(project.data!, patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: projectKeys.one(id) });
      const before = qc.getQueryData<Project>(projectKeys.one(id));
      if (before) qc.setQueryData(projectKeys.one(id), { ...before, ...patch });
      return { before };
    },
    onError: (e, _p, ctx) => { if (ctx?.before) qc.setQueryData(projectKeys.one(id), ctx.before); toast({ title: errText(e), tone: 'danger' }); },
    onSuccess: (row, patch) => {
      qc.setQueryData(projectKeys.one(id), row);
      toast({ title: t(patch.status ? 'app.proj.statusSaved' : 'app.proj.clientSaved'), tone: 'success' });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.projects });
      void qc.invalidateQueries({ queryKey: projectKeys.activity(id) });
      void qc.invalidateQueries({ queryKey: ['activity'] }); // dashboard feed
    },
  });

  if (project.isError) return <EmptyState art="inbox" title={t('app.dash.error')} body={(project.error as Error).message} />;
  if (project.isPending) return <div className="stack" aria-busy="true"><Skeleton height={36} width="50%" /><Card><Skeleton height={120} /></Card><Card><Skeleton height={120} /></Card></div>;
  const p = project.data;
  if (!p) return <EmptyState art="projects" title={t('app.proj.notFound')} action={<ButtonLink to="/app/projects" variant="secondary">{t('app.proj.all')}</ButtonLink>} />;

  const client = clients.data?.find((c) => c.id === p.client_id);
  const latest = estimates.data?.[0];
  const signed = docs.data?.find((d) => d.status === 'signed' && d.receipt_token);
  const newScope = () => {
    if (latest) saveDraft({ title: p.title, currency: latest.currency, notes: '', items: linesFromEstimate(latest), client: client?.name });
    window.location.assign('/new?project=' + encodeURIComponent(p.id));
  };

  return (
    <div className="detail">
      <Link to="/app/projects" className="back-link"><Icon name="arrow" size={16} />{t('app.nav.projects')}</Link>
      <div className="page-head">
        <div>
          <h1>{p.title}</h1>
          <p className="muted">
            {client ? <Link to={`/app/clients/${client.id}`}>{client.name}</Link> : t('app.proj.noClient')}
            {` · ${p.currency} · ${t('app.proj.created', { date: date(p.created_at) })}`}
          </p>
        </div>
        <div className="row">
          <Select aria-label={t('app.proj.client')} value={p.client_id ?? ''} onChange={(e) => update.mutate({ client_id: e.target.value || null })}>
            <option value="">{t('app.proj.noClient')}</option>
            {clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select aria-label={t('app.proj.status')} value={p.status} onChange={(e) => update.mutate({ status: e.target.value as Project['status'] })}>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`app.status.${s}`)}</option>)}
          </Select>
        </div>
      </div>

      <section className="sect">
        <div className="sect-head">
          <h2>{t('app.proj.estimates')}</h2>
          <ButtonLink to={`/estimate?project=${p.id}`} variant="ghost" size="sm" icon="spark">{t('app.proj.newEstimate')}</ButtonLink>
        </div>
        <Card className="card-flush">
          {!estimates.data ? <Skeleton height={48} /> : estimates.data.length ? (
            <table className="tbl tbl-stack"><tbody>
              {estimates.data.map((e) => (
                <tr key={e.id}>
                  <td>{money(Number(e.price_low), e.currency)} – {money(Number(e.price_high), e.currency)}</td>
                  <td className="muted">{t('app.proj.hours', { low: Number(e.hours_low), high: Number(e.hours_high) })}</td>
                  <td className="muted hide-sm">{date(e.created_at)}</td>
                </tr>
              ))}
            </tbody></table>
          ) : <p className="muted pad">{t('app.proj.noEstimates')}</p>}
        </Card>
      </section>

      <section className="sect">
        <div className="sect-head">
          <h2>{t('app.proj.documents')}</h2>
          <div className="row">
            {signed && <ButtonLink to={`/new?project=${p.id}#cr=${encodeURIComponent(signed.receipt_token!)}`} variant="ghost" size="sm" icon="change">{t('app.proj.changeRequest')}</ButtonLink>}
            <ButtonLink to={`/app/projects/${p.id}/compose`} variant="ghost" size="sm" icon="template">{t('app.proj.compose')}</ButtonLink>
            <Button size="sm" icon="plus" onClick={newScope}>{latest ? t('app.proj.scopeFromEstimate') : t('app.nav.newScope')}</Button>
          </div>
        </div>
        <Card className="card-flush">
          {!docs.data ? <Skeleton height={48} /> : docs.data.length ? (
            <table className="tbl tbl-stack"><tbody>
              {docs.data.map((d) => <DocRow key={d.id} d={d} onCopy={() => copy(`${window.location.origin}/sign#${d.token}`)} />)}
            </tbody></table>
          ) : <p className="muted pad">{t('app.proj.noDocuments')}</p>}
        </Card>
      </section>

      {docs.data && <Questions projectId={p.id} docs={docs.data} />}

      <section className="sect">
        <h2>{t('app.proj.payments')}</h2>
        {pays.data && docs.data ? <Payments p={p} pays={pays.data} docs={docs.data} /> : <Card><Skeleton height={48} /></Card>}
      </section>

      <section className="sect">
        <h2>{t('app.proj.files')}</h2>
        <Files userId={user.id} projectId={p.id} />
      </section>

      <section className="sect">
        <h2>{t('app.dash.activity')}</h2>
        <Card className="card-flush">
          {acts.isPending ? <div className="pad"><Skeleton height={48} /></div>
            : acts.isError ? <p className="text-danger pad" role="alert">{(acts.error as Error).message}</p>
            : acts.data.length ? <ul className="feed">{acts.data.map((a) => <li key={a.id}><span>{actText(a)}</span><time dateTime={a.created_at}>{date(a.created_at, 'datetime')}</time></li>)}</ul>
            : <p className="muted pad">{t('app.dash.noActivity')}</p>}
        </Card>
      </section>

      <section className="sect">
        <Button variant="ghost" size="sm" icon="trash" onClick={() => setDeleting(true)}>{t('app.proj.delete')}</Button>
      </section>
      <Confirm open={deleting} onClose={() => setDeleting(false)} title={t('app.proj.deleteTitle', { title: p.title })} body={t('app.proj.deleteBody')} action={t('app.proj.delete')}
        onConfirm={async () => {
          await deleteProject(user.id, p.id);
          qc.removeQueries({ queryKey: ['project', p.id] });
          // Its documents, payments and activity went with it; the dashboard must not link to them.
          for (const k of [keys.projects, keys.documents, keys.payments, ['activity']]) void qc.invalidateQueries({ queryKey: k });
          toast({ title: t('app.proj.deleted'), tone: 'success' });
          navigate('/app/projects', { replace: true });
        }} />
    </div>
  );
}

function DocRow({ d, onCopy }: { d: Doc; onCopy: () => void }) {
  const { t } = useTranslation();
  const { money, date } = usePrefs();
  return (
    <tr>
      <td><b>{d.title}</b><div className="muted small">{t(`app.kind.${d.kind}`, { defaultValue: d.kind })} · {t('app.proj.revision', { n: d.revision })} · {date(d.created_at)}</div></td>
      <td><DocStatus status={d.status} />{d.signer_name && <div className="muted small">{d.signer_name}{d.signed_at ? `, ${date(d.signed_at)}` : ''}</div>}</td>
      <td className="num hide-sm">{d.total != null ? money(Number(d.total), d.currency ?? undefined) : ''}</td>
      <td className="num">
        <div className="row row-end">
          {d.token && <Button variant="ghost" size="sm" icon="copy" onClick={onCopy}>{t('app.proj.copyLink')}</Button>}
          {d.receipt_token && <a className="ss-btn ss-btn--ghost ss-btn--sm" href={`/receipt#${d.receipt_token}`} target="_blank" rel="noopener"><span className="ss-btn-label"><Icon name="receipt" size={18} />{t('app.proj.receipt')}</span></a>}
        </div>
      </td>
    </tr>
  );
}

/** Questions clients asked on this project's links. Shown only when there are some. */
function Questions({ projectId, docs }: { projectId: string; docs: Doc[] }) {
  const { t } = useTranslation();
  const ids = docs.map((d) => d.id);
  const qs = useQuery({ queryKey: [...projectKeys.questions(projectId), ids.join()], queryFn: () => listQuestions(ids), enabled: ids.length > 0 });
  if (qs.isError) return <section className="sect"><h2>{t('app.q.title')}</h2><p className="text-danger" role="alert">{(qs.error as Error).message}</p></section>;
  if (!qs.data?.length) return null;
  const title = (q: Question) => docs.find((d) => d.id === q.document_id)?.title ?? '';
  const open = qs.data.filter((q) => !q.answer).length;
  return (
    <section className="sect">
      <h2>{t('app.q.title')}{open > 0 && <span className="muted small"> · {t('app.q.open', { count: open })}</span>}</h2>
      <Card className="card-flush">
        <ul className="feed q-list">{qs.data.map((q) => <QuestionRow key={q.id} q={q} title={title(q)} projectId={projectId} />)}</ul>
      </Card>
      <p className="muted small">{t('app.q.hint')}</p>
    </section>
  );
}

function QuestionRow({ q, title, projectId }: { q: Question; title: string; projectId: string }) {
  const { t } = useTranslation();
  const { date } = usePrefs();
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(!q.answer);
  const [text, setText] = useState(q.answer ?? '');
  const save = useMutation({
    mutationFn: () => answerQuestion(q.id, text),
    onSuccess: () => { setEditing(false); void qc.invalidateQueries({ queryKey: projectKeys.questions(projectId) }); toast({ title: t('app.q.saved'), tone: 'success' }); },
    onError: (e) => toast({ title: errText(e), tone: 'danger' }),
  });
  return (
    <li className="stack">
      <div>
        <div className="muted small">{title} · {t('app.q.line', { text: q.item_text })}</div>
        <p className="q-text"><b>{q.asker_name || t('app.q.client')}:</b> {q.question}</p>
        <time className="muted small" dateTime={q.created_at}>{date(q.created_at, 'datetime')}</time>
      </div>
      {editing ? (
        <form className="stack" onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }}>
          <Field label={t('app.q.answer')}><Textarea rows={2} maxLength={1200} value={text} onChange={(e) => setText(e.target.value)} /></Field>
          <div><Button type="submit" size="sm" loading={save.isPending} disabled={!text.trim()}>{t('app.q.send')}</Button></div>
        </form>
      ) : (
        <div className="row"><p className="pre q-text">{q.answer}</p><Button variant="ghost" size="sm" onClick={() => setEditing(true)}>{t('app.q.edit')}</Button></div>
      )}
    </li>
  );
}

function Payments({ p, pays, docs }: { p: Project; pays: Payment[]; docs: Doc[] }) {
  const { t } = useTranslation();
  const { money, date, locale } = usePrefs();
  const qc = useQueryClient();
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const [paying, setPaying] = useState<Payment | null>(null);
  const [form, setForm] = useState({ label: '', amount: '', currency: p.currency, due: '' });
  const [reference, setReference] = useState('');
  const signedTotal = docs.find((d) => d.status === 'signed' && d.total != null);
  const open = pays.filter((x) => x.status === 'requested');
  const paid = pays.filter((x) => x.status.startsWith('paid'));
  const sums = (rows: Payment[]) => sumByCurrency(rows).map((s) => money(s.amount, s.currency)).join(' · ') || '—';
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: projectKeys.payments(p.id) });
    void qc.invalidateQueries({ queryKey: projectKeys.activity(p.id) });
    void qc.invalidateQueries({ queryKey: keys.payments });
    void qc.invalidateQueries({ queryKey: ['activity'] });
  };
  const ask = useMutation({
    mutationFn: () => {
      const amount = Number(form.amount);
      return requestPayment(p.id, { label: form.label.trim().slice(0, 120), amount, currency: form.currency, due_date: form.due || null, document_id: signedTotal?.id ?? null }, money(amount, form.currency));
    },
    onSuccess: () => { refresh(); setAsking(false); setForm({ label: '', amount: '', currency: p.currency, due: '' }); toast({ title: t('app.pay.requested_toast'), tone: 'success' }); },
    onError: (e) => toast({ title: errText(e), tone: 'danger' }),
  });
  const mark = useMutation({
    mutationFn: (x: Payment) => markPaid(x, reference.trim(), money(Number(x.amount), x.currency)),
    onSuccess: () => { refresh(); setPaying(null); setReference(''); toast({ title: t('app.pay.paid_toast'), tone: 'success' }); },
    onError: (e) => toast({ title: errText(e), tone: 'danger' }),
  });

  return (
    <>
      <p className="muted small">
        {t('app.pay.summary', { open: sums(open), paid: sums(paid) })}
        {signedTotal && ` · ${t('app.pay.signedTotal', { amount: money(Number(signedTotal.total), signedTotal.currency ?? undefined) })}`}
      </p>
      <Card className="card-flush">
        {pays.length ? (
          <table className="tbl tbl-stack"><tbody>
            {pays.map((x) => (
              <tr key={x.id}>
                <td><b>{x.label}</b>{x.due_date && <div className="muted small">{t('app.pay.due', { date: date(x.due_date) })}{x.status === 'requested' && x.due_date < today(locale.timeZone) && <> · <span className="text-danger">{t('app.pay.overdue')}</span></>}</div>}</td>
                <td className="num">{money(Number(x.amount), x.currency)}</td>
                <td><PayStatus status={x.status} />{x.reference && <div className="muted small">{x.reference}</div>}</td>
                <td className="num">{x.status === 'requested' && <Button variant="ghost" size="sm" icon="check" onClick={() => setPaying(x)}>{t('app.pay.markPaid')}</Button>}</td>
              </tr>
            ))}
          </tbody></table>
        ) : <p className="muted pad">{t('app.pay.none')}</p>}
      </Card>
      <div className="row">
        <Button variant="secondary" size="sm" icon="pay" onClick={() => setAsking(true)}>{t('app.pay.request')}</Button>
        <span className="muted small">{t('app.pay.never')}</span>
      </div>

      <Dialog open={asking} onClose={() => setAsking(false)} title={t('app.pay.request')}
        footer={<><Button variant="ghost" onClick={() => setAsking(false)}>{t('actions.cancel')}</Button><Button type="submit" form="pay-request" loading={ask.isPending}>{t('app.pay.add')}</Button></>}>
        <form id="pay-request" className="stack" onSubmit={(e: FormEvent) => { e.preventDefault(); ask.mutate(); }}>
          <Field label={t('app.pay.label')}><Input required maxLength={120} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={t('app.pay.labelPh')} autoFocus /></Field>
          <div className="form-grid">
            <Field label={t('app.pay.amount')}><Input required type="number" min={0.01} step="any" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label={t('app.proj.currency')}><Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          </div>
          <Field label={t('app.pay.dueDate')} optional><Input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></Field>
        </form>
      </Dialog>

      <Dialog open={Boolean(paying)} onClose={() => setPaying(null)} title={t('app.pay.markTitle', { label: paying?.label ?? '' })} description={t('app.pay.markBody')}
        footer={<><Button variant="ghost" onClick={() => setPaying(null)}>{t('actions.cancel')}</Button><Button type="submit" form="pay-mark" loading={mark.isPending}>{t('app.pay.markPaid')}</Button></>}>
        <form id="pay-mark" onSubmit={(e: FormEvent) => { e.preventDefault(); if (paying) mark.mutate(paying); }}>
          <Field label={t('app.pay.reference')} optional><Input maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="KBank 7781" autoFocus /></Field>
        </form>
      </Dialog>
    </>
  );
}

function Files({ userId, projectId }: { userId: string; projectId: string }) {
  const { t } = useTranslation();
  const { date } = usePrefs();
  const qc = useQueryClient();
  const toast = useToast();
  const copy = useCopy();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<VaultFile | null>(null);
  const files = useQuery({ queryKey: projectKeys.files(projectId), queryFn: () => listFiles(userId, projectId) });
  const refresh = () => qc.invalidateQueries({ queryKey: projectKeys.files(projectId) });

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = [...(e.target.files ?? [])];
    e.target.value = '';
    if (!picked.length) return;
    setUploading(true);
    let done = 0;
    for (const file of picked) {
      if (file.size > MAX_FILE) { toast({ title: t('app.files.tooBig', { name: file.name }), tone: 'danger' }); continue; }
      if (blockedFile(file.name, file.type)) { toast({ title: t('app.files.blocked', { name: file.name }), tone: 'danger' }); continue; }
      try { await uploadFile(userId, projectId, file); done++; } catch (err) { toast({ title: `${file.name}: ${errText(err)}`, tone: 'danger' }); }
    }
    setUploading(false);
    if (done) toast({ title: t('app.files.uploaded', { count: done }), tone: 'success' });
    await refresh();
  };
  const open = async (f: VaultFile) => {
    // Open the tab first (in the click), then point it at the signed URL, so pop-up blockers allow it.
    const tab = window.open('', '_blank');
    try { const url = await fileUrl(f.path, 60); if (tab) { tab.opener = null; tab.location.href = url; } else window.location.assign(url); }
    catch (e) { tab?.close(); toast({ title: errText(e), tone: 'danger' }); }
  };
  const share = async (f: VaultFile) => {
    try { await copy(await fileUrl(f.path, 7 * 86400, true), t('app.files.shareCopied')); } catch (e) { toast({ title: errText(e), tone: 'danger' }); }
  };

  return (
    <>
      <div className="row">
        <input ref={input} id="vault-file" type="file" multiple className="visually-hidden" onChange={onPick} tabIndex={-1} aria-hidden="true" />
        <Button variant="secondary" size="sm" icon="upload" loading={uploading} onClick={() => input.current?.click()}>{t('app.files.upload')}</Button>
        <span className="muted small">{t('app.files.hint')}</span>
      </div>
      <Card className="card-flush">
        {files.isError ? <p className="text-danger pad">{(files.error as Error).message}</p>
          : !files.data ? <Skeleton height={48} />
          : files.data.length ? (
            <table className="tbl tbl-stack"><tbody>
              {files.data.map((f) => (
                <tr key={f.path}>
                  <td><b className="break">{f.shown}</b><div className="muted small">{fmtSize(f.size)} · {date(f.created_at)}</div></td>
                  <td className="num">
                    <div className="row row-end">
                      <Button variant="ghost" size="sm" icon="external" onClick={() => open(f)}>{t('actions.open')}</Button>
                      <Button variant="ghost" size="sm" icon="link" onClick={() => share(f)}>{t('app.files.share')}</Button>
                      <Button variant="ghost" size="sm" icon="trash" onClick={() => setRemoving(f)} aria-label={t('app.files.deleteNamed', { name: f.shown })}>{t('app.files.delete')}</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody></table>
          ) : <EmptyState art="inbox" title={t('app.files.none')} body={t('app.files.noneBody')} />}
      </Card>
      <Confirm open={Boolean(removing)} onClose={() => setRemoving(null)} title={t('app.files.deleteNamed', { name: removing?.shown ?? '' })} body={t('app.files.deleteBody')} action={t('app.files.delete')}
        onConfirm={async () => { if (removing) { await removeFile(removing.path); await refresh(); } }} />
    </>
  );
}
