// Browser entry. Pre-rendered pages are hydrated (their HTML is already on screen);
// other URLs render from scratch.
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { createBrowserRouter, matchRoutes, RouterProvider, type RouteObject } from 'react-router';
import { Layout } from './app/Layout';
import { Root } from './app/Root';
import { childRoutes } from './app/routes';
import { initI18n } from './i18n';
import { DEFAULT_LOCALE, loadLocale } from './lib/locale';
import { makeQueryClient } from './lib/query';
import './styles/global.css';
import './ui/ui.css';
import './app/app.css';

// Lets CSS hide below-the-fold content for scroll reveals only when JavaScript runs.
document.documentElement.classList.add('js');

const routes: RouteObject[] = [{ path: '/', Component: Layout, children: childRoutes }];
const container = document.getElementById('root')!;
const prerendered = container.hasChildNodes();
const queryClient = makeQueryClient();

async function start() {
  // Pre-rendered HTML is in English with default settings; hydrate with the same, then switch
  // to the visitor's stored language and currency right after (PreferencesProvider adoptStored).
  const locale = prerendered ? DEFAULT_LOCALE : loadLocale();
  initI18n(locale.language);
  if (prerendered) {
    // Load the matched page's code first so hydration finds the same tree the server rendered.
    const matches = matchRoutes(routes, window.location) ?? [];
    await Promise.all(matches.map(async (m) => {
      const r = m.route;
      if (typeof r.lazy === 'function') { Object.assign(r, await r.lazy()); delete r.lazy; }
    }));
  }
  const router = createBrowserRouter(routes);
  const app = (
    <StrictMode>
      <Root queryClient={queryClient} locale={locale} adoptStored={prerendered}>
        <RouterProvider router={router} />
      </Root>
    </StrictMode>
  );
  if (prerendered) hydrateRoot(container, app);
  else createRoot(container).render(app);
}
void start();
