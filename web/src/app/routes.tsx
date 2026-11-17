// Every page of the site, at the same URL as today. React pages load on demand (code splitting);
// <AppLink> starts loading a page's code when the visitor hovers, focuses or touches a link to it.
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
  '/new': () => import('../pages/new/NewScope'),
  '/sign': () => import('../pages/doc/Sign'),
  '/receipt': () => import('../pages/doc/Receipt'),
  '/templates': () => import('../pages/templates/Templates'),
  '/templates/website-design': () => import('../pages/templates/Template'),
  '/templates/logo-design': () => import('../pages/templates/Template'),
  '/templates/mobile-app': () => import('../pages/templates/Template'),
  '/templates/social-media-management': () => import('../pages/templates/Template'),
  '/compare': () => import('../pages/compare/Compare'),
  '/kit': () => import('../pages/Kit'),
};

/** URLs pre-rendered to HTML at build time. */
export const PRERENDER = Object.keys(pages);
/**
 * Signed-in pages get an HTML shell with an empty root instead: the browser renders whichever
 * URL was asked for (Vercel sends every /app/* URL to app.html).
 */
export const SHELLS = ['/login', '/app'];

/** Title and description per page: written into the pre-rendered HTML and set on navigation. */
export const META: Record<string, { title: string; description: string; noindex?: boolean }> = {
  '/': { title: 'SignedScope: get the scope signed, get the extras paid', description: 'Send one link. Your client approves each line and signs. Every extra ask becomes a priced change they approve in one tap. Free during the beta.' },
  '/estimate': { title: 'Free AI project estimate for freelancers · SignedScope', description: 'Paste a client brief and get features, user stories, milestones, a timeline and a price range from your own hourly rate. Free, in English, Bengali and Thai.' },
  '/verify': { title: 'Verify a link · SignedScope', description: 'Check that a SignedScope sign-off or receipt link is genuine and unchanged.' },
  '/privacy': { title: 'Privacy · SignedScope', description: 'What SignedScope stores, why, for how long, and your rights.' },
  '/new': { title: 'New scope · SignedScope', description: 'List what is in and out of scope, price each line, and send one link your client approves line by line.' },
  '/sign': { title: 'Review and sign · SignedScope', description: 'Review each line, then approve and sign.', noindex: true },
  '/receipt': { title: 'Sign-off receipt · SignedScope', description: 'A signed record of who approved what and when.', noindex: true },
  '/thanks': { title: 'Thank you · SignedScope', description: 'Your early access is active.', noindex: true },
  '/login': { title: 'Sign in · SignedScope', description: 'Sign in to your SignedScope workspace.', noindex: true },
  '/app': { title: 'Workspace · SignedScope', description: 'Your projects, clients and sign-offs.', noindex: true },
  '/404': { title: 'Page not found · SignedScope', description: 'This page does not exist.', noindex: true },
  '/templates': { title: 'Free scope of work templates for freelancers · SignedScope', description: 'Scope of work templates for websites, logos, mobile apps and social media: deliverables, tests to pass and what is not included. Edit and send as one link.' },
  '/templates/website-design': { title: 'Website design scope of work template · SignedScope', description: 'A free website design scope of work: pages, build, tests your client signs off on, and what is not included. Send it as one link your client approves line by line.' },
  '/templates/logo-design': { title: 'Logo design scope of work template · SignedScope', description: 'A free logo and brand identity scope of work: concepts, rounds of changes, final files and what is not included. Send it as one link your client approves line by line.' },
  '/templates/mobile-app': { title: 'Mobile app development scope of work template · SignedScope', description: 'A free mobile app scope of work: prototype, build, sign in, store setup, tests your client signs off on, and what is not included.' },
  '/templates/social-media-management': { title: 'Social media management scope of work template · SignedScope', description: 'A free monthly social media management scope of work: posts, captions, calendar, replies, reporting and what is not included.' },
  '/compare': { title: 'SignedScope vs a PDF quote by email · SignedScope', description: 'How line-by-line approval, phone signing and priced change requests compare with sending a PDF quote by email. And when a full proposal suite fits better.' },
  '/kit': { title: 'Design system · SignedScope', description: 'Components of the SignedScope app.', noindex: true },
};

const lazyPage = (load: Loader): RouteObject['lazy'] => async () => ({ Component: (await load()).default });

/** Account pages and the workspace. Rendered in the browser only (see SHELLS). */
export const accountRoutes: RouteObject[] = [
  { path: 'login', lazy: lazyPage(() => import('../pages/auth/Login')) },
  {
    path: 'app',
    lazy: lazyPage(() => import('../pages/app/AppShell')),
    children: [
      { index: true, lazy: lazyPage(() => import('../pages/app/Dashboard')) },
      { path: 'welcome', lazy: lazyPage(() => import('../pages/app/Onboarding')) },
      { path: 'projects', lazy: lazyPage(() => import('../pages/app/Projects')) },
      { path: 'projects/:id/compose', lazy: lazyPage(() => import('../pages/app/Compose')) },
      { path: 'projects/:id', lazy: lazyPage(() => import('../pages/app/ProjectDetail')) },
      { path: 'clients', lazy: lazyPage(() => import('../pages/app/Clients')) },
      { path: 'clients/:id', lazy: lazyPage(() => import('../pages/app/ClientDetail')) },
      { path: 'settings', lazy: lazyPage(() => import('../pages/app/Settings')) },
      { path: '*', lazy: lazyPage(() => import('../pages/NotFound')) },
    ],
  },
];

export const childRoutes: RouteObject[] = [
  ...Object.entries(pages).map(([path, load]): RouteObject => (path === '/' ? { index: true, lazy: lazyPage(load) } : { path: path.slice(1), lazy: lazyPage(load) })),
  ...accountRoutes,
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
