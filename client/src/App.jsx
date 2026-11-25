import { useCallback, useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import AuthDialog from './components/AuthDialog.jsx';
import ShortcutsDialog from './components/ShortcutsDialog.jsx';
import HomePage from './pages/HomePage.jsx';
import DetailPage from './pages/DetailPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import FavouritesPage from './pages/FavouritesPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import DevicesPage from './pages/DevicesPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import DownloadsPage from './pages/DownloadsPage.jsx';
import AuthCallbackPage from './pages/AuthCallbackPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import AdminApp from './admin/AdminApp.jsx';
import { recordDownload } from './history.js';
import { useTheme } from './theme.jsx';
import { matchRoute, useRouter } from './router.jsx';
import { useAuth } from './auth.jsx';
import { downloadWallpaper, fetchCategories, fetchSettings } from './api.js';

export default function App() {
  const { path, navigate } = useRouter();
  const route = matchRoute(path);
  const { user, favorites, toggleFavorite } = useAuth();
  const { cycleTheme, setDefaultTheme } = useTheme();

  const [query, setQuery] = useState('');
  const [source, setSource] = useState('demo');
  const [stats, setStats] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [notice, setNotice] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState('');
  const [settings, setSettings] = useState(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Older share links used `?w=<slug>`; keep them working as real page URLs.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('w');
    if (slug) navigate(`/w/${encodeURIComponent(slug)}`, { replace: true });
  }, [navigate]);

  useEffect(() => {
    let active = true;
    fetchSettings()
      .then((data) => {
        if (active) setSettings(data.settings ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // The site owner's default theme applies only until a visitor picks their own.
  useEffect(() => {
    const preferred = settings?.themeDefault;
    if (preferred && preferred !== 'auto') setDefaultTheme(preferred);
  }, [setDefaultTheme, settings?.themeDefault]);

  useEffect(() => {
    let active = true;
    fetchCategories()
      .then((data) => {
        if (!active) return;
        setStats(data.stats ?? null);
        setSource(data.source ?? 'demo');
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [path]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  // Keyboard: / or Cmd/Ctrl+K focuses search, T cycles the theme.
  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        window.dispatchEvent(new Event('pixelfall:focus-search'));
        return;
      }

      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === '?') {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        window.dispatchEvent(new Event('pixelfall:focus-search'));
        return;
      }

      if (event.key === 't' || event.key === 'T') cycleTheme();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cycleTheme]);

  const notify = useCallback((message) => setNotice(message), []);

  const openAuth = useCallback((reason = '') => {
    setAuthReason(reason);
    setAuthOpen(true);
  }, []);

  const requiresSignIn = settings?.downloadsRequireSignIn !== false;

  const handleDownload = useCallback(
    async (item) => {
      if (!user && requiresSignIn) {
        openAuth('Sign in with Google to download original wallpapers. Browsing stays free.');
        return null;
      }
      setDownloading(item.slug);
      try {
        const data = await downloadWallpaper(item.slug);
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = `${item.slug}.jpg`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        recordDownload(user?.id ?? null, item);
        setNotice(`Downloading ${item.title}`);
        return data.downloads;
      } catch (err) {
        setNotice(`Download failed: ${err.message}`);
        return null;
      } finally {
        setDownloading(null);
      }
    },
    [openAuth, requiresSignIn, user],
  );

  const handleFavorite = useCallback(
    async (item) => {
      if (!user) {
        openAuth('Sign in to save wallpapers to your own collection.');
        return;
      }
      const wasSaved = favorites.has(item.id);
      try {
        await toggleFavorite(item.id);
        setNotice(
          wasSaved ? `Removed “${item.title}” from favourites` : `Saved “${item.title}”`,
        );
      } catch (err) {
        setNotice(err.message);
      }
    },
    [favorites, openAuth, toggleFavorite, user],
  );

  const handleQuery = (value) => {
    setQuery(value);
    if (route.page !== 'home') navigate('/');
  };

  if (route.page === 'admin') {
    return <AdminApp section={route.section ?? 'dashboard'} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {settings?.announcement && (
        <div className="border-b border-line bg-raised/70 px-5 py-2 text-center text-[12.5px] text-ink-2 backdrop-blur">
          {settings.announcement}
          {settings.announcementLink && (
            <a
              href={settings.announcementLink}
              target={/^https?:\/\//i.test(settings.announcementLink) ? '_blank' : undefined}
              rel="noreferrer"
              className="ml-2 inline-flex items-center gap-1 underline underline-offset-2 transition-colors hover:text-ink"
            >
              {settings.announcementLabel || 'Read more'}
              <i className="fa-solid fa-arrow-right text-[9px]" aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      <Header
        query={query}
        onQuery={handleQuery}
        source={source}
        siteName={settings?.siteName}
        logoLetter={settings?.logoLetter}
        onSignIn={() => openAuth()}
      />

      {route.page === 'home' && (
        <HomePage
          key={route.device ?? route.category ?? 'all'}
          query={query}
          device={route.device ?? ''}
          initialCategory={route.category ?? 'All'}
          onDownload={handleDownload}
          downloading={downloading}
          isFavorite={(id) => favorites.has(id)}
          onToggleFavorite={handleFavorite}
          onSearch={setQuery}
          onNotify={notify}
          settings={settings}
          requiresSignIn={requiresSignIn}
        />
      )}

      {route.page === 'detail' && (
        <DetailPage
          key={route.slug}
          slug={route.slug}
          requiresSignIn={requiresSignIn}
          onDownload={handleDownload}
          downloading={downloading}
          isFavorite={(id) => favorites.has(id)}
          onToggleFavorite={handleFavorite}
          onSearch={setQuery}
        />
      )}

      {route.page === 'devices' && <DevicesPage />}

      {route.page === 'categories' && <CategoriesPage />}

      {route.page === 'favourites' && (
        <FavouritesPage
          onDownload={handleDownload}
          downloading={downloading}
          isFavorite={(id) => favorites.has(id)}
          onToggleFavorite={handleFavorite}
          onSignIn={() => openAuth('Sign in to see the wallpapers you have saved.')}
        />
      )}

      {route.page === 'profile' && <ProfilePage onSignIn={() => openAuth()} />}

      {route.page === 'downloads' && (
        <DownloadsPage
          onDownload={handleDownload}
          downloading={downloading}
          onNotify={notify}
          onSignIn={() => openAuth('Sign in with Google to keep favourites with your account.')}
        />
      )}

      {route.page === 'auth-callback' && <AuthCallbackPage />}

      {route.page === 'about' && <AboutPage stats={stats} />}

      {route.page === 'contact' && <ContactPage settings={settings} />}

      {route.page === 'notfound' && <NotFoundPage />}

      <Footer
        stats={stats}
        siteName={settings?.siteName}
        logoLetter={settings?.logoLetter}
        note={settings?.footerNote}
        onShortcuts={() => setShortcutsOpen(true)}
      />

      {authOpen && (
        <AuthDialog
          reason={authReason}
          onClose={() => {
            setAuthOpen(false);
            setAuthReason('');
          }}
        />
      )}

      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}

      {notice && (
        <div
          className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full border border-line-2 bg-panel/95 px-5 py-2.5 text-[13px] text-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,0.95)] backdrop-blur"
          role="status"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
