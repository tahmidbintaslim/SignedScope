import type { ReactNode } from 'react';

type Art = 'projects' | 'clients' | 'inbox';
export function EmptyState({ art, title, body, action }: { art?: Art; title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ss-empty">
      {art && <img src={`/brand/illustrations/empty-${art}.svg`} width={200} height={160} alt="" />}
      <h3>{title}</h3>
      {body && <p className="muted">{body}</p>}
      {action}
    </div>
  );
}
