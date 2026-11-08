import { QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { Layout } from './app/Layout';
import { PreferencesProvider } from './app/preferences';
import { childRoutes } from './app/routes';
import { initI18n } from './i18n';
import { loadLocale } from './lib/locale';
import { makeQueryClient } from './lib/query';
import { ToastProvider } from './ui';
import './styles/global.css';
import './ui/ui.css';
import './app/app.css';

const locale = loadLocale();
initI18n(locale.language);
const queryClient = makeQueryClient();
// Animation features load after first paint; components use the light `m` elements.
const motionFeatures = () => import('./motion/features').then((r) => r.default);
const router = createBrowserRouter([{ path: '/', Component: Layout, children: childRoutes }]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* reducedMotion="user": Framer Motion drops transforms when the OS asks for less motion. */}
    <MotionConfig reducedMotion="user">
      <LazyMotion features={motionFeatures} strict>
      <QueryClientProvider client={queryClient}>
        <PreferencesProvider initial={locale}>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </PreferencesProvider>
      </QueryClientProvider>
      </LazyMotion>
    </MotionConfig>
  </StrictMode>,
);
