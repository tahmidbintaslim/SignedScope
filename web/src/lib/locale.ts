// Language, country, time zone and currency for the current visitor.
// Detected once from the browser, stored locally, and later synced to the signed-in profile.
// Every date, number and amount on screen goes through these formatters (Intl), never by hand.

export const LANGUAGES = ['en', 'bn', 'th'] as const;
export type Language = (typeof LANGUAGES)[number];

// Same list the API accepts (api/_lib.js CURRENCIES).
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'NZD', 'SGD', 'THB', 'BDT', 'VND', 'PHP', 'INR', 'MYR', 'IDR', 'JPY'] as const;
export type Currency = (typeof CURRENCIES)[number];

export interface LocalePrefs {
  language: Language;
  country: string; // ISO 3166-1 alpha-2, '' when unknown
  timeZone: string; // IANA zone
  currency: Currency;
}

const KEY = 'ss-locale';
/** What pre-rendered HTML is rendered with (hydration must match it). */
export const DEFAULT_LOCALE: LocalePrefs = { language: 'en', country: 'US', timeZone: 'UTC', currency: 'USD' };
export const COUNTRY_CURRENCY: Record<string, Currency> = {
  US: 'USD', GB: 'GBP', AU: 'AUD', CA: 'CAD', NZ: 'NZD', SG: 'SGD', TH: 'THB', BD: 'BDT', VN: 'VND',
  PH: 'PHP', IN: 'INR', MY: 'MYR', ID: 'IDR', JP: 'JPY', DE: 'EUR', FR: 'EUR', NL: 'EUR', ES: 'EUR', IT: 'EUR', IE: 'EUR',
};
const ZONE_COUNTRY: Record<string, string> = { 'Asia/Bangkok': 'TH', 'Asia/Dhaka': 'BD', 'Asia/Singapore': 'SG', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN' };

const isLanguage = (v: unknown): v is Language => LANGUAGES.includes(v as Language);
const isCurrency = (v: unknown): v is Currency => CURRENCIES.includes(v as Currency);

/** Best guess from the browser: language list, region subtag, then time zone. */
export function detectLocale(nav: Pick<Navigator, 'languages' | 'language'> = navigator): LocalePrefs {
  const langs = (nav.languages && nav.languages.length ? nav.languages : [nav.language || 'en']).map((l) => l.toLowerCase());
  const language = (langs.map((l) => l.split('-')[0]).find(isLanguage) ?? 'en') as Language;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const region = langs.map((l) => l.split('-')[1]).find((r) => r && r.length === 2)?.toUpperCase();
  const country = ZONE_COUNTRY[timeZone] ?? region ?? (language === 'th' ? 'TH' : language === 'bn' ? 'BD' : '');
  return { language, country, timeZone, currency: COUNTRY_CURRENCY[country] ?? 'USD' };
}

/** Stored preferences merged over detection. Storage can be blocked (private mode): never throws. */
export function loadLocale(): LocalePrefs {
  const base = detectLocale();
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<LocalePrefs> | null;
    if (!s) return base;
    return {
      language: isLanguage(s.language) ? s.language : base.language,
      country: typeof s.country === 'string' && /^[A-Z]{2}$|^$/.test(s.country) ? s.country : base.country,
      timeZone: typeof s.timeZone === 'string' && s.timeZone ? s.timeZone : base.timeZone,
      currency: isCurrency(s.currency) ? s.currency : base.currency,
    };
  } catch {
    return base;
  }
}

export function saveLocale(p: LocalePrefs): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage blocked: keep in memory only */ }
}

// Intl formatters are costly to build, so they are cached per option set.
const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();
function cached<T extends Intl.NumberFormat | Intl.DateTimeFormat>(key: string, make: () => T): T {
  let f = cache.get(key) as T | undefined;
  if (!f) { f = make(); cache.set(key, f); }
  return f;
}
const tag = (p: Pick<LocalePrefs, 'language' | 'country'>) => (p.country ? `${p.language}-${p.country}` : p.language);

/** Money with the currency's own decimals (JPY 0, USD 2); whole amounts drop ".00". */
export function formatMoney(amount: number, currency: string, p: Pick<LocalePrefs, 'language' | 'country'>): string {
  const whole = Number.isInteger(amount);
  const key = `m|${tag(p)}|${currency}|${whole}`;
  return cached(key, () => new Intl.NumberFormat(tag(p), { style: 'currency', currency, ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}) })).format(amount);
}

export function formatNumber(n: number, p: Pick<LocalePrefs, 'language' | 'country'>): string {
  return cached(`n|${tag(p)}`, () => new Intl.NumberFormat(tag(p))).format(n);
}

export function formatDate(d: Date | string, p: LocalePrefs, style: 'date' | 'datetime' = 'date'): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  const key = `d|${tag(p)}|${p.timeZone}|${style}`;
  return cached(key, () => new Intl.DateTimeFormat(tag(p), { dateStyle: 'medium', ...(style === 'datetime' ? { timeStyle: 'short' } : {}), timeZone: p.timeZone })).format(date);
}

/** "2 hours ago" style text in the visitor's language. */
export function formatRelative(d: Date | string, p: Pick<LocalePrefs, 'language' | 'country'>, now = Date.now()): string {
  const t = (typeof d === 'string' ? new Date(d) : d).getTime();
  const s = Math.round((t - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(tag(p), { numeric: 'auto' });
  const abs = Math.abs(s);
  if (abs < 60) return rtf.format(s, 'second');
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86400), 'day');
}
