// i18next setup. English ships in the main bundle; Bengali and Thai load on demand,
// so visitors only download the language they use.
import i18n, { type BackendModule } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import type { Language } from '../lib/locale';

const lazyLocales: BackendModule = {
  type: 'backend',
  init() {},
  read(language, _namespace, callback) {
    if (language === 'en') return callback(null, en);
    const load: Record<string, () => Promise<{ default: object }>> = {
      bn: () => import('./locales/bn.json'),
      th: () => import('./locales/th.json'),
    };
    (load[language] ?? (() => Promise.resolve({ default: en })))()
      .then((m) => callback(null, m.default))
      .catch((e: Error) => callback(e, null));
  },
};

export function initI18n(language: Language) {
  if (i18n.isInitialized) return i18n;
  i18n.use(lazyLocales).use(initReactI18next).init({
    lng: language,
    fallbackLng: 'en',
    supportedLngs: ['en', 'bn', 'th'],
    partialBundledLanguages: true,
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false }, // React escapes output
    returnNull: false,
    react: { useSuspense: false },
  });
  return i18n;
}

export default i18n;
