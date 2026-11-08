import type { ComponentProps } from 'react';

/** Surface for grouped content. "interactive" lifts on hover for clickable cards. */
export function Card({ interactive, className, ...rest }: ComponentProps<'div'> & { interactive?: boolean }) {
  return <div {...rest} className={['ss-card', interactive && 'ss-card--interactive', className].filter(Boolean).join(' ')} />;
}

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
export function Badge({ tone = 'neutral', className, ...rest }: ComponentProps<'span'> & { tone?: Tone }) {
  return <span {...rest} className={`ss-badge ss-badge--${tone}` + (className ? ' ' + className : '')} />;
}

export function Skeleton({ width = '100%', height = 16, radius = 8 }: { width?: number | string; height?: number | string; radius?: number }) {
  return <span className="ss-skeleton" style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}
