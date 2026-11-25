import { useEffect, useState } from 'react';
import { Link } from '../router.jsx';
import WallpaperCard from './WallpaperCard.jsx';
import { useAuth } from '../auth.jsx';
import { getViewed } from '../history.js';
import { fetchWallpapers } from '../api.js';
import { shell } from '../ui.js';

export default function RecentlyViewed({
  onOpen,
  onDownload,
  downloading,
  isFavorite,
  onToggleFavorite,
}) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;

    const load = () => {
      const ids = getViewed(user?.id)
        .map((entry) => entry.id)
        .filter(Boolean)
        .slice(0, 4);
      if (ids.length === 0) {
        setItems([]);
        return;
      }
      fetchWallpapers({ ids, limit: ids.length })
        .then((data) => {
          if (active) setItems(data.items ?? []);
        })
        .catch(() => {});
    };

    load();
    window.addEventListener('pixelfall:viewed', load);
    return () => {
      active = false;
      window.removeEventListener('pixelfall:viewed', load);
    };
  }, [user?.id]);

  if (items.length === 0) return null;

  return (
    <section className={`${shell} pt-10`} aria-label="Recently viewed">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">History</p>
          <h2 className="mt-2 font-display text-[28px] leading-none tracking-[-0.01em]">
            Recently viewed
          </h2>
          <p className="mt-2 text-[12.5px] text-ink-3">Pick up where you left off.</p>
        </div>
        <Link to="/downloads" className="text-[12px] text-ink-2 transition-colors hover:text-ink">
          Downloads
          <i className="fa-solid fa-arrow-right ml-1.5 text-[10px]" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <WallpaperCard
            key={item.slug}
            item={item}
            onOpen={onOpen}
            onDownload={onDownload}
            downloading={downloading}
            isFavorite={isFavorite(item.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </section>
  );
}
