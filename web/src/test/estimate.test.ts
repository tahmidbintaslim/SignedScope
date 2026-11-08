import { featurePrice, priceOf, toDraft, totals } from '../pages/estimate/math';
import { SAMPLE_ESTIMATE } from '../pages/estimate/sample';
import { tokenFrom } from '../pages/legal/Verify';

describe('estimate math', () => {
  it('prices hours with the rate and buffer, like the API', () => {
    expect(priceOf(10, 50, 15)).toBe(575);
    expect(priceOf(0, 50, 15)).toBe(0);
  });
  it('totals the sample and quotes features at the middle of each range', () => {
    const s = totals(SAMPLE_ESTIMATE, 600, 15);
    expect(s.low).toBeLessThan(s.high);
    expect(s.priceLow).toBe(priceOf(s.low, 600, 15));
    const f = SAMPLE_ESTIMATE.features[0];
    const midHours = f.stories.reduce((a, x) => a + (x.hoursLow + x.hoursHigh) / 2, 0);
    expect(featurePrice(f, 600, 15)).toBe(priceOf(midHours, 600, 15));
  });
  it('hands /new one priced line per feature and exclusions as out of scope', () => {
    const d = toDraft(SAMPLE_ESTIMATE, 600, 15, 'THB', 'Assumptions');
    const scope = d.items.filter((i) => i.kind === 'scope');
    expect(scope).toHaveLength(SAMPLE_ESTIMATE.features.filter((f) => f.stories.length).length);
    expect(scope.every((i) => typeof i.price === 'number' && i.text.length <= 600)).toBe(true);
    expect(d.items.filter((i) => i.kind === 'out').every((i) => i.price === undefined)).toBe(true);
    expect(d.currency).toBe('THB');
  });
});

describe('verify link parsing', () => {
  it('accepts full links, change-request links and bare tokens', () => {
    expect(tokenFrom('https://x.app/receipt#v1.abc.def')).toBe('v1.abc.def');
    expect(tokenFrom('https://x.app/new#cr=v1.abc.def')).toBe('v1.abc.def');
    expect(tokenFrom('  v1.abc.def ')).toBe('v1.abc.def');
  });
});
