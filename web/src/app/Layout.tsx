// Page frame: skip link, header with navigation and preferences, animated page changes,
// and focus moved to the new page's heading so keyboard and screen-reader users know it changed.
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router';
import { page } from '../motion/tokens';
import { Logo, Menu, IconButton, Select } from '../ui';
import { LANGUAGES, type Language } from '../lib/locale';
import { readSignedInHint } from '../lib/signedInHint';
import { AppLink, AppNavLink } from './AppLink';
import { usePrefs, type Theme } from './preferences';
import { META } from './routes';

const LANG_NAME: Record<Language, string> = { en: 'English', bn: 'বাংলা', th: 'ไทย' };

function Header() {
  const { t } = useTranslation();
  const { locale, setLocale, theme, setTheme } = usePrefs();
  // Read after hydration (pre-rendered HTML always says "Sign in").
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(readSignedInHint()), []);
  const themes: { id: Theme; label: string }[] = [
    { id: 'system', label: t('settings.themeSystem') }, { id: 'light', label: t('settings.themeLight') }, { id: 'dark', label: t('settings.themeDark') },
  ];
  return (
    <header className="site-header">
      <div className="container site-header-row">
        {/* The name starts with the visible text ("SignedScope") so voice control can target it. */}
        <AppLink to="/" className="site-logo" aria-label={`SignedScope, ${t('nav.home')}`}><Logo size={28} /></AppLink>
        <nav aria-label={t('nav.main')} className="site-nav">
          <AppNavLink to="/estimate">{t('nav.estimate')}</AppNavLink>
          <AppNavLink to="/#pricing">{t('nav.pricing')}</AppNavLink>
          <AppNavLink to={signedIn ? '/app' : '/login'}>{t(signedIn ? 'nav.dashboard' : 'nav.signIn')}</AppNavLink>
        </nav>
        <div className="site-tools">
          <AppLink to={signedIn ? '/app' : '/login'} className="site-signin">{t(signedIn ? 'nav.dashboard' : 'nav.signIn')}</AppLink>
          <label className="visually-hidden" htmlFor="lang">{t('settings.language')}</label>
          <Select id="lang" value={locale.language} onChange={(e) => setLocale({ language: e.target.value as Language })} className="site-lang">
            {LANGUAGES.map((l) => <option key={l} value={l}>{LANG_NAME[l]}</option>)}
          </Select>
          <Menu
            trigger={(p) => <IconButton {...p} icon={theme === 'dark' ? 'moon' : 'sun'} label={t('settings.theme')} />}
            items={themes.map((x) => ({ label: x.label, checked: theme === x.id, onSelect: () => setTheme(x.id) }))}
          />
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="site-footer">
      <div className="container site-footer-row">
        <Logo size={24} />
        <p className="muted">{t('home.footer.built')}</p>
        <nav aria-label="Footer" className="row">
          <AppLink to="/privacy">{t('home.footer.privacy')}</AppLink>
          <AppLink to="/verify">{t('home.footer.verify')}</AppLink>
          <a href="https://github.com/tahmidbintaslim/SignedScope">{t('home.footer.source')}</a>
        </nav>
      </div>
    </footer>
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

  useEffect(() => { const m = META[location.pathname]; if (m) document.title = m.title; }, [location.pathname]);

  // After a client-side navigation, focus the new page's h1 (or main) once it has entered.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    pendingFocus.current = true;
    // Fallback if the enter animation never reports (e.g. animation features not loaded yet).
    const t = setTimeout(focusPage, 700);
    return () => clearTimeout(t);
  }, [location.pathname]);
  function focusPage() {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    const target = main.current?.querySelector<HTMLElement>('h1, [role="heading"][aria-level="1"]') ?? main.current;
    if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  }

  // The workspace (/app) draws its own frame: sidebar, top bar and tab bar.
  if (location.pathname === '/app' || location.pathname.startsWith('/app/')) {
    return (
      <>
        <a href="#main" className="skip-link">{t('nav.skip')}</a>
        <NavProgress />
        <Outlet />
        <ScrollRestoration />
      </>
    );
  }

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
      <Footer />
      <ScrollRestoration />
    </>
  );
}
