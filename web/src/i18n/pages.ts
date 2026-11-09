// English strings for the pages that load on demand (workspace, sign-in, documents, the
// estimator and verify). Kept out of the first download; each of those pages imports this
// module, which adds the strings before the page renders (also during pre-rendering).
// Bengali and Thai files are loaded whole, on demand, so they need no split.
import i18n from '.';
import pages from './locales/en-pages.json';

// i18next creates addResourceBundle in init(); the app always initializes first, but a module that
// is imported earlier (a unit test, say) adds the strings once i18n starts.
const add = () => i18n.addResourceBundle('en', 'translation', pages, true, false);
if (i18n.isInitialized) add();
else i18n.on('initialized', add);
