// Every page of the site with the same URL as today. Pages load on demand (code splitting), and
import type { ComponentType } from 'react';
// <AppLink> starts loading a page's code when the visitor hovers, focuses or touches a link to it.
import type { RouteObject } from 'react-router';

type Loader = () => Promise<{ default: ComponentType }>;

// Pages not yet moved to React render a placeholder that links to the current page (phases D and E).
export const pages: Record<string, Loader> = {
  '/': () => import('../pages/Placeholder'),
  '/estimate': () => import('../pages/Placeholder'),
  '/new': () => import('../pages/Placeholder'),
  '/sign': () => import('../pages/Placeholder'),
  '/receipt': () => import('../pages/Placeholder'),
  '/verify': () => import('../pages/Placeholder'),
  '/privacy': () => import('../pages/Placeholder'),
  '/thanks': () => import('../pages/Placeholder'),
  '/login': () => import('../pages/Placeholder'),
  '/app/*': () => import('../pages/Placeholder'),
  '/kit': () => import('../pages/Kit'),
};

const lazyPage = (load: Loader): RouteObject['lazy'] => async () => ({ Component: (await load()).default });

export const childRoutes: RouteObject[] = [
  ...Object.entries(pages).map(([path, load]): RouteObject => (path === '/' ? { index: true, lazy: lazyPage(load) } : { path: path.slice(1), lazy: lazyPage(load) })),
  { path: '*', lazy: lazyPage(() => import('../pages/NotFound')) },
];

/** Starts downloading a page's code before navigation; safe to call many times. */
const started = new Set<string>();
export function preloadPage(to: string) {
  const path = to.split(/[?#]/)[0] || '/';
  const key = path.startsWith('/app/') ? '/app/*' : path;
  if (started.has(key) || !pages[key]) return;
  started.add(key);
  void pages[key]().catch(() => started.delete(key));
}
