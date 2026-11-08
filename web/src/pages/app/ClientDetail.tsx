// One client: their details (editable), their projects, and delete. Projects stay when a
// client is deleted; they just lose the client.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { usePrefs } from '../../app/preferences';
import { clientKeys, deleteClient, getClient, keys, listProjects } from '../../lib/db';
import { Button, ButtonLink, Card, EmptyState, Icon, Skeleton, useToast } from '../../ui';
import { ProjectStatus } from './Dashboard';
import { ClientForm, Confirm, NewProjectDialog } from './shared';

export default function ClientDetail() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { date } = usePrefs();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);
  const client = useQuery({ queryKey: clientKeys.one(id), queryFn: () => getClient(id) });
  const projects = useQuery({ queryKey: keys.projects, queryFn: listProjects });

  if (client.isError) return <EmptyState art="inbox" title={t('app.dash.error')} body={(client.error as Error).message} />;
  if (client.isPending) return <div className="stack" aria-busy="true"><Skeleton height={36} width="40%" /><Card><Skeleton height={160} /></Card></div>;
  const c = client.data;
  if (!c) return <EmptyState art="clients" title={t('app.cli.notFound')} action={<ButtonLink to="/app/clients" variant="secondary">{t('app.cli.all')}</ButtonLink>} />;
  const mine = (projects.data ?? []).filter((p) => p.client_id === c.id);

  return (
    <div className="detail">
      <Link to="/app/clients" className="back-link"><Icon name="arrow" size={16} />{t('app.nav.clients')}</Link>
      <div className="page-head"><h1>{c.name}</h1></div>
      <Card>
        <ClientForm key={c.id + c.name} client={c} formId="client-edit" onSaved={() => undefined}
          footer={(busy) => <div><Button type="submit" loading={busy}>{t('actions.save')}</Button></div>} />
      </Card>

      <section className="sect">
        <div className="sect-head">
          <h2>{t('app.nav.projects')}</h2>
          <Button size="sm" variant="secondary" icon="plus" onClick={() => setAdding(true)}>{t('app.dash.newProject')}</Button>
        </div>
        <Card className="card-flush">
          {!projects.data ? <Skeleton height={48} /> : mine.length ? (
            <table className="tbl tbl-stack"><tbody>
              {mine.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/app/projects/${p.id}`}>{p.title}</Link></td>
                  <td><ProjectStatus status={p.status} /></td>
                  <td className="muted hide-sm">{date(p.updated_at)}</td>
                </tr>
              ))}
            </tbody></table>
          ) : <p className="muted pad">{t('app.cli.noProjects')}</p>}
        </Card>
      </section>

      <section className="sect">
        <Button variant="ghost" size="sm" icon="trash" onClick={() => setDeleting(true)}>{t('app.cli.delete')}</Button>
      </section>
      {adding && <NewProjectDialog open clientId={c.id} onClose={() => setAdding(false)} />}
      <Confirm open={deleting} onClose={() => setDeleting(false)} title={t('app.cli.deleteTitle', { name: c.name })} body={t('app.cli.deleteBody')} action={t('app.cli.delete')}
        onConfirm={async () => {
          await deleteClient(c.id);
          qc.removeQueries({ queryKey: clientKeys.one(c.id) });
          void qc.invalidateQueries({ queryKey: keys.clients });
          void qc.invalidateQueries({ queryKey: keys.projects });
          toast({ title: t('app.cli.deleted'), tone: 'success' });
          navigate('/app/clients', { replace: true });
        }} />
    </div>
  );
}
