// Living design system: every component with its states, used for visual QA and e2e tests.
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefs } from '../app/preferences';
import { CURRENCIES, type Currency } from '../lib/locale';
import { Badge, Button, Card, Dialog, EmptyState, Field, Icon, ICONS, IconButton, Input, Menu, Select, Skeleton, Tabs, Textarea, Tooltip, useToast } from '../ui';
import './kit.css';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="kit-section"><h2>{title}</h2>{children}</section>;
}

export default function Kit() {
  const { t } = useTranslation();
  const toast = useToast();
  const { locale, setLocale, money, date, relative, number } = usePrefs();
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('scope');
  const [title, setTitle] = useState('');
  const save = () => { setSaving(true); setTimeout(() => { setSaving(false); toast({ title: 'Saved', body: 'Your scope is up to date.', tone: 'success' }); }, 1200); };

  return (
    <div className="container kit">
      <header className="kit-head">
        <h1>{t('kit.title')}</h1>
        <p className="muted">{t('kit.intro')}</p>
      </header>

      <Section title="Buttons">
        <div className="row">
          <Button icon="plus">New scope</Button>
          <Button variant="secondary" icon="copy" onClick={() => toast({ title: t('actions.copied') })}>{t('actions.copy')}</Button>
          <Button variant="ghost">{t('actions.cancel')}</Button>
          <Button variant="danger" icon="trash">Delete</Button>
          <Button loading={saving} onClick={save}>{saving ? t('actions.saving') : t('actions.save')}</Button>
          <Button disabled>Disabled</Button>
          <Tooltip text="More actions"><IconButton icon="more" label="More actions" variant="secondary" /></Tooltip>
        </div>
        <div className="row">
          <Button size="sm">Small</Button><Button size="md">Medium</Button><Button size="lg" iconEnd="arrow">Large</Button>
        </div>
      </Section>

      <Section title="Form fields">
        <div className="kit-grid">
          <Field label="Project title" hint="Your client sees this first.">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Website redesign" />
          </Field>
          <Field label="Client email" error="Enter an email like name@company.com">
            <Input type="email" defaultValue="rafi@" />
          </Field>
          <Field label={t('settings.currency')}>
            <Select value={locale.currency} onChange={(e) => setLocale({ currency: e.target.value as Currency })}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Notes" optional><Textarea placeholder="Anything your client should know" /></Field>
        </div>
      </Section>

      <Section title="Locale formatting">
        <Card className="kit-locale">
          <dl>
            <dt>Money</dt><dd className="mono">{money(48500)} · {money(1350.5)}</dd>
            <dt>Number</dt><dd className="mono">{number(1234567.89)}</dd>
            <dt>Date</dt><dd>{date('2026-11-08T07:32:00Z', 'datetime')}</dd>
            <dt>Relative</dt><dd>{relative(new Date(Date.now() - 2 * 3600_000))}</dd>
            <dt>Time zone</dt><dd>{locale.timeZone}</dd>
          </dl>
        </Card>
      </Section>

      <Section title="Cards and badges">
        <div className="kit-grid">
          <Card interactive tabIndex={0}>
            <div className="row" style={{ justifyContent: 'space-between' }}><strong>Lumen Café website</strong><Badge tone="warning">Needs approval</Badge></div>
            <p className="muted">Rev 2 · {money(3850)}</p>
          </Card>
          <Card>
            <div className="row"><Badge>Draft</Badge><Badge tone="brand">Viewed</Badge><Badge tone="success">Signed</Badge><Badge tone="danger">Declined</Badge></div>
          </Card>
          <Card role="status" aria-busy="true" aria-label={t('states.loading')}>
            <div className="stack"><Skeleton width="60%" height={18} /><Skeleton /><Skeleton width="40%" /></div>
          </Card>
        </div>
      </Section>

      <Section title="Overlays">
        <div className="row">
          <Button variant="secondary" onClick={() => setDialog(true)}>Open dialog</Button>
          <Button variant="secondary" onClick={() => setSheet(true)}>Open sheet</Button>
          <Menu trigger={(p) => <Button {...p} variant="secondary" iconEnd="chevron">Actions</Button>}
            items={[{ label: 'Copy link', icon: 'link', onSelect: () => toast({ title: 'Link copied' }) }, { label: 'Duplicate', icon: 'copy', onSelect: () => {} }, { label: 'Delete', icon: 'trash', danger: true, onSelect: () => toast({ title: 'Could not delete', body: 'Signed scopes are kept for your records.', tone: 'danger' }) }]} />
        </div>
        <Dialog open={dialog} onClose={() => setDialog(false)} title="Send this scope?" description="Rafi will get a link to review and sign. You can still send a change request later."
          footer={<><Button variant="ghost" onClick={() => setDialog(false)}>{t('actions.cancel')}</Button><Button icon="mail" data-autofocus onClick={() => { setDialog(false); toast({ title: 'Sent to Rafi', tone: 'success' }); }}>Send</Button></>} />
        <Dialog open={sheet} variant="sheet" onClose={() => setSheet(false)} title="Add a line"
          footer={<Button block onClick={() => setSheet(false)}>Add line</Button>}>
          <div className="stack">
            <Field label="Item"><Input placeholder="Booking page" /></Field>
            <Field label="Price"><Input inputMode="decimal" placeholder="950" /></Field>
          </div>
        </Dialog>
      </Section>

      <Section title="Tabs">
        <Tabs label="Scope sections" value={tab} onChange={setTab} items={[
          { id: 'scope', label: 'In scope', content: <p>Home and menu pages, online ordering, two rounds of edits.</p> },
          { id: 'tests', label: 'Tests to pass', content: <p>Orders reach the kitchen printer within 10 seconds.</p> },
          { id: 'out', label: 'Not included', content: <p>Printed menu, photography.</p> },
        ]} />
      </Section>

      <Section title="Empty states">
        <div className="kit-grid">
          <Card><EmptyState art="projects" title="No projects yet" body="Start with a brief and get priced lines in a minute." action={<Button icon="plus">New project</Button>} /></Card>
          <Card><EmptyState art="clients" title="No clients yet" body="Clients appear here after you send their first scope." /></Card>
          <Card><EmptyState art="inbox" title="All caught up" body="We'll tell you when a client opens or signs." /></Card>
        </div>
      </Section>

      <Section title={`Icons (${ICONS.length})`}>
        <ul className="kit-icons">{ICONS.map((n) => <li key={n}><Icon name={n} size={24} /><span>{n}</span></li>)}</ul>
      </Section>
    </div>
  );
}
