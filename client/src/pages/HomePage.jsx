import { useCallback, useEffect, useState } from 'react';
import { Link } from '../router.jsx';
import Hero from '../components/Hero.jsx';
import FilterChips from '../components/FilterChips.jsx';
import WallpaperCard from '../components/WallpaperCard.jsx';
import WallpaperModal from '../components/WallpaperModal.jsx';
import SkeletonCard from '../components/SkeletonCard.jsx';
import DeviceRails from '../components/DeviceRails.jsx';
import RecentlyViewed from '../components/RecentlyViewed.jsx';
import { useAuth } from '../auth.jsx';
import { fetchRandom, fetchWallpapers } from '../api.js';
import { btnGhost, shell } from '../ui.js';

const PAGE_SIZE = 12;

const PROMISES = [
  {
    title: 'Original resolution',
    body: 'Every download is the untouched JPEG at full size, with no re-compression.',
  },
  {
    title: 'No watermark',
    body: 'Nothing branded sits over your desktop and nothing hides behind a paywall.',
  },
  {
    title: 'Free to keep',
    body: 'Use them on personal and work desktops, with no attribution required.',
  },
  {
    title: 'Favourites sync',
    body: 'Sign in once and the wallpapers you save follow you between devices.',
  },
];

export default function HomePage({
  query,
  device = '',
  initialCategory = 'All',
  onDownload,
  downloading,
  isFavorite,
  onToggleFavorite,
  onSearch,
  onNotify,
  settings,
  requiresSignIn = true,
}) {
  const { favorites } = useAuth();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [slides, setSlides] = useState([]);

  const [category, setCategory] = useState(initialCategory);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sort, setSort] = useState('trending');

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const [surpriseLoading, setSurpriseLoading] = useState(false);

  useEffect(() => {
    setCategory(initialCategory || 'All');
  }, [initialCategory, device]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError('');

    fetchWallpapers(
      { category, q: debouncedQuery, sort, device, page: 1, limit: PAGE_SIZE },
      controller.signal,
    )
      .then((data) => {
        if (!active) return;
        setItems(data.items);
        setTotal(data.total);
        setPages(data.pages);
        setPage(data.page);
        setCategories(data.categories ?? []);
        setStats(data.stats ?? null);
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
  }, [category, debouncedQuery, sort, device]);

  useEffect(() => {
    let alive = true;
    fetchWallpapers({ sort: 'trending', limit: 7 })
      .then((data) => alive && setSlides(data.items ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= pages) return;
    setLoadingMore(true);
    try {
      const data = await fetchWallpapers({
        category,
        q: debouncedQuery,
        sort,
        device,
        page: page + 1,
        limit: PAGE_SIZE,
      });
      setItems((previous) => {
        const seen = new Set(previous.map((item) => item.slug));
        return [...previous, ...data.items.filter((item) => !seen.has(item.slug))];
      });
      setPage(data.page);
      setPages(data.pages);
    } catch (err) {
      onNotify(`Could not load more: ${err.message}`);
    } finally {
      setLoadingMore(false);
    }
  }, [category, debouncedQuery, device, loadingMore, onNotify, page, pages, sort]);

  const handleDownload = useCallback(
    async (item) => {
      const downloads = await onDownload(item);
      if (downloads == null) return;
      setItems((previous) =>
        previous.map((entry) => (entry.slug === item.slug ? { ...entry, downloads } : entry)),
      );
      setSelected((previous) =>
        previous && previous.slug === item.slug ? { ...previous, downloads } : previous,
      );
      setSlides((previous) =>
        previous.map((slide) =>
          slide.slug === item.slug ? { ...slide, downloads } : slide,
        ),
      );
    },
    [onDownload],
  );

  const handleSurprise = useCallback(async () => {
    setSurpriseLoading(true);
    try {
      const item = await fetchRandom(category);
      setSelected(item);
      onNotify(`Shuffle: ${item.title}`);
    } catch (err) {
      onNotify(`Could not pick a wallpaper: ${err.message}`);
    } finally {
      setSurpriseLoading(false);
    }
  }, [category, onNotify]);

  const browse = () => {
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectedIndex = selected ? items.findIndex((entry) => entry.slug === selected.slug) : -1;

  const moveSelection = useCallback(
    (direction) => {
      if (selectedIndex < 0 || items.length < 2) return;
      const next = items[(selectedIndex + direction + items.length) % items.length];
      if (next) setSelected(next);
    },
    [items, selectedIndex],
  );

  const filtered = category !== 'All' || debouncedQuery.trim() !== '';
  const deviceLabel = device === 'mobile' ? 'Phone' : device === 'tablet' ? 'Tablet' : 'Desktop';
  const heading = debouncedQuery.trim()
    ? 'Search results'
    : category !== 'All'
      ? category
      : device
        ? `${deviceLabel} wallpapers`
        : 'All wallpapers';
  const countLabel = loading
    ? 'Loading wallpapers'
    : `${total} wallpaper${total === 1 ? '' : 's'}${filtered ? ' match your filters' : ' in the archive'}`;

  return (
    <>
      <Hero
        slides={slides}
        stats={stats}
        kicker={settings?.heroKicker}
        heading={settings?.tagline}
        body={settings?.heroBody}
        onBrowse={browse}
        onSurprise={handleSurprise}
        surpriseLoading={surpriseLoading}
      />

      {!device && categories.length > 1 && (
        <section className={`${shell} pt-12`} aria-label="Browse by collection">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Collections</p>
              <h2 className="section-title mt-2">Browse by collection</h2>
            </div>
            <Link to="/categories" className="link-more">
              All collections
              <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" />
            </Link>
          </div>

          <div className="stagger mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {categories.slice(0, 6).map((name) => (
              <Link
                key={name}
                to={`/c/${encodeURIComponent(name)}`}
                className="surface surface-hover flex h-12 items-center justify-between gap-2 rounded-lg px-3.5 text-[12.5px]"
              >
                {name}
                <i className="fa-solid fa-arrow-right text-[10px] text-ink-3" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={`${shell} py-12`} id="collection">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Archive</p>
            <h2 className="mt-2 font-display text-[clamp(2rem,4vw,2.9rem)] leading-[0.95] tracking-[-0.02em]">
              {heading}
            </h2>
            <p className="meta mt-2" aria-live="polite">
              {countLabel}
            </p>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-ink-3">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="h-9 rounded-[10px] border border-line bg-panel pl-3 pr-8 text-[12.5px] text-ink transition-colors focus:border-line-2 focus:outline-none"
            >
              <option value="trending">Most downloaded</option>
              <option value="newest">Newest first</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <FilterChips
            categories={categories}
            value={category}
            onChange={setCategory}
            disabled={loading && items.length === 0}
          />

          <Link
            to="/favourites"
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-panel/50 px-3 text-[12px] text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
          >
            <i className="fa-regular fa-heart text-[11px]" aria-hidden="true" />
            Favourites
            {favorites.size > 0 && (
              <span className="tabular-nums text-ink-3">{favorites.size}</span>
            )}
          </Link>
        </div>

        {error && (
          <div
            className="mt-5 rounded-lg border border-danger-line bg-danger-bg px-4 py-3 text-[13px] text-danger"
            role="alert"
          >
            <p className="font-medium">Could not reach the wallpaper API</p>
            <p className="mt-0.5">{error}</p>
            <p className="mt-1 text-[12px] opacity-80">Start the Node server with npm run dev.</p>
          </div>
        )}

        {loading && items.length === 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="empty-state mt-6">
            <i className="fa-solid fa-magnifying-glass text-[18px] text-ink-3" aria-hidden="true" />
            <h3 className="mt-3 font-display text-[22px]">Nothing matches</h3>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-2">
              {filtered
                ? 'Try another search or clear the collection filter.'
                : 'The archive is empty. Add wallpapers to Supabase to fill it.'}
            </p>
            {filtered && (
              <button
                type="button"
                className={`${btnGhost} mt-5`}
                onClick={() => {
                  onSearch('');
                  setCategory('All');
                }}
              >
                Reset filters
                <i className="fa-solid fa-rotate-left text-[11px]" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {items.length > 0 && (
          <div
            className={`mt-6 grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
              loading ? 'opacity-60' : ''
            }`}
          >
            {items.map((item) => (
              <WallpaperCard
                key={item.slug}
                item={item}
                portrait={Boolean(device) && device !== 'desktop'}
                onOpen={setSelected}
                onDownload={handleDownload}
                downloading={downloading}
                isFavorite={isFavorite(item.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        )}

        {!loading && page < pages && (
          <div className="mt-8 flex justify-center">
            <button type="button" className={btnGhost} onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading' : 'Load more'}
              <i className="fa-solid fa-arrow-down text-[11px]" aria-hidden="true" />
            </button>
          </div>
        )}
      </section>

      {!device && !filtered && (
        <DeviceRails
          onOpen={setSelected}
          onDownload={handleDownload}
          downloading={downloading}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
        />
      )}

      {!device && !filtered && (
        <RecentlyViewed
          onOpen={setSelected}
          onDownload={handleDownload}
          downloading={downloading}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
        />
      )}

      <section className={`${shell} pb-16`} aria-label="What you get">
        <div className="grid gap-3 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map((promise, index) => (
            <article className="surface p-5" key={promise.title}>
              <span className="text-[10.5px] tabular-nums tracking-[0.16em] text-ink-3">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-2 text-[13px] font-medium">{promise.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">{promise.body}</p>
            </article>
          ))}
        </div>
      </section>

      {selected && (
        <WallpaperModal
          item={selected}
          requiresSignIn={requiresSignIn}
          onClose={() => setSelected(null)}
          onDownload={handleDownload}
          downloading={downloading}
          isFavorite={isFavorite(selected.id)}
          onToggleFavorite={onToggleFavorite}
          position={selectedIndex}
          total={items.length}
          onPrev={() => moveSelection(-1)}
          onNext={() => moveSelection(1)}
          onTagSelect={(tag) => {
            setSelected(null);
            onSearch(tag);
            setCategory('All');
            browse();
          }}
        />
      )}
    </>
  );
}
