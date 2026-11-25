import { useEffect, useState } from 'react';
import { Link, useRouter } from '../router.jsx';
import WallpaperCard from '../components/WallpaperCard.jsx';
import SetWallpaperGuide from '../components/SetWallpaperGuide.jsx';
import { fetchWallpaper, fetchWallpapers } from '../api.js';
import { useAuth } from '../auth.jsx';
import { recordView } from '../history.js';
import { formatCount, formatDate } from '../utils.js';
import { btnGhost, btnPrimary, shell } from '../ui.js';

export default function DetailPage({
  slug,
  requiresSignIn = true,
  onDownload,
  downloading,
  isFavorite,
  onToggleFavorite,
  onSearch,
}) {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState('loading');
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState('');
  const [downloads, setDownloads] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError('');
    setDownloads(null);

    fetchWallpaper(slug)
      .then(async (result) => {
        if (!active) return;
        setItem(result);
        setStatus('ready');
        try {
          const nearby = await fetchWallpapers({
            category: result.category,
            sort: 'trending',
            limit: 8,
          });
          if (active) {
            setRelated(
              nearby.items.filter((entry) => entry.slug !== result.slug).slice(0, 3),
            );
          }
        } catch {
          /* related items are optional */
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (item) recordView(user?.id ?? null, item);
  }, [item, user?.id]);

  useEffect(() => {
    setCopied(false);
  }, [slug]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyLink = async () => {
    const url = `${window.location.origin}/w/${encodeURIComponent(slug)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const field = document.createElement('textarea');
      field.value = url;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    setCopied(true);
  };

  const shareLink = async () => {
    const url = `${window.location.origin}/w/${encodeURIComponent(slug)}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: item?.title ?? 'Pixelfall wallpaper',
          text: `${item?.title ?? 'A wallpaper'} — a free wallpaper from Pixelfall`,
          url,
        });
        return;
      } catch {
        return;
      }
    }
    await copyLink();
  };

  if (status === 'loading') {
    return (
      <main className={`${shell} flex-1 py-10`}>
        <div className="aspect-[16/7] rounded-2xl border border-line bg-panel" aria-hidden="true" />
      </main>
    );
  }

  if (status === 'error' || !item) {
    return (
      <main className={`${shell} flex-1 py-16`}>
        <div className="empty-state">
          <i className="fa-solid fa-circle-exclamation text-[18px] text-ink-3" aria-hidden="true" />
          <h1 className="mt-3 font-display text-[26px]">Wallpaper not found</h1>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-2">
            {error || 'It may have been removed from the archive.'}
          </p>
          <Link className={`${btnGhost} mt-5`} to="/">
            Back to the archive
          </Link>
        </div>
      </main>
    );
  }

  const busy = downloading === item.slug;
  const totalDownloads = downloads ?? item.downloads;
  const saved = isFavorite(item.id);
  const ratio = item.height ? item.width / item.height : 1;
  const isPortrait = ratio < 1;
  const shape = ratio <= 0.85 ? 'Phone' : ratio < 1.35 ? 'Tablet' : 'Desktop';
  const deviceKey = ratio <= 0.85 ? 'mobile' : ratio < 1.35 ? 'tablet' : 'desktop';
  const description = `${item.title} is a ${isPortrait ? 'portrait' : 'landscape'} ${String(
    item.category,
  ).toLowerCase()} wallpaper made for ${shape.toLowerCase()} screens. It ships at ${item.width} × ${
    item.height
  } pixels as the untouched original — no crop, no recompression and no watermark.`;

  return (
    <main className="flex-1">
      <div className={`${shell} page-enter py-10`}>
        <nav className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3" aria-label="Breadcrumb">
          <Link to="/" className="transition-colors hover:text-ink">
            Archive
          </Link>
          <i className="fa-solid fa-chevron-right text-[8px]" aria-hidden="true" />
          <Link
            to={`/c/${encodeURIComponent(item.category)}`}
            className="transition-colors hover:text-ink"
          >
            {item.category}
          </Link>
          <i className="fa-solid fa-chevron-right text-[8px]" aria-hidden="true" />
          <span className="text-ink-2" aria-current="page">
            {item.title}
          </span>
        </nav>

        <article className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div className="overflow-hidden rounded-2xl border border-line bg-black">
            <img src={item.url} alt={item.title} className="max-h-[72vh] w-full object-contain" />
          </div>

          <div className="lg:sticky lg:top-[92px]">
            <p className="text-[12px] text-ink-3">{item.category}</p>
            <h1 className="mt-1 font-display text-[clamp(2.2rem,4vw,2.8rem)] leading-[1.04] tracking-[-0.01em]">
              {item.title}
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
              Original-resolution file, free to download and use on any screen size.
            </p>

            <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
              <div className="bg-panel p-3">
                <dt className="text-[11px] text-ink-3">Resolution</dt>
                <dd className="mt-1 text-[13px] tabular-nums">
                  {item.width} × {item.height}
                </dd>
              </div>
              <div className="bg-panel p-3">
                <dt className="text-[11px] text-ink-3">Downloads</dt>
                <dd className="mt-1 text-[13px] tabular-nums">{formatCount(totalDownloads)}</dd>
              </div>
              <div className="bg-panel p-3">
                <dt className="text-[11px] text-ink-3">Added</dt>
                <dd className="mt-1 text-[13px]">{formatDate(item.createdAt)}</dd>
              </div>
            </dl>

            {item.tags?.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <li key={tag}>
                    <button
                      type="button"
                      onClick={() => {
                        onSearch(tag);
                        navigate('/');
                      }}
                      className="h-7 rounded-full border border-line px-2.5 text-[12px] text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
                      title={`Find more ${tag}`}
                    >
                      {tag}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                className={btnPrimary}
                onClick={async () => {
                  const next = await onDownload(item);
                  if (next != null) setDownloads(next);
                }}
                disabled={busy}
              >
                <i className="fa-solid fa-arrow-down text-[11px]" aria-hidden="true" />
                {!user && requiresSignIn ? 'Sign in to download' : busy ? 'Saving' : 'Download original'}
              </button>
              <button
                type="button"
                className={`${btnGhost} ${saved ? 'border-amber/50 text-amber' : ''}`}
                onClick={() => onToggleFavorite(item)}
                aria-pressed={saved}
              >
                <i
                  className={`${saved ? 'fa-solid' : 'fa-regular'} fa-heart text-[12px]`}
                  aria-hidden="true"
                />
                {saved ? 'Saved to favourites' : 'Save to favourites'}
              </button>
              <button type="button" className={btnGhost} onClick={copyLink}>
                <i className="fa-solid fa-link text-[11px]" aria-hidden="true" />
                {copied ? 'Link copied' : 'Copy link'}
              </button>
              {typeof navigator !== 'undefined' && navigator.share && (
                <button type="button" className={btnGhost} onClick={shareLink}>
                  <i className="fa-solid fa-share-nodes text-[11px]" aria-hidden="true" />
                  Share
                </button>
              )}
            </div>
            <SetWallpaperGuide width={item.width} height={item.height} className="mt-3" />
            <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
              {user || !requiresSignIn
                ? 'Free to download. No attribution required.'
                : 'Sign in with Google to download. Previewing is open to everyone.'}
            </p>
          </div>
        </article>

        <section className="mt-12 grid gap-8 border-t border-line pt-8 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="font-display text-[26px] leading-none tracking-[-0.01em]">
              About this wallpaper
            </h2>
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-2">{description}</p>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-2">
              {item.tags?.length > 0
                ? `Filed under ${item.category} with the tags ${item.tags.join(', ')}. `
                : `Filed under ${item.category}. `}
              {user
                ? 'Downloads are saved to your account history, so you can find this file again from any device.'
                : 'Downloads need a free Google account; previewing, browsing and searching never do.'}
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
              <div className="bg-panel p-3">
                <dt className="text-[11px] text-ink-3">Made for</dt>
                <dd className="mt-1 text-[13px]">{shape}</dd>
              </div>
              <div className="bg-panel p-3">
                <dt className="text-[11px] text-ink-3">Orientation</dt>
                <dd className="mt-1 text-[13px]">{isPortrait ? 'Portrait' : 'Landscape'}</dd>
              </div>
              <div className="bg-panel p-3">
                <dt className="text-[11px] text-ink-3">Format</dt>
                <dd className="mt-1 text-[13px]">JPEG</dd>
              </div>
              <div className="bg-panel p-3">
                <dt className="text-[11px] text-ink-3">Collection</dt>
                <dd className="mt-1 truncate text-[13px]">{item.category}</dd>
              </div>
            </dl>
          </div>

          <div className="surface rounded-2xl p-5">
            <h3 className="text-[13px] font-medium">Keep exploring</h3>
            <ul className="mt-2 divide-y divide-line text-[13px]">
              <li>
                <Link
                  to={`/c/${encodeURIComponent(item.category)}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-ink-2 transition-colors hover:text-ink"
                >
                  More in {item.category}
                  <i className="fa-solid fa-arrow-right text-[10px] text-ink-3" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link
                  to={`/d/${deviceKey}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-ink-2 transition-colors hover:text-ink"
                >
                  {shape} wallpapers
                  <i className="fa-solid fa-arrow-right text-[10px] text-ink-3" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link
                  to="/categories"
                  className="flex items-center justify-between gap-3 py-2.5 text-ink-2 transition-colors hover:text-ink"
                >
                  All collections
                  <i className="fa-solid fa-arrow-right text-[10px] text-ink-3" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link
                  to="/"
                  className="flex items-center justify-between gap-3 py-2.5 text-ink-2 transition-colors hover:text-ink"
                >
                  Browse the archive
                  <i className="fa-solid fa-arrow-right text-[10px] text-ink-3" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-[26px] leading-none tracking-[-0.01em]">
                More in {item.category}
              </h2>
              <Link
                to={`/c/${encodeURIComponent(item.category)}`}
                className="text-[12px] text-ink-2 transition-colors hover:text-ink"
              >
                See all
                <i className="fa-solid fa-arrow-right ml-1.5 text-[10px]" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((entry) => (
                <WallpaperCard
                  key={entry.slug}
                  item={entry}
                  onOpen={(picked) => navigate(`/w/${encodeURIComponent(picked.slug)}`)}
                  onDownload={onDownload}
                  downloading={downloading}
                  isFavorite={isFavorite(entry.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
