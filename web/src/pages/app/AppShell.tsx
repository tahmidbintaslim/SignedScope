// Workspace frame: sidebar on desktop, tab bar on phones, the account menu, and two guards:
// signed-out visitors go to /login (and come back), and new accounts go through onboarding once.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { AppLink } from '../../app/AppLink';
import { usePrefs } from '../../app/preferences';
import type { Currency } from '../../lib/locale';
import { getProfile, keys, listActivity, listClients, listDocuments, listPayments, listProjects } from '../../lib/db';
import { signOut, useSession } from '../../lib/session';
import { ButtonLink, Icon, IconButton, Logo, Menu, Spinner, type IconName } from '../../ui';
import './app.css';

const NAV: { to: string; icon: IconName; key: string; end?: boolean }[] = [
  { to: '/app', icon: 'home', key: 'home', end: true },
  { to: '/app/projects', icon: 'folder', key: 'projects' },
  { to: '/app/clients', icon: 'users', key: 'clients' },
  { to: '/app/settings', icon: 'settings', key: 'settings' },
];

export function useProfile(userId: string | undefined) {
  return useQuery({ queryKey: keys.profile, queryFn: () => getProfile(userId!), enabled: Boolean(userId) });
}

export default function AppShell() {
  const { t } = useTranslation();
  const session = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const user = session.data?.user;
  const profile = useProfile(user?.id);

  // Old links (emails, bookmarks) use /app#/projects/<id>: move them to /app/projects/<id>.
  useEffect(() => {
    if (pathname === '/app' && hash.startsWith('#/')) navigate('/app' + hash.slice(1).split('?')[0], { replace: true });
  }, [pathname, hash, navigate]);

  // Signing out also clears the session; don't send that person to /login on the way home.
  const leaving = useRef(false);
  useEffect(() => {
    if (session.isSuccess && !session.data && !leaving.current) window.location.replace('/login?next=' + encodeURIComponent(pathname + window.location.search + hash));
  }, [session.isSuccess, session.data, pathname, hash]);

  // First visit: onboarding. "undefined" means the column isn't there yet (migration not applied).
  useEffect(() => {
    const p = profile.data;
    if (p && p.onboarded_at === null && pathname !== '/app/welcome') navigate('/app/welcome', { replace: true });
  }, [profile.data, pathname, navigate]);

  // The profile's language, country, time zone and currency follow the account to any device.
  const { setLocale } = usePrefs();
  const synced = useRef(false);
  useEffect(() => {
    const p = profile.data;
    if (!p || synced.current) return;
    synced.current = true;
    setLocale({ language: p.lang, currency: p.currency as Currency, ...(p.country ? { country: p.country } : {}), ...(p.time_zone ? { timeZone: p.time_zone } : {}) });
  }, [profile.data, setLocale]);

  // Hovering or focusing a nav item loads its data before the click.
  const prefetch = (to: string) => () => {
    if (to === '/app') { void qc.prefetchQuery({ queryKey: keys.documents, queryFn: listDocuments }); void qc.prefetchQuery({ queryKey: keys.payments, queryFn: listPayments }); void qc.prefetchQuery({ queryKey: keys.activity(12), queryFn: () => listActivity(12) }); }
    void qc.prefetchQuery({ queryKey: keys.projects, queryFn: listProjects });
    void qc.prefetchQuery({ queryKey: keys.clients, queryFn: listClients });
  };

  if (!user || profile.isPending) {
    return <div className="app-loading" role="status" aria-label={t('states.loading')}><Spinner size={28} /></div>;
  }
  const name = profile.data?.name || user.email || '';
  const account = (
    <Menu
      trigger={(p) => (
        <button type="button" {...p} className="app-account" aria-label={t('app.nav.account')}>
          <span className="app-avatar" aria-hidden="true">{(name[0] || '?').toUpperCase()}</span>
          <span className="app-account-text"><b>{profile.data?.business_name || profile.data?.name || t('app.nav.account')}</b><small>{user.email}</small></span>
        </button>
      )}
      align="start"
      items={[
        { label: t('app.nav.settings'), icon: 'settings', onSelect: () => navigate('/app/settings') },
        { label: t('app.nav.signOut'), icon: 'logout', onSelect: () => { leaving.current = true; void signOut().then(() => { qc.clear(); window.location.assign('/'); }); } },
      ]}
    />
  );

  // Onboarding gets the whole screen.
  if (pathname === '/app/welcome') return <main id="main" className="app-solo"><Outlet context={{ user, profile: profile.data }} /></main>;

  return (
    <div className="app">
      <aside className="app-side" aria-label={t('app.nav.main')}>
        <AppLink to="/" className="app-logo"><Logo size={28} /></AppLink>
        <ButtonLink to="/new" icon="plus" block>{t('app.nav.newScope')}</ButtonLink>
        <nav className="app-nav" aria-label={t('app.nav.main')}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onMouseEnter={prefetch(n.to)} onFocus={prefetch(n.to)}>
              <Icon name={n.icon} size={20} />{t(`app.nav.${n.key}`)}
            </NavLink>
          ))}
          <AppLink to="/estimate"><Icon name="spark" size={20} />{t('app.nav.estimate')}</AppLink>
        </nav>
        <div className="app-side-foot">{account}</div>
      </aside>

      <header className="app-top">
        <AppLink to="/app" className="app-logo"><Logo size={26} /></AppLink>
        <IconButton icon="spark" label={t('app.nav.estimate')} onClick={() => window.location.assign('/estimate')} />
        {account}
      </header>

      <main id="main" className="app-main" tabIndex={-1}>
        <Outlet context={{ user, profile: profile.data }} />
      </main>

      <nav className="app-tabs" aria-label={t('app.nav.main')}>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onTouchStart={prefetch(n.to)}>
            <Icon name={n.icon} size={22} /><span>{t(`app.nav.${n.key}`)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
