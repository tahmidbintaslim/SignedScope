// Action menu: a button opens a list of commands. Arrow keys move, Enter picks, Escape closes.
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { duration, ease } from '../motion/tokens';
import { Icon, type IconName } from './Icon';

/** `checked` makes the item a radio choice (aria-checked) with a check mark. */
export interface MenuItem { label: string; icon?: IconName; onSelect: () => void; danger?: boolean; checked?: boolean }

export function Menu({ trigger, items, align = 'end' }: { trigger: (p: { 'aria-haspopup': 'menu'; 'aria-expanded': boolean; 'aria-controls': string; onClick: () => void }) => ReactNode; items: MenuItem[]; align?: 'start' | 'end' }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>('[role^=menuitem]')?.focus();
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const close = () => { setOpen(false); wrap.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus(); };
  const onKey = (e: KeyboardEvent) => {
    const els = [...(list.current?.querySelectorAll<HTMLElement>('[role^=menuitem]') ?? [])];
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); els[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); els[els.length - 1]?.focus(); }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); close(); }
  };

  return (
    <div className="ss-menu-wrap" ref={wrap}>
      {trigger({ 'aria-haspopup': 'menu', 'aria-expanded': open, 'aria-controls': id, onClick: () => setOpen((o) => !o) })}
      <AnimatePresence>
        {open && (
          <m.ul ref={list} id={id} role="menu" className={`ss-menu ss-menu--${align}`} onKeyDown={onKey}
            initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, transition: { duration: duration.fast } }}
            transition={{ duration: duration.base, ease: ease.enter }}>
            {items.map((it) => (
              <li key={it.label} role="none">
                <button type="button" role={it.checked === undefined ? 'menuitem' : 'menuitemradio'} aria-checked={it.checked} tabIndex={-1}
                  className={'ss-menu-item' + (it.danger ? ' is-danger' : '')} onClick={() => { it.onSelect(); close(); }}>
                  {it.icon && <Icon name={it.icon} size={18} />}{it.label}
                  {it.checked && <Icon name="check" size={18} className="ss-menu-check" />}
                </button>
              </li>
            ))}
          </m.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
