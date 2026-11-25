import { useEffect, useState } from 'react';
import { Link } from '../router.jsx';
import { adminRequest } from './api.js';
import { card } from './ui.js';
import { formatCount } from '../utils.js';

const STATS = [
  { key: 'wallpapers', label: 'Wallpapers', icon: 'fa-images' },
  { key: 'published', label: 'Published', icon: 'fa-eye' },
  { key: 'downloads', label: 'Downloads', icon: 'fa-download', format: 'count' },
  { key: 'categories', label: 'Collections', icon: 'fa-layer-group' },
  { key: 'newRequests', label: 'New requests', icon: 'fa-inbox' },
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    adminRequest('/overview')
      .then((payload) => active && setData(payload))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-lg border border-danger-line bg-danger-bg px-4 py-3 text-[13px] text-danger">
        {error}
      </p>
    );
  }

  if (!data) return <p className="text-[13px] text-ink-3">Loading dashboard…</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {STATS.map((stat) => {
          const value = data.totals?.[stat.key] ?? 0;
          return (
            <div key={stat.key} className={`${card} px-4 py-3.5`}>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-3">{stat.label}</span>
                <i className={`fa-solid ${stat.icon} text-[11px] text-ink-3`} aria-hidden="true" />
              </div>
              <p className="mt-2 text-[26px] leading-none tabular-nums">
                {stat.format === 'count' ? formatCount(value) : value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel/60 px-4 py-3 text-[12px] text-ink-3">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            data.source === 'supabase' ? 'bg-emerald-400' : 'bg-amber'
          }`}
          aria-hidden="true"
        />
        <span>
          Content source: <span className="text-ink-2">{data.source === 'supabase' ? 'Supabase' : 'local content store'}</span>
        </span>
        {data.source !== 'supabase' && (
          <span className="text-ink-3">
            Edits are saved to <code className="text-ink-2">server/data/content.json</code>.
          </span>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={`${card} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[13px] font-medium">Most downloaded</h2>
            <Link to="/admin/wallpapers" className="text-[12px] text-ink-3 hover:text-ink">
              Manage
            </Link>
          </div>
          {data.top.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-ink-3">No wallpapers yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.top.map((row) => (
                <li key={row.slug} className="flex items-center gap-3 px-4 py-2.5">
                  <img
                    src={`/wallpapers/${row.slug}.jpg`}
                    alt=""
                    className="h-9 w-14 rounded object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px]">{row.title}</p>
                    <p className="text-[11.5px] text-ink-3">{row.category}</p>
                  </div>
                  <span className="text-[12px] tabular-nums text-ink-2">
                    {formatCount(row.downloads)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[13px] font-medium">Latest requests</h2>
            <Link to="/admin/messages" className="text-[12px] text-ink-3 hover:text-ink">
              Open inbox
            </Link>
          </div>
          {data.recentRequests.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-ink-3">No visitor requests yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.recentRequests.map((row) => (
                <li key={row.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[13px]">{row.subject}</p>
                    <span className="shrink-0 text-[11px] uppercase tracking-wide text-ink-3">
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-ink-3">
                    {row.name} · {row.email}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
