import { useEffect, useState } from 'react';
import { Link } from '../router.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { fetchWallpapers } from '../api.js';
import { shell } from '../ui.js';

const DEVICES = [
  { key: 'desktop', label: 'Desktop', note: '16:9 originals for monitors' },
  { key: 'tablet', label: 'Tablet', note: '3:4 originals for tablets' },
  { key: 'mobile', label: 'Mobile', note: '9:16 originals for phones' },
];

export default function DevicesPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [cards, setCards] = useState([]);

  useEffect(() => {
    let active = true;

    Promise.all(
      DEVICES.map((device) =>
        fetchWallpapers({ device: device.key, limit: 1, sort: 'trending' })
          .then((data) => ({ ...device, cover: data.items[0] ?? null, total: data.total }))
          .catch(() => ({ ...device, cover: null, total: 0 })),
      ),
    )
      .then((results) => {
        if (!active) return;
        setCards(results);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex-1">
      <div className={`${shell} page-enter page-wrap`}>
        <PageHeader
          eyebrow="Screens"
          title="Devices"
          lede="The archive is filed by screen shape as well as mood. Pick the screen you are setting and every file will already fit it."
        />

        {status === 'error' && (
          <div
            className="mt-8 rounded-lg border border-danger-line bg-danger-bg px-4 py-3 text-[13px] text-danger"
            role="alert"
          >
            <p className="font-medium">Could not load devices</p>
            <p className="mt-0.5">{error}</p>
          </div>
        )}

        {status === 'loading' && (
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {DEVICES.map((device) => (
              <div
                key={device.key}
                className="skeleton aspect-[4/3] rounded-2xl border border-line"
                aria-hidden="true"
              />
            ))}
          </div>
        )}

        {status === 'ready' && (
          <div className="stagger mt-10 grid gap-4 sm:grid-cols-3">
            {cards.map((card) => (
              <Link
                key={card.key}
                to={`/d/${card.key}`}
                className="surface surface-hover group overflow-hidden rounded-2xl"
              >
                <div className="grid h-48 place-items-center border-b border-line bg-raised/30 p-5">
                  {card.cover?.thumbUrl ? (
                    <img
                      src={card.cover.thumbUrl}
                      alt=""
                      loading="lazy"
                      className="max-h-36 max-w-full rounded-lg border border-line object-contain transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    />
                  ) : (
                    <i className="fa-regular fa-image text-[18px] text-ink-3" aria-hidden="true" />
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-[14px] font-medium">{card.label}</p>
                    <p className="mt-0.5 text-[12px] tabular-nums text-ink-3">
                      {card.cover ? `${card.cover.width} × ${card.cover.height}` : '—'}
                      <span className="mx-1.5 text-ink-3/70" aria-hidden="true">
                        ·
                      </span>
                      {card.total} wallpaper{card.total === 1 ? '' : 's'}
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
