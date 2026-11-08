// Page frame: skip link, header with navigation and preferences, animated page changes,
// and focus moved to the new page's heading so keyboard and screen-reader users know it changed.
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router';
import { page } from '../motion/tokens';
import { Logo, Menu, IconButton, Select } from '../ui';
import { LANGUAGES, type Language } from '../lib/locale';
import { AppLink, AppNavLink } from './AppLink';
import { usePrefs, type Theme } from './preferences';

const LANG_NAME: Record<Language, string> = { en: 'English', bn: 'বাংলা', th: 'ไทย' };

function Header() {
  const { t } = useTranslation();
  const { locale, setLocale, theme, setTheme } = usePrefs();
  const themes: { id: Theme; label: string }[] = [
    { id: 'system', label: t('settings.themeSystem') }, { id: 'light', label: t('settings.themeLight') }, { id: 'dark', label: t('settings.themeDark') },
  ];
  return (
    <header className="site-header">
      <div className="container site-header-row">
        <AppLink to="/" className="site-logo" aria-label={t('nav.home')}><Logo size={28} /></AppLink>
        <nav aria-label={t('nav.main')} className="site-nav">
          <AppNavLink to="/estimate">{t('nav.estimate')}</AppNavLink>
          <AppNavLink to="/login">{t('nav.signIn')}</AppNavLink>
        </nav>
        <div className="site-tools">
          <label className="visually-hidden" htmlFor="lang">{t('settings.language')}</label>
          <Select id="lang" value={locale.language} onChange={(e) => setLocale({ language: e.target.value as Language })} className="site-lang">
            {LANGUAGES.map((l) => <option key={l} value={l}>{LANG_NAME[l]}</option>)}
          </Select>
          <Menu
            trigger={(p) => <IconButton {...p} icon={theme === 'dark' ? 'moon' : 'sun'} label={t('settings.theme')} />}
            items={themes.map((x) => ({ label: x.label + (theme === x.id ? ' ✓' : ''), onSelect: () => setTheme(x.id) }))}
          />
        </div>
      </div>
    </header>
  );
}

/** Thin bar at the top while the next page's code or data loads. */
function NavProgress() {
  const nav = useNavigation();
  return <div className={'nav-progress' + (nav.state !== 'idle' ? ' is-active' : '')} role="progressbar" aria-hidden={nav.state === 'idle'} aria-label="Loading" />;
}

export function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
  const pendingFocus = useRef(false);

  // After a client-side navigation, focus the new page's h1 (or main) once it has entered.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    pendingFocus.current = true;
  }, [location.pathname]);
  const focusPage = () => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    const target = main.current?.querySelector<HTMLElement>('h1, [role="heading"][aria-level="1"]') ?? main.current;
    if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  };

  return (
    <>
      <a href="#main" className="skip-link">{t('nav.skip')}</a>
      <NavProgress />
      <Header />
      <main id="main" ref={main} className="site-main">
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={location.pathname} variants={page} initial="initial" animate="enter" exit="exit"
            onAnimationComplete={(def) => { if (def === 'enter') focusPage(); }}>
            <Outlet />
          </m.div>
        </AnimatePresence>
      </main>
      <ScrollRestoration />
    </>
  );
}
