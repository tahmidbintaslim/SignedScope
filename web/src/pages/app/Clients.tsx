// Clients with their number of active projects, and an "Add client" dialog.
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { keys, listClients, listProjects } from '../../lib/db';
import { Button, Card, Dialog, EmptyState, Skeleton } from '../../ui';
import { ClientForm } from './shared';

export default function Clients() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const clients = useQuery({ queryKey: keys.clients, queryFn: listClients });
  const projects = useQuery({ queryKey: keys.projects, queryFn: listProjects });
  const active = (cid: string) => (projects.data ?? []).filter((p) => p.client_id === cid && !['completed', 'cancelled'].includes(p.status)).length;

  return (
    <>
      <div className="page-head">
        <h1>{t('app.nav.clients')}</h1>
        <Button icon="plus" onClick={() => setAdding(true)}>{t('app.cli.add')}</Button>
      </div>
      {clients.isError ? <EmptyState art="inbox" title={t('app.dash.error')} body={(clients.error as Error).message} />
        : !clients.data ? <Card aria-busy="true"><Skeleton height={24} /><Skeleton height={24} /></Card>
        : clients.data.length ? (
          <Card className="card-flush">
            <table className="tbl">
              <thead><tr><th scope="col">{t('app.dash.client')}</th><th scope="col" className="hide-sm">{t('app.cli.email')}</th><th scope="col">{t('app.cli.active')}</th></tr></thead>
              <tbody>
                {clients.data.map((c) => (
                  <tr key={c.id}>
                    <td><Link to={`/app/clients/${c.id}`}>{c.name}</Link>{c.company && <div className="muted small">{c.company}</div>}</td>
                    <td className="hide-sm muted">{c.email || '—'}</td>
                    <td>{projects.data ? active(c.id) : '…'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : <Card><EmptyState art="clients" title={t('app.cli.none')} body={t('app.cli.noneBody')} action={<Button icon="plus" onClick={() => setAdding(true)}>{t('app.cli.add')}</Button>} /></Card>}
      <Dialog open={adding} onClose={() => setAdding(false)} title={t('app.cli.add')}
        footer={<><Button variant="ghost" onClick={() => setAdding(false)}>{t('actions.cancel')}</Button><Button type="submit" form="client-new">{t('app.cli.add')}</Button></>}>
        {adding && <ClientForm formId="client-new" onSaved={(c) => { setAdding(false); navigate(`/app/clients/${c.id}`); }} />}
      </Dialog>
    </>
  );
}
