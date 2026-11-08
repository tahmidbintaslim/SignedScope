import { detectLocale, formatDate, formatMoney, formatNumber } from '../lib/locale';
import en from '../i18n/locales/en.json';
import bn from '../i18n/locales/bn.json';
import th from '../i18n/locales/th.json';

const us = { language: 'en', country: 'US' } as const;

describe('locale formatting', () => {
  it('drops decimals for whole amounts and keeps them otherwise', () => {
    expect(formatMoney(4500, 'USD', us)).toBe('$4,500');
    expect(formatMoney(750.5, 'USD', us)).toBe('$750.50');
  });
  it('uses each currency and language convention', () => {
    expect(formatMoney(48500, 'THB', { language: 'th', country: 'TH' })).toMatch(/48,500/);
    expect(formatMoney(1200, 'JPY', us)).toBe('¥1,200');
    expect(formatNumber(1234567, { language: 'bn', country: 'BD' })).toBe('১২,৩৪,৫৬৭');
  });
  it('formats dates in the chosen time zone', () => {
    const p = { language: 'en', country: 'US', timeZone: 'Asia/Bangkok', currency: 'USD' } as const;
    expect(formatDate('2026-11-08T20:00:00Z', p)).toBe('Nov 9, 2026');
    expect(formatDate('not a date', p)).toBe('');
  });
  it('detects language and country from the browser', () => {
    const d = detectLocale({ languages: ['th-TH', 'en'], language: 'th-TH' });
    expect(d.language).toBe('th');
    expect(detectLocale({ languages: ['fr-FR'], language: 'fr-FR' }).language).toBe('en');
  });
});

describe('translations', () => {
  const keys = (o: object, p = ''): string[] => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, p + k + '.') : [p + k]));
  it('Bengali and Thai have exactly the English keys', () => {
    expect(keys(bn).sort()).toEqual(keys(en).sort());
    expect(keys(th).sort()).toEqual(keys(en).sort());
  });
});
