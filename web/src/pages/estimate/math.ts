// Pricing math for the estimator. Same formula as the API (api/estimate.js totals()):
// price = hours × rate × (1 + buffer%). A feature's quote uses the middle of each story's range.
import type { Estimate, Feature } from './types';

export const priceOf = (hours: number, rate: number, buffer: number) => Math.round(hours * rate * (1 + buffer / 100));
export const mid = (s: { hoursLow: number; hoursHigh: number }) => (s.hoursLow + s.hoursHigh) / 2;
export const featurePrice = (f: Feature, rate: number, buffer: number) => priceOf(f.stories.reduce((a, s) => a + mid(s), 0), rate, buffer);

export function totals(e: Estimate, rate: number, buffer: number) {
  const all = e.features.flatMap((f) => f.stories);
  const low = all.reduce((a, s) => a + s.hoursLow, 0);
  const high = all.reduce((a, s) => a + s.hoursHigh, 0);
  return { low, high, priceLow: priceOf(low, rate, buffer), priceHigh: priceOf(high, rate, buffer), weeks: e.milestones.reduce((a, m) => a + m.weeks, 0) };
}

/** What /new expects in sessionStorage "ss-draft": one priced line per feature, exclusions as out of scope. */
export function toDraft(e: Estimate, rate: number, buffer: number, currency: string, assumptionsLabel: string) {
  const items: { kind: 'scope' | 'out'; text: string; price?: number }[] = [
    ...e.features.filter((f) => f.stories.length).map((f) => ({
      kind: 'scope' as const,
      text: `${f.name}: ${f.stories.map((s) => s.title).join('; ')}`.slice(0, 600),
      price: featurePrice(f, rate, buffer),
    })),
    ...e.outOfScope.map((x) => ({ kind: 'out' as const, text: x.slice(0, 600) })),
  ];
  const notes = e.assumptions.length ? `${assumptionsLabel}:\n- ${e.assumptions.join('\n- ')}`.slice(0, 2000) : '';
  return { title: (e.projectType || e.summary).slice(0, 160), currency, notes, items };
}
