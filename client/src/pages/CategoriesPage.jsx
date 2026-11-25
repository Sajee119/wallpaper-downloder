import { useEffect, useState } from 'react';
import { Link } from '../router.jsx';
import SkeletonCard from '../components/SkeletonCard.jsx';
import { fetchCategories, fetchWallpapers } from '../api.js';
import { shell } from '../ui.js';

export default function CategoriesPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const overview = await fetchCategories();
        if (!active) return;
        setStats(overview.stats ?? null);

        const details = await Promise.all(
          (overview.categories ?? []).map(async (name) => {
            try {
              const result = await fetchWallpapers({ category: name, limit: 1, sort: 'trending' });
              return { name, cover: result.items[0] ?? null, total: result.total };
            } catch {
              return { name, cover: null, total: 0 };
            }
          }),
        );

        if (!active) return;
        setCards(details);
        setStatus('ready');
      } catch (err) {
        if (!active) return;
        setError(err.message);
        setStatus('error');
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex-1">
      <div className={`${shell} page-enter py-14`}>
        <header className="max-w-2xl">
          <p className="eyebrow">Archive</p>
          <h1 className="page-title mt-3">Collections</h1>
          <p className="page-lede">
            Every wallpaper is filed under one mood.
            {stats
              ? ` ${stats.wallpapers} wallpapers across ${stats.categories} collections.`
              : ''}
          </p>
        </header>

        {status === 'loading' && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div
            className="mt-8 rounded-lg border border-danger-line bg-danger-bg px-4 py-3 text-[13px] text-danger"
            role="alert"
          >
            <p className="font-medium">Could not load collections</p>
            <p className="mt-0.5">{error}</p>
            <p className="mt-1 text-[12px] opacity-80">Start the Node server with npm run dev.</p>
          </div>
        )}

        {status === 'ready' && cards.length === 0 && (
          <div className="empty-state mt-10">
            <i className="fa-solid fa-layer-group text-[18px] text-ink-3" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[22px]">No collections yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-2">
              Add wallpapers to the catalog and their collections appear here.
            </p>
            <Link className="mt-5 inline-flex text-[13px] text-ink underline" to="/">
              Back to the archive
            </Link>
          </div>
        )}

        {cards.length > 0 && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map(({ name, cover, total }) => (
              <Link
                key={name}
                to={`/c/${encodeURIComponent(name)}`}
                className="surface surface-hover group overflow-hidden rounded-2xl"
              >
                {cover?.thumbUrl ? (
                  <img
                    src={cover.thumbUrl}
                    alt=""
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="block aspect-[16/10] w-full bg-raised" aria-hidden="true" />
                )}
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-[14px] font-medium">{name}</p>
                    <p className="mt-0.5 text-[12px] tabular-nums text-ink-3">
                      {total} wallpaper{total === 1 ? '' : 's'}
                    </p>
                  </div>
                  <i
                    className="fa-solid fa-arrow-right text-[11px] text-ink-3 transition-colors group-hover:text-ink"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
