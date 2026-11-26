import { useCallback, useEffect, useState } from 'react';
import { Link } from '../router.jsx';
import { formatCount } from '../utils.js';
import { btnGhost, btnPrimary, iconOnImage, shell } from '../ui.js';

const AUTOPLAY_MS = 6000;

export default function Hero({
  slides = [],
  stats,
  kicker = '',
  heading = 'Wallpapers worth staring at',
  body = 'Landscapes, city lights and gradients, filed by mood. Preview any wallpaper, then save the original file. No account needed.',
  onBrowse,
  onSurprise,
  surpriseLoading,
}) {
  const list = slides.filter((slide) => slide?.url);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (index >= list.length) setIndex(0);
  }, [index, list.length]);

  useEffect(() => {
    if (!playing || paused || reducedMotion || list.length < 2) return undefined;
    const timer = setTimeout(() => {
      setIndex((current) => (current + 1) % list.length);
    }, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [index, playing, paused, reducedMotion, list.length]);

  const step = useCallback(
    (direction) => {
      if (list.length < 2) return;
      setIndex((current) => (current + direction + list.length) % list.length);
    },
    [list.length],
  );

  const current = list[index] ?? null;
  const total = list.length;

  return (
    <section
      className="relative isolate flex min-h-[560px] items-end overflow-hidden border-b border-line lg:min-h-[680px]"
      aria-roledescription="carousel"
      aria-label="Featured wallpapers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="absolute inset-0 -z-20 overflow-hidden bg-panel">
        {total > 0 ? (
          <div
            className="flex h-full w-full transition-transform duration-700 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {list.map((slide, slideIndex) => (
              <div
                key={slide.slug}
                className="relative h-full w-full shrink-0"
                aria-hidden={slideIndex !== index}
              >
                <img
                  src={slide.url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading={slideIndex < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full w-full" aria-hidden="true" />
        )}
      </div>
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-t from-paper via-paper/88 to-paper/25 sm:bg-gradient-to-r sm:from-paper sm:via-paper/80 sm:to-paper/5"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 -z-10 h-64 bg-gradient-to-t from-paper to-transparent"
        aria-hidden="true"
      />

      <div className={`${shell} pb-12 pt-24 lg:pb-14`}>
        {kicker ? (
          <p className="mb-4 inline-flex items-center gap-2.5 rounded-md border border-line-2 bg-paper/55 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-ink-2 backdrop-blur">
            <span className="h-1 w-1 rounded-full bg-amber" aria-hidden="true" />
            {kicker}
          </p>
        ) : null}
        <h1 className="max-w-[16ch] font-display text-[clamp(3rem,6.6vw,5.1rem)] leading-[0.92] tracking-[-0.022em]">
          {heading}
        </h1>
        <p className="mt-5 max-w-md text-[14.5px] leading-relaxed text-ink-2">{body}</p>

        <div className="mt-8 flex flex-wrap gap-2.5">
          <button type="button" className={btnPrimary} onClick={onBrowse}>
            Browse the collection
            <i className="fa-solid fa-arrow-down text-[11px]" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={onSurprise}
            disabled={surpriseLoading}
          >
            <i className="fa-solid fa-shuffle text-[11px]" aria-hidden="true" />
            {surpriseLoading ? 'Picking' : 'Shuffle'}
          </button>
        </div>

        <dl className="mt-10 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line/60 backdrop-blur-md">
          <div className="bg-paper/65 px-4 py-3.5">
            <dt className="text-[10.5px] uppercase tracking-[0.08em] text-ink-3">Wallpapers</dt>
            <dd className="mt-1.5 text-[21px] tabular-nums leading-none">
              {stats?.wallpapers ?? '—'}
            </dd>
          </div>
          <div className="bg-paper/65 px-4 py-3.5">
            <dt className="text-[10.5px] uppercase tracking-[0.08em] text-ink-3">Downloads</dt>
            <dd className="mt-1.5 text-[21px] tabular-nums leading-none">
              {stats ? formatCount(stats.downloads) : '—'}
            </dd>
          </div>
          <div className="bg-paper/65 px-4 py-3.5">
            <dt className="text-[10.5px] uppercase tracking-[0.08em] text-ink-3">Collections</dt>
            <dd className="mt-1.5 text-[21px] tabular-nums leading-none">
              {stats?.categories ?? '—'}
            </dd>
          </div>
        </dl>
      </div>

      {total > 0 && current && (
        <div className="absolute bottom-5 right-5 flex items-center gap-1.5 sm:bottom-6 sm:right-8">
          <Link
            to={`/w/${encodeURIComponent(current.slug)}`}
            className="mr-2 hidden max-w-[220px] truncate text-[12px] text-ink-2 transition-colors hover:text-ink sm:block"
          >
            Featured
            <span className="ml-1.5 text-ink">{current.title}</span>
          </Link>

          <button
            type="button"
            className={iconOnImage}
            onClick={() => step(-1)}
            aria-label="Previous featured wallpaper"
            disabled={total < 2}
          >
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          </button>

          <span
            className="min-w-[54px] text-center text-[12px] tabular-nums text-ink-2"
            aria-live="off"
          >
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>

          <button
            type="button"
            className={iconOnImage}
            onClick={() => step(1)}
            aria-label="Next featured wallpaper"
            disabled={total < 2}
          >
            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </button>

          <button
            type="button"
            className={iconOnImage}
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
            aria-pressed={!playing}
          >
            <i
              className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`}
              aria-hidden="true"
            />
          </button>
        </div>
      )}
    </section>
  );
}
