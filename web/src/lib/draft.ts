// Hand-off of a scope draft to /new (from the AI estimator or a project's latest estimate),
// through sessionStorage "ss-draft", read once. Same format the old pages used.
import type { EstimateRow } from './db';
import type { ItemKind } from './sealed';

export interface DraftItem { kind: ItemKind; text: string; price?: number }
export interface ScopeDraft { title: string; currency: string; notes: string; items: DraftItem[]; client?: string }

/** One priced scope line per estimated feature (midpoint hours × rate × buffer), then exclusions. */
export function linesFromEstimate(e: Pick<EstimateRow, 'rate' | 'buffer_pct' | 'data'>): DraftItem[] {
  const f = 1 + Number(e.buffer_pct) / 100, rate = Number(e.rate);
  return (e.data.features ?? []).map((ft): DraftItem => ({
    kind: 'scope', text: `${ft.name}: ${ft.stories.map((s) => s.title).join('; ')}`.slice(0, 600),
    price: Math.round(ft.stories.reduce((a, s) => a + (s.hoursLow + s.hoursHigh) / 2, 0) * rate * f),
  })).concat((e.data.outOfScope ?? []).map((x): DraftItem => ({ kind: 'out', text: x.slice(0, 600) })));
}

export function saveDraft(d: ScopeDraft) {
  try { sessionStorage.setItem('ss-draft', JSON.stringify(d)); } catch { /* private mode: /new starts empty */ }
}

/** Reads and clears the draft; anything malformed is ignored. */
export function takeDraft(): ScopeDraft | null {
  try {
    const raw = sessionStorage.getItem('ss-draft');
    sessionStorage.removeItem('ss-draft');
    const d = JSON.parse(raw || 'null');
    if (!d || !Array.isArray(d.items) || !d.items.length) return null;
    return {
      title: String(d.title || '').slice(0, 160), currency: String(d.currency || ''), notes: String(d.notes || '').slice(0, 2000),
      client: d.client ? String(d.client).slice(0, 120) : undefined,
      items: d.items.slice(0, 100).map((it: Partial<DraftItem>): DraftItem => {
        const kind = (['scope', 'uat', 'out'] as const).find((k) => k === it.kind) ?? 'scope';
        return { kind, text: String(it.text || '').slice(0, 600), price: kind !== 'out' && it.price != null && Number.isFinite(Number(it.price)) ? Number(it.price) : undefined };
      }),
    };
  } catch { return null; }
}
