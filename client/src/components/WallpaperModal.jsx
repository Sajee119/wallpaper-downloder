import { useCallback, useEffect, useRef, useState } from 'react';
import { formatCount, formatDate } from '../utils.js';
import { useAuth } from '../auth.jsx';
import { recordView } from '../history.js';
import SetWallpaperGuide from './SetWallpaperGuide.jsx';
import { btnGhost, btnPrimary, iconOnImage } from '../ui.js';

export default function WallpaperModal({
  item,
  requiresSignIn = true,
  onClose,
  onDownload,
  downloading,
  isFavorite,
  onToggleFavorite,
  position = -1,
  total = 0,
  onPrev,
  onNext,
  onTagSelect,
}) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageRef = useRef(null);
  const canNavigate = position >= 0 && total > 1;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (!canNavigate) return;
      if (event.key === 'ArrowLeft') onPrev?.();
      if (event.key === 'ArrowRight') onNext?.();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [canNavigate, onClose, onNext, onPrev]);

  useEffect(() => {
    setCopied(false);
  }, [item.slug]);

  useEffect(() => {
    recordView(user?.id ?? null, item);
  }, [item, user?.id]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await imageRef.current?.requestFullscreen?.();
    } catch {
      /* the browser can refuse outside a direct gesture */
    }
  };

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyLink = useCallback(async () => {
    const url = `${window.location.origin}/w/${encodeURIComponent(item.slug)}`;
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
  }, [item.slug]);

  const shareWallpaper = useCallback(async () => {
    const url = `${window.location.origin}/w/${encodeURIComponent(item.slug)}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `${item.title} — a free wallpaper from Pixelfall`,
          url,
        });
        return;
      } catch {
        return;
      }
    }
    await copyLink();
  }, [copyLink, item.slug, item.title]);

  const busy = downloading === item.slug;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative grid w-full max-w-[1080px] overflow-hidden rounded-2xl border border-line-2 bg-panel shadow-[0_50px_120px_-50px_rgba(0,0,0,0.95)] lg:grid-cols-[1.5fr_1fr]"
        role="dialog"
        aria-modal="true"
        aria-label={`${item.title} preview`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={`${iconOnImage} absolute right-3 top-3 z-20`}
          onClick={onClose}
          aria-label="Close preview"
        >
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`${iconOnImage} absolute right-[52px] top-3 z-20`}
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen preview' : 'Fullscreen preview'}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          <i
            className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}
            aria-hidden="true"
          />
        </button>

        <div ref={imageRef} className="relative grid place-items-center bg-black">
          <img
            src={item.url}
            alt={item.title}
            className="max-h-[46vh] w-full object-contain lg:max-h-[calc(100vh-96px)]"
          />

          {canNavigate && (
            <>
              <button
                type="button"
                className={`${iconOnImage} absolute left-3 top-1/2 -translate-y-1/2`}
                onClick={onPrev}
                aria-label="Previous wallpaper"
              >
                <i className="fa-solid fa-arrow-left" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${iconOnImage} absolute right-3 top-1/2 -translate-y-1/2`}
                onClick={onNext}
                aria-label="Next wallpaper"
              >
                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </button>
              <span className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[11px] tabular-nums text-white/80 backdrop-blur">
                {position + 1} / {total}
              </span>
            </>
          )}
        </div>

        <div className="border-t border-line p-6 lg:border-l lg:border-t-0 lg:p-7">
          <p className="text-[12px] text-ink-3">{item.category}</p>
          <h2 className="mt-1 font-display text-[32px] leading-tight tracking-[-0.01em]">
            {item.title}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
            Original-resolution JPEG, ready to set as your desktop background.
          </p>

          <dl className="spec-grid mt-5 grid-cols-3">
            <div className="spec">
              <dt>Resolution</dt>
              <dd>
                {item.width} × {item.height}
              </dd>
            </div>
            <div className="spec">
              <dt>Downloads</dt>
              <dd>{formatCount(item.downloads)}</dd>
            </div>
            <div className="spec">
              <dt>Added</dt>
              <dd>{formatDate(item.createdAt)}</dd>
            </div>
          </dl>

          {item.tags?.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => onTagSelect?.(tag)}
                    className="h-7 rounded-md border border-line px-2.5 text-[11.5px] text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
                    title={`Find more ${tag}`}
                  >
                    {tag}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <button type="button" className={btnPrimary} onClick={() => onDownload(item)} disabled={busy}>
              <i className="fa-solid fa-arrow-down text-[11px]" aria-hidden="true" />
              {!user && requiresSignIn ? 'Sign in to download' : busy ? 'Saving' : 'Download original'}
            </button>
            <button
              type="button"
              className={`${btnGhost} ${isFavorite ? 'border-amber/50 text-amber' : ''}`}
              onClick={() => onToggleFavorite(item)}
              aria-pressed={isFavorite}
            >
              <i
                className={`${isFavorite ? 'fa-solid' : 'fa-regular'} fa-heart text-[12px]`}
                aria-hidden="true"
              />
              {isFavorite ? 'Saved to favourites' : 'Save to favourites'}
            </button>
            <button type="button" className={btnGhost} onClick={copyLink}>
              <i className="fa-solid fa-link text-[11px]" aria-hidden="true" />
              {copied ? 'Link copied' : 'Copy link'}
            </button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button type="button" className={btnGhost} onClick={shareWallpaper}>
                <i className="fa-solid fa-share-nodes text-[11px]" aria-hidden="true" />
                Share
              </button>
            )}
          </div>
          <SetWallpaperGuide width={item.width} height={item.height} className="mt-4" />
          <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-3">
            {user || !requiresSignIn
              ? 'Free to download. No attribution required.'
              : 'A free Google account is needed to download originals. Previewing stays open to everyone.'}
          </p>
        </div>
      </div>
    </div>
  );
}
