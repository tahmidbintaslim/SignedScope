// Build-time renderer: turns each React page into static HTML (scripts/prerender.mjs) so the
// first paint needs no JavaScript and search engines see the full text.
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider, type RouteObject } from 'react-router';
import { Layout } from './app/Layout';
import { Root } from './app/Root';
import { RouteError } from './app/RouteError';
import { childRoutes } from './app/routes';
import { initI18n } from './i18n';
import { DEFAULT_LOCALE } from './lib/locale';
import { makeQueryClient } from './lib/query';

const routes: RouteObject[] = [{ path: '/', Component: Layout, ErrorBoundary: RouteError, HydrateFallback: () => null, children: childRoutes }];
export { META, PRERENDER, SHELLS } from "./app/routes";

export async function render(url: string): Promise<string> {
  initI18n('en');
  const handler = createStaticHandler(routes);
  const ctx = await handler.query(new Request('https://signedscope.app' + url));
  if (ctx instanceof Response) throw new Error(`Unexpected redirect for ${url}`);
  const router = createStaticRouter(handler.dataRoutes, ctx);
  return renderToString(
    <Root queryClient={makeQueryClient()} locale={DEFAULT_LOCALE}>
      <StaticRouterProvider router={router} context={ctx} hydrate={false} />
    </Root>,
  );
}
