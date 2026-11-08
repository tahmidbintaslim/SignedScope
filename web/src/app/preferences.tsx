// Locale (language, country, time zone, currency) and theme for the whole app.
// Both persist locally; the signed-in profile will sync them in phase E.
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import i18n from '../i18n';
import { formatDate, formatMoney, formatNumber, formatRelative, loadLocale, saveLocale, type LocalePrefs } from '../lib/locale';

export type Theme = 'system' | 'light' | 'dark';

interface Prefs {
  locale: LocalePrefs;
  setLocale: (patch: Partial<LocalePrefs>) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  money: (amount: number, currency?: string) => string;
  number: (n: number) => string;
  date: (d: Date | string, style?: 'date' | 'datetime') => string;
  relative: (d: Date | string) => string;
}

const PrefsContext = createContext<Prefs | null>(null);
const THEME_KEY = 'ss-theme';

function readTheme(): Theme {
  try { const t = localStorage.getItem(THEME_KEY); return t === 'light' || t === 'dark' ? t : 'system'; } catch { return 'system'; }
}

export function PreferencesProvider({ children, initial }: { children: ReactNode; initial?: LocalePrefs }) {
  const [locale, setLocaleState] = useState<LocalePrefs>(() => initial ?? loadLocale());
  const [theme, setThemeState] = useState<Theme>(readTheme);

  const setLocale = useCallback((patch: Partial<LocalePrefs>) => {
    setLocaleState((prev) => { const next = { ...prev, ...patch }; saveLocale(next); return next; });
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { if (t === 'system') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, t); } catch { /* blocked */ }
  }, []);

  // Keep <html lang> and the i18n language in step with the chosen language.
  useEffect(() => {
    document.documentElement.lang = locale.language;
    if (i18n.language !== locale.language) void i18n.changeLanguage(locale.language);
  }, [locale.language]);

  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const value = useMemo<Prefs>(() => ({
    locale, setLocale, theme, setTheme,
    money: (amount, currency = locale.currency) => formatMoney(amount, currency, locale),
    number: (n) => formatNumber(n, locale),
    date: (d, style) => formatDate(d, locale, style),
    relative: (d) => formatRelative(d, locale),
  }), [locale, setLocale, theme, setTheme]);

  return <PrefsContext value={value}>{children}</PrefsContext>;
}

export function usePrefs(): Prefs {
  const v = use(PrefsContext);
  if (!v) throw new Error('usePrefs needs <PreferencesProvider>');
  return v;
}
