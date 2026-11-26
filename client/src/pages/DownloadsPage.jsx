import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { Link } from '../router.jsx';
import { useAuth } from '../auth.jsx';
import { clearDownloads, getDownloads } from '../history.js';
import { formatDate } from '../utils.js';
import { btnGhost, btnGhostSm, shell } from '../ui.js';

export default function DownloadsPage({ onDownload, downloading, onNotify, onSignIn }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(getDownloads(user?.id));
  }, [user?.id]);

  const clear = () => {
    clearDownloads(user?.id);
    setItems([]);
    onNotify('Download history cleared');
  };

  return (
    <main className="flex-1">
      <div className={`${shell} page-enter page-wrap`}>
        <PageHeader
          eyebrow="History"
          title="Downloads"
          lede="The last files you saved from this browser. Downloading again re-opens the original, so nothing leaves your device."
          meta={
            items.length > 0
              ? `${items.length} file${items.length === 1 ? '' : 's'} saved${
                  items[0]?.at ? ` · most recent ${formatDate(items[0].at)}` : ''
                }`
              : null
          }
          actions={
            items.length > 0 && (
              <button type="button" className={btnGhostSm} onClick={clear}>
                <i className="fa-solid fa-trash-can text-[10px]" aria-hidden="true" />
                Clear history
              </button>
            )
          }
        />

        {!user && (
          <p className="mt-4 text-[12px] text-ink-3">
            Downloads need a free account, so this list belongs to this device.{' '}
            <button type="button" className="text-ink underline" onClick={onSignIn}>
              Sign in with Google
            </button>{' '}
            to download originals and keep this history with your account.
          </p>
        )}

        {items.length === 0 ? (
          <div className="empty-state mt-10">
            <i className="fa-solid fa-arrow-down text-[18px] text-ink-3" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[24px]">No downloads yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-2">
              Wallpapers you download are listed here, newest first.
            </p>
            <Link className={`${btnGhost} mt-5`} to="/">
              Browse the archive
            </Link>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-2">
            {items.map((entry) => (
              <li
                key={entry.slug}
                className="surface flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:border-line-2"
              >
                <Link
                  to={`/w/${encodeURIComponent(entry.slug)}`}
                  className="h-12 w-20 flex-none overflow-hidden rounded-lg border border-line bg-raised"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  {entry.thumbUrl ? (
                    <img
                      src={entry.thumbUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    to={`/w/${encodeURIComponent(entry.slug)}`}
                    className="block truncate text-[13px] transition-colors hover:text-ink"
                  >
                    {entry.title}
                  </Link>
                  <p className="mt-0.5 text-[11px] tabular-nums text-ink-3">
                    {entry.category || 'Wallpaper'}
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    {formatDate(entry.at)}
                    {entry.width && entry.height ? (
                      <>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        {entry.width} × {entry.height}
                      </>
                    ) : null}
                  </p>
                </div>

                <button
                  type="button"
                  className={btnGhostSm}
                  onClick={() => onDownload(entry)}
                  disabled={downloading === entry.slug}
                  aria-label={`Download ${entry.title} again`}
                >
                  <i className="fa-solid fa-arrow-down text-[10px]" aria-hidden="true" />
                  {downloading === entry.slug ? 'Saving' : 'Again'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
