import { useEffect, useState } from 'react';
import { Link, useRouter } from '../router.jsx';
import WallpaperCard from '../components/WallpaperCard.jsx';
import SkeletonCard from '../components/SkeletonCard.jsx';
import { useAuth } from '../auth.jsx';
import { fetchWallpapers } from '../api.js';
import { btnPrimary, shell } from '../ui.js';

const FAVORITES_LIMIT = 48;

export default function FavouritesPage({
  onDownload,
  downloading,
  isFavorite,
  onToggleFavorite,
  onSignIn,
}) {
  const { navigate } = useRouter();
  const { user, favorites, favoritesReady, favoritesError } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const key = [...favorites].sort().join(',');

  useEffect(() => {
    if (!user || !favoritesReady) {
      setItems([]);
      setLoading(false);
      return undefined;
    }
    if (!key) {
      setItems([]);
      setLoading(false);
      setError('');
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError('');

    fetchWallpapers({ ids: key.split(','), limit: FAVORITES_LIMIT }, controller.signal)
      .then((data) => {
        if (active) setItems(data.items);
      })
      .catch((err) => {
        if (!active || err.name === 'AbortError') return;
        setError(err.message);
        setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [user, favoritesReady, key]);

  return (
    <main className="flex-1">
      <div className={`${shell} page-enter py-14`}>
        <header className="max-w-2xl">
          <p className="eyebrow">Your library</p>
          <h1 className="page-title mt-3">Favourites</h1>
          <p className="page-lede">
            {user
              ? 'Every wallpaper you saved, kept with your account.'
              : 'Sign in and the heart on any wallpaper keeps it here.'}
          </p>
        </header>

        {favoritesError && (
          <div
            className="mt-6 rounded-lg border border-danger-line bg-danger-bg px-4 py-3 text-[13px] text-danger"
            role="alert"
          >
            <p className="font-medium">Favourites are not available</p>
            <p className="mt-0.5">{favoritesError}</p>
          </div>
        )}

        {!user && (
          <div className="empty-state mt-10">
            <i className="fa-regular fa-heart text-[18px] text-ink-3" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[24px]">Sign in to save wallpapers</h2>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-2">
              Your saved wallpapers follow your account, not this browser.
            </p>
            <button type="button" className={`${btnPrimary} mt-5`} onClick={onSignIn}>
              Sign in or create an account
            </button>
          </div>
        )}

        {user && (loading || !favoritesReady) && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        )}

        {user && error && (
          <div
            className="mt-6 rounded-lg border border-danger-line bg-danger-bg px-4 py-3 text-[13px] text-danger"
            role="alert"
          >
            <p className="font-medium">Could not load your favourites</p>
            <p className="mt-0.5">{error}</p>
          </div>
        )}

        {user && favoritesReady && !loading && !error && items.length === 0 && (
          <div className="empty-state mt-10">
            <i className="fa-regular fa-heart text-[18px] text-ink-3" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[24px]">No favourites yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-2">
              Tap the heart on any wallpaper and it shows up here.
            </p>
            <Link className={`${btnPrimary} mt-5`} to="/">
              Browse the archive
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <WallpaperCard
                key={item.slug}
                item={item}
                onOpen={(picked) => navigate(`/w/${encodeURIComponent(picked.slug)}`)}
                onDownload={onDownload}
                downloading={downloading}
                isFavorite={isFavorite(item.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
