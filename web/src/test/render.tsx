import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { PreferencesProvider } from '../app/preferences';
import { initI18n } from '../i18n';
import { ToastProvider } from '../ui';

initI18n('en');
const prefs = { language: 'en', country: 'US', timeZone: 'UTC', currency: 'USD' } as const;

export function renderUI(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <PreferencesProvider initial={prefs}><ToastProvider>{ui}</ToastProvider></PreferencesProvider>
    </MemoryRouter>,
  );
}
