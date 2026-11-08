// Line icons from the brand sprite (public/brand/icons.svg). Decorative by default;
// pass a label when the icon is the only content of a control.
export const ICONS = ['brief', 'split', 'clock', 'coin', 'doc', 'link', 'sign', 'pay', 'change', 'vault', 'lock', 'shield', 'globe', 'scale', 'hand', 'check', 'play', 'spark', 'arrow', 'menu',
  'home', 'folder', 'user', 'users', 'receipt', 'bell', 'settings', 'search', 'plus', 'x', 'chevron', 'more', 'upload', 'download', 'chart', 'calendar', 'message', 'mail', 'eye', 'copy',
  'external', 'trash', 'filter', 'logout', 'sun', 'moon', 'info', 'alert', 'question', 'template'] as const;
export type IconName = (typeof ICONS)[number];

export function Icon({ name, size = 20, label, className }: { name: IconName; size?: number; label?: string; className?: string }) {
  return (
    <svg className={'ss-icon' + (className ? ' ' + className : '')} width={size} height={size} viewBox="0 0 24 24"
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      <use href={`/brand/icons.svg#${name}`} />
    </svg>
  );
}
