// Buttons give feedback on every press: they scale slightly, and while an action runs they show
// a spinner in place without changing width, so the layout never jumps.
import { m } from 'motion/react';
import type { ComponentProps, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { press } from '../motion/tokens';
import { Icon, type IconName } from './Icon';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';
interface Common { variant?: Variant; size?: Size; icon?: IconName; iconEnd?: IconName; block?: boolean; children?: ReactNode }

const cls = (v: Variant, s: Size, block?: boolean, extra?: string) =>
  ['ss-btn', `ss-btn--${v}`, `ss-btn--${s}`, block && 'ss-btn--block', extra].filter(Boolean).join(' ');

function Inner({ icon, iconEnd, children, loading }: Common & { loading?: boolean }) {
  return (
    <>
      <span className="ss-btn-label" style={loading ? { opacity: 0 } : undefined}>
        {icon && <Icon name={icon} size={18} />}
        {children}
        {iconEnd && <Icon name={iconEnd} size={18} />}
      </span>
      {loading && <span className="ss-btn-spinner"><Spinner size={18} /></span>}
    </>
  );
}

export type ButtonProps = Common & Omit<ComponentProps<typeof m.button>, 'children'> & { loading?: boolean };

export function Button({ variant = 'primary', size = 'md', block, icon, iconEnd, loading, disabled, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <m.button
      {...press}
      {...rest}
      type={type}
      className={cls(variant, size, block, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      <Inner icon={icon} iconEnd={iconEnd} loading={loading}>{children}</Inner>
    </m.button>
  );
}

/** A link that looks like a button (navigation, not an action). Press feedback comes from CSS. */
export function ButtonLink({ variant = 'primary', size = 'md', block, icon, iconEnd, className, children, ...rest }: Common & LinkProps) {
  return (
    <Link {...rest} className={cls(variant, size, block, className)}>
      <Inner icon={icon} iconEnd={iconEnd}>{children}</Inner>
    </Link>
  );
}

/** Square button holding only an icon; the label is required for screen readers. */
export function IconButton({ icon, label, variant = 'ghost', size = 'md', className, ...rest }: Omit<ButtonProps, 'children' | 'icon' | 'iconEnd'> & { icon: IconName; label: string }) {
  return (
    <m.button {...press} type="button" {...rest} aria-label={label} title={label} className={cls(variant, size, false, 'ss-btn--icon ' + (className ?? ''))}>
      <Icon name={icon} size={20} />
    </m.button>
  );
}
