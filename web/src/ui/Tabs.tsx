// Tabs with arrow-key navigation (roving tabindex). The selected tab's underline grows in (CSS).
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem { id: string; label: ReactNode; content: ReactNode }

export function Tabs({ items, value, onChange, label }: { items: TabItem[]; value: string; onChange: (id: string) => void; label: string }) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, items.findIndex((i) => i.id === value));
  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: idx + 1, ArrowLeft: idx - 1, Home: 0, End: items.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const n = (map[e.key] + items.length) % items.length;
    onChange(items[n].id);
    refs.current[n]?.focus();
  };
  return (
    <div className="ss-tabs">
      <div role="tablist" aria-label={label} className="ss-tablist" onKeyDown={onKey}>
        {items.map((it, i) => (
          <button key={it.id} ref={(el) => { refs.current[i] = el; }} role="tab" type="button" id={`${base}-t-${it.id}`}
            aria-selected={i === idx} aria-controls={`${base}-p-${it.id}`} tabIndex={i === idx ? 0 : -1}
            className="ss-tab" onClick={() => onChange(it.id)}>
            {it.label}
          </button>
        ))}
      </div>
      {items.map((it, i) => (
        <div key={it.id} role="tabpanel" id={`${base}-p-${it.id}`} aria-labelledby={`${base}-t-${it.id}`} hidden={i !== idx} tabIndex={0} className="ss-tabpanel">
          {i === idx && it.content}
        </div>
      ))}
    </div>
  );
}
