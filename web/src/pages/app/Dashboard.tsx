// Workspace home: what needs attention (overdue payments, unsigned links), totals per currency,
// recent projects and activity. All lists come from cached queries shared with other pages.
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { usePrefs } from '../../app/preferences';
import { keys, listActivity, listClients, listDocuments, listPayments, listProjects, sumByCurrency, type Activity, type Project } from '../../lib/db';
import { Badge, ButtonLink, Card, EmptyState, Icon, Skeleton } from '../../ui';
import { useApp } from './context';
import { GettingStarted } from './GettingStarted';

const STATUS_TONE: Record<string, 'neutral' | 'brand' | 'success' | 'warning'> = { lead: 'neutral', estimating: 'neutral', proposal_sent: 'brand', approved: 'success', in_progress: 'warning', completed: 'success', cancelled: 'neutral' };
import { dayIn, today } from './shared';

export function ProjectStatus({ status }: { status: Project['status'] }) {
  const { t } = useTranslation();
  return <Badge tone={STATUS_TONE[status]}>{t(`app.status.${status}`)}</Badge>;
}

export function useActivityText() {
  const { t } = useTranslation();
  return (a: Activity) => {
    const d = a.detail || {};
    if (a.kind === 'document_signed') return t(d.outcome === 'approved' ? 'app.act.signed_ok' : 'app.act.signed_changes', { signer: d.signer || 'Client', title: d.title || '' });
    if (a.kind === 'status_changed') return t('app.act.status_changed', { from: t(`app.status.${d.from}`, { defaultValue: String(d.from) }), to: t(`app.status.${d.to}`, { defaultValue: String(d.to) }) });
    const key = `app.act.${a.kind}`;
    return t(key, { defaultValue: a.kind, title: d.title ?? '', name: d.name ?? '', range: d.range ?? '', revision: d.revision ?? 1, label: d.label ?? '', amount: d.amount ?? '', question: d.question ?? '' });
  };
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { profile, user } = useApp();
  const { money, date, locale } = usePrefs();
  const projects = useQuery({ queryKey: keys.projects, queryFn: listProjects });
  const docs = useQuery({ queryKey: keys.documents, queryFn: listDocuments });
  const pays = useQuery({ queryKey: keys.payments, queryFn: listPayments });
  const acts = useQuery({ queryKey: keys.activity(12), queryFn: () => listActivity(12) });
  const clients = useQuery({ queryKey: keys.clients, queryFn: listClients });
  const actText = useActivityText();
  const sums = (rows: { currency: string; amount: number }[]) => { const s = sumByCurrency(rows); return s.length ? s.map((x) => money(x.amount, x.currency)).join(' · ') : '—'; };

  const first = profile?.name?.split(' ')[0];
  const head = (
    <div className="page-head">
      <div>
        <h1>{first ? t('app.dash.hi', { name: first }) : t('app.dash.hiPlain')}</h1>
        <p className="muted">{t('app.dash.lede')}</p>
      </div>
      <div className="row">
        <ButtonLink to="/estimate" variant="secondary" icon="spark">{t('app.nav.estimate')}</ButtonLink>
        <ButtonLink to="/app/projects?new=1" icon="plus">{t('app.dash.newProject')}</ButtonLink>
      </div>
    </div>
  );

  const failed = [projects, docs, pays, acts, clients].find((q) => q.isError);
  if (failed) return <>{head}<EmptyState art="inbox" title={t('app.dash.error')} body={(failed.error as Error).message} /></>;
  if (!projects.data || !docs.data || !pays.data || !acts.data || !clients.data) {
    return (
      <>{head}
        <div className="kpis" aria-busy="true">{[0, 1, 2, 3].map((i) => <Card key={i}><Skeleton width="60%" /><Skeleton height={28} width="40%" /></Card>)}</div>
        <div className="cols"><Card><Skeleton height={200} /></Card><Card><Skeleton height={200} /></Card></div>
      </>
    );
  }

  const byId = Object.fromEntries(projects.data.map((p) => [p.id, p]));
  const clientName = Object.fromEntries(clients.data.map((c) => [c.id, c.name]));
  const active = projects.data.filter((p) => !['completed', 'cancelled'].includes(p.status));
  const waiting = docs.data.filter((d) => d.status === 'sent' || d.status === 'viewed');
  const open = pays.data.filter((p) => p.status === 'requested');
  // Dates in the user's own time zone: due dates are calendar days, paid_at is a timestamp.
  const now = today(locale.timeZone);
  const overdue = open.filter((p) => p.due_date && p.due_date < now);
  const paidMonth = pays.data.filter((p) => p.status.startsWith('paid') && p.paid_at && dayIn(locale.timeZone, p.paid_at).slice(0, 7) === now.slice(0, 7));
  const todo = [
    ...overdue.map((p) => ({ id: 'p' + p.id, icon: 'alert' as const, tone: 'danger', text: t('app.dash.overdueItem', { label: p.label, amount: money(Number(p.amount), p.currency) }), project: p.project_id })),
    ...waiting.map((d) => ({ id: 'd' + d.id, icon: d.status === 'viewed' ? 'eye' as const : 'clock' as const, tone: 'wait', text: t(d.status === 'viewed' ? 'app.dash.openedItem' : 'app.dash.waitingItem', { title: d.title }), project: d.project_id })),
  ].slice(0, 8);

  return (
    <>
      {head}
      <GettingStarted userId={user.id} profile={profile} projects={projects.data} docs={docs.data} />
      <div className="kpis">
        <Card className="kpi"><small>{t('app.dash.active')}</small><b>{active.length}</b></Card>
        <Card className="kpi"><small>{t('app.dash.waiting')}</small><b>{waiting.length}</b></Card>
        <Card className="kpi"><small>{t('app.dash.outstanding')}</small><b>{sums(open)}</b>{overdue.length > 0 && <Badge tone="danger">{t('app.dash.overdue', { count: overdue.length })}</Badge>}</Card>
        <Card className="kpi"><small>{t('app.dash.paidMonth')}</small><b>{sums(paidMonth)}</b></Card>
      </div>
      <div className="cols">
        <section>
          <h2>{t('app.dash.attention')}</h2>
          <Card className="card-flush">
            {todo.length ? (
              <ul className="feed feed--icons">{todo.map((x) => (
                <li key={x.id} className={`is-${x.tone}`}>
                  <span className="feed-icon" aria-hidden="true"><Icon name={x.icon} size={18} /></span>
                  {x.project ? <Link to={`/app/projects/${x.project}`}>{x.text}</Link> : <span>{x.text}</span>}
                  <small>{x.project && byId[x.project]?.title}</small>
                </li>
              ))}</ul>
            ) : <p className="muted" style={{ padding: '12px 0' }}>{t('app.dash.allClear')}</p>}
          </Card>
          <h2>{t('app.dash.recent')}</h2>
          {projects.data.length ? (
            <Card className="card-flush">
              <table className="tbl">
                <thead><tr><th scope="col">{t('app.dash.project')}</th><th scope="col" className="hide-sm">{t('app.dash.client')}</th><th scope="col">{t('app.dash.statusCol')}</th><th scope="col" className="hide-sm">{t('app.dash.updated')}</th></tr></thead>
                <tbody>
                  {projects.data.slice(0, 6).map((p) => (
                    <tr key={p.id}>
                      <td><Link to={`/app/projects/${p.id}`}>{p.title}</Link></td>
                      <td className="hide-sm">{(p.client_id && clientName[p.client_id]) || '—'}</td>
                      <td><ProjectStatus status={p.status} /></td>
                      <td className="hide-sm muted">{date(p.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            <Card><EmptyState art="projects" title={t('app.dash.noProjects')} body={t('app.dash.noProjectsBody')} action={<ButtonLink to="/estimate" icon="spark">{t('app.dash.estimateBrief')}</ButtonLink>} /></Card>
          )}
        </section>
        <section>
          <h2>{t('app.dash.activity')}</h2>
          <Card className="card-flush">
            {acts.data.length ? (
              <ul className="feed">{acts.data.map((a) => <li key={a.id}><span>{actText(a)}</span><time dateTime={a.created_at}>{date(a.created_at)}{a.project_id && byId[a.project_id] ? ` · ${byId[a.project_id].title}` : ''}</time></li>)}</ul>
            ) : <p className="muted" style={{ padding: '12px 0' }}>{t('app.dash.noActivity')}</p>}
          </Card>
        </section>
      </div>
    </>
  );
}
