import { useEffect, useState } from 'react';
import { Link } from '../router.jsx';
import WallpaperCard from './WallpaperCard.jsx';
import { fetchWallpapers } from '../api.js';
import { shell } from '../ui.js';

const RAILS = [
  {
    key: 'mobile',
    label: 'For phones',
    copy: '9:16 originals cut for a phone screen.',
  },
  {
    key: 'tablet',
    label: 'For tablets',
    copy: '3:4 originals sized for tablet displays.',
  },
];

export default function DeviceRails({
  onOpen,
  onDownload,
  downloading,
  isFavorite,
  onToggleFavorite,
}) {
  const [items, setItems] = useState({ mobile: [], tablet: [] });

  useEffect(() => {
    let active = true;
    Promise.all(
      RAILS.map((rail) =>
        fetchWallpapers({ device: rail.key, limit: 4, sort: 'newest' }).then((data) => [
          rail.key,
          data.items,
        ]),
      ),
    )
      .then((results) => {
        if (active) setItems(Object.fromEntries(results));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (items.mobile.length === 0 && items.tablet.length === 0) return null;

  return (
    <div className="pb-4">
      {RAILS.map((rail) => {
        const list = items[rail.key] ?? [];
        if (list.length === 0) return null;
        return (
          <section className={`${shell} pt-8`} key={rail.key} aria-label={rail.label}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Screens</p>
                <h2 className="mt-2 font-display text-[28px] leading-none tracking-[-0.01em]">
                  {rail.label}
                </h2>
                <p className="mt-2 text-[12.5px] text-ink-3">{rail.copy}</p>
              </div>
              <Link
                to={`/d/${rail.key}`}
                className="text-[12px] text-ink-2 transition-colors hover:text-ink"
              >
                All {rail.label.toLowerCase()}
                <i className="fa-solid fa-arrow-right ml-1.5 text-[10px]" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((item) => (
                <WallpaperCard
                  key={item.slug}
                  item={item}
                  portrait
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
      })}
    </div>
  );
}
