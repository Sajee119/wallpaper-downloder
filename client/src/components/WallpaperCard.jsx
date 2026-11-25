import { formatCount } from '../utils.js';
import { iconBtn } from '../ui.js';

export default function WallpaperCard({
  item,
  portrait = false,
  onOpen,
  onDownload,
  downloading,
  isFavorite,
  onToggleFavorite,
}) {
  const busy = downloading === item.slug;
  const ratio = item.width / item.height;
  const aspect = portrait
    ? ratio >= 0.95
      ? 'aspect-[16/9]'
      : ratio >= 0.7
        ? 'aspect-[3/4]'
        : 'aspect-[9/16]'
    : 'aspect-[16/9]';

  return (
    <article className="surface surface-hover group relative overflow-hidden rounded-2xl">
      <img
        src={item.thumbUrl || item.url}
        alt={item.title}
        loading="lazy"
        decoding="async"
        className={`${aspect} w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]`}
      />

      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
        aria-hidden="true"
      />

      <button
        type="button"
        className="absolute inset-0 z-10"
        onClick={() => onOpen(item)}
        aria-label={`Preview ${item.title}`}
      />

      <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/15 bg-black/45 px-2.5 py-0.5 text-[10.5px] uppercase tracking-[0.08em] text-white/85 backdrop-blur">
        {item.category}
      </span>

      <div className="absolute right-2 top-2 z-20 flex gap-1">
        <button
          type="button"
          className={`${iconBtn} ${isFavorite ? 'text-amber' : ''}`}
          onClick={() => onToggleFavorite(item)}
          aria-pressed={isFavorite}
          aria-label={
            isFavorite ? `Remove ${item.title} from favourites` : `Save ${item.title} to favourites`
          }
          title={isFavorite ? 'Remove from favourites' : 'Save to favourites'}
        >
          <i
            className={`${isFavorite ? 'fa-solid' : 'fa-regular'} fa-heart`}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          className={iconBtn}
          onClick={() => onDownload(item)}
          disabled={busy}
          aria-label={`Download ${item.title}`}
          title="Download original"
        >
          <i
            className={`${busy ? 'fa-solid fa-hourglass-half' : 'fa-solid fa-arrow-down'}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-2.5 z-20">
        <h3 className="text-[15px] font-medium leading-snug text-white">{item.title}</h3>
        <p className="mt-0.5 text-[11px] tabular-nums text-white/75">
          {item.width} × {item.height}
          <span className="mx-1.5 text-white/45" aria-hidden="true">
            ·
          </span>
          {formatCount(item.downloads)} downloads
        </p>
      </div>
    </article>
  );
}
