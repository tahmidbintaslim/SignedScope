// /templates: free scope of work templates. English only (see data.ts).
import { AppLink } from '../../app/AppLink';
import { Card, Icon, PageHero } from '../../ui';
import { TEMPLATES } from './data';
import './templates.css';

export default function Templates() {
  return (
    <div lang="en">
      <PageHero title="Scope of work templates" lede="Start from a real scope: what you deliver, the tests your client signs off on, and what is not included. Edit every line, then send one link." />
      <div className="container tpl-grid page-lift">
        {TEMPLATES.map((tp) => {
          const lines = tp.items.filter((i) => i.kind !== 'out').length;
          return (
            <AppLink key={tp.slug} to={`/templates/${tp.slug}`} className="tpl-card">
              <Card className="tpl-card-in">
                <h2>{tp.name}</h2>
                <p className="muted">{tp.intro}</p>
                <span className="tpl-meta">{lines} lines · {tp.items.length - lines} not included<Icon name="arrow" size={16} /></span>
              </Card>
            </AppLink>
          );
        })}
      </div>
    </div>
  );
}
