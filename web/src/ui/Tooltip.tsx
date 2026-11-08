// Short hint on hover or keyboard focus. Never put essential information only in a tooltip.
import { cloneElement, useId, useRef, useState, type ReactElement } from 'react';

export function Tooltip({ text, children }: { text: string; children: ReactElement<Record<string, unknown>> }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 300); };
  const hide = () => { clearTimeout(timer.current); setOpen(false); };
  return (
    <span className="ss-tooltip-wrap" onMouseEnter={show} onMouseLeave={hide} onFocus={() => setOpen(true)} onBlur={hide}
      onKeyDown={(e) => { if (e.key === 'Escape') hide(); }}>
      {cloneElement(children, { 'aria-describedby': id })}
      <span role="tooltip" id={id} className={'ss-tooltip' + (open ? ' is-open' : '')}>{text}</span>
    </span>
  );
}
