// Every page of the site, at the same URL as today. React pages load on demand (code splitting);
// <AppLink> starts loading a page's code when the visitor hovers, focuses or touches a link to it.
// Pages not moved to React yet are "legacy": links to them do a normal page load, and in
// production the old HTML file still serves that URL.
import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';

type Loader = () => Promise<{ default: ComponentType }>;

/** Pages served by the React app. Each one is also pre-rendered to static HTML (see prerender). */
export const pages: Record<string, Loader> = {
  '/': () => import('../pages/home/Home'),
  '/estimate': () => import('../pages/estimate/Estimate'),
  '/verify': () => import('../pages/legal/Verify'),
  '/privacy': () => import('../pages/legal/Privacy'),
  '/thanks': () => import('../pages/legal/Thanks'),
  '/kit': () => import('../pages/Kit'),
};

/** URLs still served by the old pages in public/ until phases D and E move them. */
export const LEGACY = ['/new', '/sign', '/receipt', '/login', '/app'];
export const isLegacy = (to: string) => {
  const path = to.split(/[?#]/)[0] || '/';
  return LEGACY.some((p) => path === p || path.startsWith(p + '/'));
};

/** URLs pre-rendered to HTML at build time. */
export const PRERENDER = Object.keys(pages);

/** Title and description per page: written into the pre-rendered HTML and set on navigation. */
export const META: Record<string, { title: string; description: string; noindex?: boolean }> = {
  '/': { title: 'SignedScope: get the scope signed, get the extras paid', description: 'Send one link. Your client approves each line and signs. Every extra ask becomes a priced change they approve in one tap. Free during the beta.' },
  '/estimate': { title: 'Free AI project estimate for freelancers · SignedScope', description: 'Paste a client brief and get features, user stories, milestones, a timeline and a price range from your own hourly rate. Free, in English, Bengali and Thai.' },
  '/verify': { title: 'Verify a link · SignedScope', description: 'Check that a SignedScope sign-off or receipt link is genuine and unchanged.' },
  '/privacy': { title: 'Privacy · SignedScope', description: 'What SignedScope stores, why, for how long, and your rights.' },
  '/thanks': { title: 'Thank you · SignedScope', description: 'Your early access is active.', noindex: true },
  '/kit': { title: 'Design system · SignedScope', description: 'Components of the SignedScope app.', noindex: true },
};

const lazyPage = (load: Loader): RouteObject['lazy'] => async () => ({ Component: (await load()).default });

export const childRoutes: RouteObject[] = [
  ...Object.entries(pages).map(([path, load]): RouteObject => (path === '/' ? { index: true, lazy: lazyPage(load) } : { path: path.slice(1), lazy: lazyPage(load) })),
  // In dev, legacy URLs show a placeholder; in production their HTML files answer first.
  ...LEGACY.map((p): RouteObject => ({ path: p.slice(1) + (p === '/app' ? '/*' : ''), lazy: lazyPage(() => import('../pages/Placeholder')) })),
  { path: '*', lazy: lazyPage(() => import('../pages/NotFound')) },
];

/** Starts downloading a page's code before navigation; safe to call many times. */
const started = new Set<string>();
export function preloadPage(to: string) {
  const path = to.split(/[?#]/)[0] || '/';
  if (started.has(path) || !pages[path]) return;
  started.add(path);
  void pages[path]().catch(() => started.delete(path));
}
