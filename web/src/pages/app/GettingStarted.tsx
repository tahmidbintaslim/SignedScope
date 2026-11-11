// "Get your first scope signed": a dashboard checklist that ticks itself off from real data
// (profile, projects, documents). Shown until every step is done or the person hides it.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Doc, Profile, Project } from '../../lib/db';
import { Button, ButtonLink, Card, Icon } from '../../ui';

const hiddenKey = (userId: string) => `ss-getting-started-hidden:${userId}`;
const read = (k: string) => { try { return localStorage.getItem(k) === '1'; } catch { return false; } };

export function GettingStarted({ userId, profile, projects, docs }: { userId: string; profile: Profile | null | undefined; projects: Project[]; docs: Doc[] }) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(() => read(hiddenKey(userId)));
  const firstProject = projects[projects.length - 1];
  const steps = [
    { key: 'business', done: Boolean(profile?.business_name), to: '/app/settings' },
    { key: 'pay', done: Boolean(profile?.pay_instructions), to: '/app/settings' },
    { key: 'project', done: projects.length > 0, to: '/app/projects?new=1' },
    { key: 'send', done: docs.length > 0, to: firstProject ? `/app/projects/${firstProject.id}` : '/new' },
    { key: 'signed', done: docs.some((d) => d.status === 'signed'), to: null },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (hidden || doneCount === steps.length) return null;
  const next = steps.find((s) => !s.done)?.key;
  const hide = () => { try { localStorage.setItem(hiddenKey(userId), '1'); } catch { /* blocked: hide for this visit */ } setHidden(true); };

  return (
    <Card className="gs" role="region" aria-labelledby="gs-h">
      <div className="gs-head">
        <div>
          <h2 id="gs-h">{t('app.gs.title')}</h2>
          <p className="muted">{t('app.gs.progress', { done: doneCount, total: steps.length })}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={hide}>{t('app.gs.hide')}</Button>
      </div>
      <div className="gs-bar" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount} aria-label={t('app.gs.progress', { done: doneCount, total: steps.length })}>
        <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="gs-steps">
        {steps.map((s) => (
          <li key={s.key} className={(s.done ? 'is-done' : '') + (s.key === next ? ' is-next' : '')}>
            <span className="gs-check" aria-hidden="true">{s.done ? <Icon name="check" size={16} /> : null}</span>
            <div className="gs-text">
              <b>{t(`app.gs.${s.key}`)}</b>
              {!s.done && <small className="muted">{t(`app.gs.${s.key}Hint`)}</small>}
              <span className="visually-hidden">{s.done ? t('app.gs.done') : t('app.gs.todo')}</span>
            </div>
            {!s.done && s.to && <ButtonLink size="sm" variant={s.key === next ? 'primary' : 'secondary'} to={s.to}>{t(`app.gs.${s.key}Go`)}</ButtonLink>}
          </li>
        ))}
      </ol>
    </Card>
  );
}
