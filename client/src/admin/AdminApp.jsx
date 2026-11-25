import { useEffect, useState } from 'react';
import { Link, useRouter } from '../router.jsx';
import { adminRequest } from './api.js';
import AdminLogin from './AdminLogin.jsx';
import Dashboard from './Dashboard.jsx';
import WallpapersAdmin from './WallpapersAdmin.jsx';
import MessagesAdmin from './MessagesAdmin.jsx';
import SettingsAdmin from './SettingsAdmin.jsx';
import UsersAdmin from './UsersAdmin.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

const NAV = [
  { key: 'dashboard', to: '/admin', label: 'Dashboard', icon: 'fa-gauge-high' },
  { key: 'wallpapers', to: '/admin/wallpapers', label: 'Wallpapers', icon: 'fa-images' },
  { key: 'messages', to: '/admin/messages', label: 'Requests', icon: 'fa-inbox' },
  { key: 'users', to: '/admin/users', label: 'Users', icon: 'fa-user-group' },
  { key: 'settings', to: '/admin/settings', label: 'Site settings', icon: 'fa-sliders' },
];

const TITLES = {
  dashboard: 'Dashboard',
  wallpapers: 'Wallpapers',
  messages: 'Visitor requests',
  users: 'Accounts',
  settings: 'Site settings',
};

export default function AdminApp({ section }) {
  const { navigate } = useRouter();
  const [session, setSession] = useState({ loading: true, authenticated: false, email: '' });
  const [newRequests, setNewRequests] = useState(0);
  const [brand, setBrand] = useState({ siteName: 'Pixelfall', logoLetter: '' });

  useEffect(() => {
    let active = true;
    adminRequest('/session')
      .then((data) => {
        if (active) setSession({ loading: false, ...data });
      })
      .catch(() => {
        if (active) setSession({ loading: false, authenticated: false, email: '' });
      });
    return () => {
      active = false;
    };
  }, []);

  // Reflect the saved site name and logo letter in the admin shell.
  useEffect(() => {
    let active = true;
    fetch('/api/settings')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active || !data?.settings) return;
        setBrand({
          siteName: data.settings.siteName || 'Pixelfall',
          logoLetter: data.settings.logoLetter || '',
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session.authenticated) return undefined;
    let active = true;
    adminRequest('/overview')
      .then((data) => {
        if (active) setNewRequests(data.totals?.newRequests ?? 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session.authenticated, section]);

  const handleLogin = (data) => {
    setSession({ loading: false, authenticated: true, email: data.email });
    navigate('/admin', { replace: true });
  };

  const logout = async () => {
    await adminRequest('/logout', { method: 'POST' }).catch(() => {});
    setSession({ loading: false, authenticated: false, email: '' });
    navigate('/admin/login', { replace: true });
  };

  if (session.loading) {
    return (
      <div className="grid min-h-screen place-items-center text-[13px] text-ink-3">
        Checking your session…
      </div>
    );
  }

  if (!session.authenticated) {
    return <AdminLogin onSuccess={handleLogin} />;
  }

  const active = section === 'login' ? 'dashboard' : section;
  const siteName = brand.siteName.trim() || 'Pixelfall';
  const mark = (String(brand.logoLetter).trim() || siteName).charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-line bg-panel/50 px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-[238px] lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
          <Link to="/admin" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-ink font-display text-[19px] leading-none text-paper">
              {mark}
            </span>
            <span>
              <span className="block font-display text-[20px] leading-none">{siteName}</span>
              <span className="mt-1 block text-[10.5px] uppercase tracking-[0.16em] text-ink-3">
                Admin studio
              </span>
            </span>
          </Link>

          <nav
            className="mt-5 flex gap-1 overflow-x-auto pb-1 lg:mt-7 lg:flex-col lg:overflow-visible lg:pb-0"
            aria-label="Admin"
          >
            {NAV.map((entry) => {
              const isActive = active === entry.key;
              return (
                <Link
                  key={entry.key}
                  to={entry.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] transition-colors ${
                    isActive
                      ? 'bg-raised text-ink'
                      : 'text-ink-2 hover:bg-raised/60 hover:text-ink'
                  }`}
                >
                  <i className={`fa-solid ${entry.icon} w-3.5 text-center text-[11px] text-ink-3`} aria-hidden="true" />
                  {entry.label}
                  {entry.key === 'messages' && newRequests > 0 && (
                    <span className="ml-auto rounded-full bg-amber px-1.5 text-[10.5px] font-medium text-paper">
                      {newRequests}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 hidden flex-col gap-2 border-t border-line pt-4 lg:mt-auto lg:flex">
            <span className="truncate text-[12px] text-ink-2">{session.email}</span>
            <Link to="/" className="text-[12px] text-ink-3 transition-colors hover:text-ink">
              View public site
              <i className="fa-solid fa-arrow-up-right-from-square ml-1.5 text-[10px]" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={logout}
              className="text-left text-[12px] text-ink-3 transition-colors hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-3">Admin</p>
              <h1 className="mt-1 font-display text-[30px] leading-none tracking-[-0.01em]">
                {TITLES[active] ?? 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link to="/" className="hidden text-[12px] text-ink-3 transition-colors hover:text-ink sm:inline">
                View site
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-ink-2 transition-colors hover:border-line-2 hover:text-ink lg:hidden"
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="mt-6">
            {active === 'dashboard' && <Dashboard />}
            {active === 'wallpapers' && <WallpapersAdmin />}
            {active === 'messages' && <MessagesAdmin />}
            {active === 'users' && <UsersAdmin />}
            {active === 'settings' && <SettingsAdmin />}
          </div>
        </main>
      </div>
    </div>
  );
}
