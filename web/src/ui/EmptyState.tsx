import type { ReactNode } from 'react';

type Art = 'projects' | 'clients' | 'inbox';
/** `compact` is for an empty section inside a page: smaller art and padding, so it doesn't
 *  outweigh the sections that have content. */
export function EmptyState({ art, title, body, action, compact }: { art?: Art; title: ReactNode; body?: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={'ss-empty' + (compact ? ' ss-empty--compact' : '')}>
      {art && <img src={`/brand/illustrations/empty-${art}.svg`} width={compact ? 100 : 200} height={compact ? 80 : 160} alt="" />}
      <h3>{title}</h3>
      {body && <p className="muted">{body}</p>}
      {action}
    </div>
  );
}
