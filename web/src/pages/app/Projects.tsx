// All projects with a status filter. "?new=1" (from the dashboard and old links) opens the
// new-project dialog.
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { usePrefs } from '../../app/preferences';
import { keys, listClients, listProjects, type ProjectStatus as Status } from '../../lib/db';
import { Button, Card, EmptyState, Select, Skeleton } from '../../ui';
import { ProjectStatus } from './Dashboard';
import { NewProjectDialog } from './shared';

export const STATUSES: Status[] = ['lead', 'estimating', 'proposal_sent', 'approved', 'in_progress', 'completed', 'cancelled'];

export default function Projects() {
  const { t } = useTranslation();
  const { date } = usePrefs();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState('');
  const projects = useQuery({ queryKey: keys.projects, queryFn: listProjects });
  const clients = useQuery({ queryKey: keys.clients, queryFn: listClients });
  const open = params.get('new') === '1';
  const setOpen = (v: boolean) => setParams((p) => { if (v) p.set('new', '1'); else p.delete('new'); return p; }, { replace: true });

  const clientName = Object.fromEntries((clients.data ?? []).map((c) => [c.id, c.name]));
  const rows = (projects.data ?? []).filter((p) => !filter || p.status === filter);

  return (
    <>
      <div className="page-head">
        <h1>{t('app.nav.projects')}</h1>
        <div className="row">
          <Select aria-label={t('app.proj.filter')} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">{t('app.proj.allStatuses')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`app.status.${s}`)}</option>)}
          </Select>
          <Button icon="plus" onClick={() => setOpen(true)}>{t('app.dash.newProject')}</Button>
        </div>
      </div>
      {projects.isError ? <EmptyState art="inbox" title={t('app.dash.error')} body={(projects.error as Error).message} />
        : !projects.data ? <Card aria-busy="true"><Skeleton height={24} /><Skeleton height={24} /><Skeleton height={24} /></Card>
        : rows.length ? (
          <Card className="card-flush">
            <table className="tbl">
              <thead><tr><th scope="col">{t('app.dash.project')}</th><th scope="col" className="hide-sm">{t('app.dash.client')}</th><th scope="col">{t('app.dash.statusCol')}</th><th scope="col" className="hide-sm">{t('app.dash.updated')}</th></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td><Link to={`/app/projects/${p.id}`}>{p.title}</Link></td>
                    <td className="hide-sm">{p.client_id && clientName[p.client_id] ? <Link to={`/app/clients/${p.client_id}`}>{clientName[p.client_id]}</Link> : '—'}</td>
                    <td><ProjectStatus status={p.status} /></td>
                    <td className="hide-sm muted">{date(p.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : projects.data.length ? <p className="muted">{t('app.proj.noneFiltered')}</p>
        : <Card><EmptyState art="projects" title={t('app.dash.noProjects')} body={t('app.dash.noProjectsBody')} action={<Button icon="plus" onClick={() => setOpen(true)}>{t('app.dash.newProject')}</Button>} /></Card>}
      {open && <NewProjectDialog open onClose={() => setOpen(false)} />}
    </>
  );
}
