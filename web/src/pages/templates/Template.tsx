// /templates/<slug>: one scope template with its lines, and a button that copies them into /new.
import { useLocation } from 'react-router';
import { AppLink } from '../../app/AppLink';
import { saveDraft } from '../../lib/draft';
import { Button, Card, Icon, PageHero } from '../../ui';
import NotFound from '../NotFound';
import { templateBySlug, TEMPLATES } from './data';
import './templates.css';

const usd = (n: number) => '$' + n.toLocaleString('en-US');
const GROUPS = [['scope', 'What you deliver'], ['uat', 'Tests to pass before sign-off'], ['out', 'Not included']] as const;

export default function Template() {
  const { pathname } = useLocation();
  const tp = templateBySlug(pathname.split('/')[2] ?? '');
  if (!tp) return <NotFound />;
  const total = tp.items.reduce((s, i) => s + (i.kind !== 'out' ? i.price ?? 0 : 0), 0);
  const use = () => {
    saveDraft({ title: tp.name, currency: 'USD', notes: '', items: tp.items, source: 'template' });
    window.location.href = '/new'; // full load, like the estimator: /new reads the draft once on mount
  };
  return (
    <div lang="en">
      <PageHero title={tp.title} lede={tp.description} />
      <div className="container tpl-doc page-lift">
        <Card className="tpl-sheet">
          <p className="tpl-intro">{tp.intro}</p>
          {GROUPS.map(([kind, label]) => (
            <section key={kind} className={`tpl-group is-${kind}`}>
              <h2>{label}</h2>
              <ul>
                {tp.items.filter((i) => i.kind === kind).map((i) => (
                  <li key={i.text}><span>{i.text}</span>{i.price != null && <b className="mono">{usd(i.price)}</b>}</li>
                ))}
              </ul>
            </section>
          ))}
          <p className="tpl-total"><span>Example total</span><b>{usd(total)}</b></p>
          <p className="muted small">Example prices in USD. Set your own prices and currency in the next step.</p>
          <div className="row">
            <Button size="lg" iconEnd="arrow" onClick={use}>Use this template</Button>
          </div>
        </Card>
        <aside className="tpl-side">
          <Card className="stack">
            <h2 className="tpl-side-h">How it works</h2>
            <ol className="tpl-steps">
              <li>Edit the lines and prices.</li>
              <li>Send one link. Your client approves each line and signs on any phone, with no account.</li>
              <li>When they ask for more, send a priced change they approve in one tap.</li>
            </ol>
          </Card>
          <Card className="stack">
            <h2 className="tpl-side-h">More templates</h2>
            <ul className="tpl-more">
              {TEMPLATES.filter((x) => x.slug !== tp.slug).map((x) => <li key={x.slug}><AppLink to={`/templates/${x.slug}`}>{x.name}</AppLink></li>)}
            </ul>
            <AppLink to="/compare" className="tpl-cmp"><Icon name="scale" size={16} />SignedScope vs a PDF quote</AppLink>
          </Card>
        </aside>
      </div>
    </div>
  );
}
