// Editable list of lines for a scope or proposal: kind, text and an optional price. Pasting a
// list into a line's text splits it into one line per row. Lines keep their baseline id on a
// change request, so the client sees what changed.
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefs } from '../../app/preferences';
import type { ItemKind } from '../../lib/sealed';
import { Button, IconButton, Input, Select } from '../../ui';

export interface EditItem { key: string; id?: string; kind: ItemKind; text: string; price: string }
let seq = 0;
export const newItem = (kind: ItemKind = 'scope', text = '', price?: number, id?: string): EditItem => ({ key: 'i' + ++seq, id, kind, text, price: price != null && kind !== 'out' ? String(price) : '' });

/** Lines to send: blank lines dropped, prices only on non-exclusions. */
export const toSealItems = (items: EditItem[]) => items.filter((i) => i.text.trim()).map((i) => ({
  ...(i.id ? { id: i.id } : {}), kind: i.kind, text: i.text.trim(), ...(i.kind !== 'out' && i.price.trim() !== '' ? { price: i.price.trim() } : {}),
}));
export const itemsTotal = (items: EditItem[]) => items.reduce((t, i) => t + (i.kind !== 'out' && i.text.trim() && i.price.trim() !== '' && Number.isFinite(Number(i.price)) ? Math.round(Number(i.price) * 100) : 0), 0) / 100;

/** "- one\n2) two\n• three" → ["one", "two", "three"] */
export const splitList = (t: string) => t.split(/\r?\n/).map((l) => l.replace(/^\s*([-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean);

export function ItemsEditor({ items, onChange, kinds, currency }: { items: EditItem[]; onChange: (items: EditItem[]) => void; kinds: ItemKind[]; currency: string }) {
  const { t } = useTranslation();
  const { money } = usePrefs();
  const box = useRef<HTMLDivElement>(null);
  const set = (key: string, patch: Partial<EditItem>) => onChange(items.map((i) => (i.key === key ? { ...i, ...patch, ...(patch.kind === 'out' ? { price: '' } : {}) } : i)));
  const add = (kind: ItemKind) => {
    const it = newItem(kind);
    onChange([...items, it]);
    requestAnimationFrame(() => box.current?.querySelector<HTMLInputElement>(`[data-key="${it.key}"] .item-text`)?.focus());
  };
  const total = itemsTotal(items);
  return (
    <div className="items" ref={box}>
      {items.map((it, n) => (
        <div key={it.key} className={'item is-' + it.kind} data-key={it.key}>
          <Select aria-label={t('new.kindLabel', { n: n + 1 })} value={it.kind} onChange={(e) => set(it.key, { kind: e.target.value as ItemKind })}>
            {kinds.map((k) => <option key={k} value={k}>{t(`doc.items.${k}`)}</option>)}
          </Select>
          <Input className="item-text" aria-label={t('new.textLabel', { n: n + 1 })} value={it.text} maxLength={600} placeholder={t('new.textPh')}
            onChange={(e) => set(it.key, { text: e.target.value })}
            onPaste={(e) => {
              const lines = splitList(e.clipboardData.getData('text'));
              if (lines.length < 2) return;
              e.preventDefault();
              const i = items.findIndex((x) => x.key === it.key);
              const rest = lines.slice(1).map((l) => newItem(it.kind, l));
              onChange([...items.slice(0, i), { ...it, text: lines[0] }, ...rest, ...items.slice(i + 1)]);
            }} />
          <Input className="item-price" aria-label={t('new.priceLabel', { n: n + 1 })} inputMode="decimal" placeholder={it.kind === 'out' ? '—' : t('new.pricePh')}
            disabled={it.kind === 'out'} value={it.price} onChange={(e) => set(it.key, { price: e.target.value.replace(/[^\d.]/g, '') })} />
          <IconButton icon="x" label={t('new.remove', { n: n + 1 })} size="sm" onClick={() => onChange(items.filter((x) => x.key !== it.key))} />
        </div>
      ))}
      <div className="row items-foot">
        {kinds.map((k) => <Button key={k} variant="ghost" size="sm" icon="plus" onClick={() => add(k)}>{t(`doc.items.${k}`)}</Button>)}
        {total > 0 && <b className="items-total">{t('new.total', { amount: money(total, currency) })}</b>}
      </div>
    </div>
  );
}
