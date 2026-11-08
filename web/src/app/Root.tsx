// Providers shared by the browser entry and the build-time pre-renderer.
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import type { LocalePrefs } from '../lib/locale';
import { ToastProvider } from '../ui';
import { PreferencesProvider } from './preferences';

// Animation features load after first paint; components use the light `m` elements.
const motionFeatures = () => import('../motion/features').then((r) => r.default);

export function Root({ queryClient, locale, adoptStored, children }: { queryClient: QueryClient; locale: LocalePrefs; adoptStored?: boolean; children: ReactNode }) {
  return (
    // reducedMotion="user": Framer Motion drops transforms when the OS asks for less motion.
    <MotionConfig reducedMotion="user">
      <LazyMotion features={motionFeatures} strict>
        <QueryClientProvider client={queryClient}>
          <PreferencesProvider initial={locale} adoptStored={adoptStored}>
            <ToastProvider>{children}</ToastProvider>
          </PreferencesProvider>
        </QueryClientProvider>
      </LazyMotion>
    </MotionConfig>
  );
}
