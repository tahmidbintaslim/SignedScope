// Toasts confirm what just happened ("Link copied", "Saved"). They are announced to screen
// readers, hide after 4 seconds, and pause while hovered or focused. Errors stay until closed.
import { AnimatePresence, m } from 'motion/react';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast as toastV } from '../motion/tokens';
import { IconButton } from './Button';
import { Icon, type IconName } from './Icon';

type Tone = 'neutral' | 'success' | 'danger';
export interface ToastInput { title: string; body?: string; tone?: Tone; action?: { label: string; onClick: () => void } }
interface Item extends ToastInput { id: number }

const Ctx = createContext<((t: ToastInput) => void) | null>(null);
const ICON: Record<Tone, IconName> = { neutral: 'info', success: 'check', danger: 'alert' };

function ToastView({ item, onDone }: { item: Item; onDone: (id: number) => void }) {
  const { t } = useTranslation();
  const [paused, setPaused] = useState(false);
  const left = useRef(4000);
  useEffect(() => {
    if (paused || item.tone === 'danger') return;
    const start = Date.now();
    const timer = setTimeout(() => onDone(item.id), left.current);
    return () => { clearTimeout(timer); left.current -= Date.now() - start; };
  }, [paused, item, onDone]);
  const tone = item.tone ?? 'neutral';
  return (
    <m.li className={`ss-toast ss-toast--${tone}`} variants={toastV} initial="initial" animate="enter" exit="exit"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <Icon name={ICON[tone]} size={20} className="ss-toast-icon" />
      <div className="ss-toast-text"><strong>{item.title}</strong>{item.body && <span>{item.body}</span>}</div>
      {item.action && <button type="button" className="ss-toast-action" onClick={() => { item.action!.onClick(); onDone(item.id); }}>{item.action.label}</button>}
      <IconButton icon="x" label={t('actions.close')} size="sm" onClick={() => onDone(item.id)} />
    </m.li>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const next = useRef(1);
  const show = useCallback((t: ToastInput) => setItems((xs) => [...xs.slice(-2), { ...t, id: next.current++ }]), []);
  const done = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const value = useMemo(() => show, [show]);
  return (
    <Ctx value={value}>
      {children}
      {/* Always in the DOM so screen readers register the live region before the first toast. */}
      <ol className="ss-toasts" aria-live="polite" aria-relevant="additions" role="region" aria-label="Notifications">
        <AnimatePresence initial={false}>{items.map((i) => <ToastView key={i.id} item={i} onDone={done} />)}</AnimatePresence>
      </ol>
    </Ctx>
  );
}

export function useToast() {
  const v = use(Ctx);
  if (!v) throw new Error('useToast needs <ToastProvider>');
  return v;
}
