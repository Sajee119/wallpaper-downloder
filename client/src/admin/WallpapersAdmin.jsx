import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminRequest } from './api.js';
import { badge, btn, btnDanger, btnPrimary, card, input, label, textarea } from './ui.js';
import { formatCount } from '../utils.js';
import {
  DEVICE_SIZES,
  analyseImageFile,
  collectionsFromRows,
  deviceFromAspect,
  slugifyTitle,
  suggestWallpaper,
  tagPoolFromRows,
  tagsFromPalette,
  titleFromFilename,
} from './wallpaperAssist.js';

const EMPTY = {
  title: '',
  slug: '',
  category: '',
  tags: '',
  device: 'desktop',
  width: 1392,
  height: 752,
  accent: '#6b7a99',
  downloads: 0,
  status: 'published',
  featured: false,
  imageUrl: '',
  imageData: null,
};

function mergeTags(current, extra, limit = 8) {
  const list = current.split(',').map((tag) => tag.trim()).filter(Boolean);
  const seen = new Set(list.map((tag) => tag.toLowerCase()));
  for (const tag of extra) {
    const value = String(tag).trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    list.push(value);
  }
  return list.slice(0, limit).join(', ');
}

function applyDevice(previous, device) {
  const size = DEVICE_SIZES[device] ?? DEVICE_SIZES.desktop;
  return { ...previous, device, width: size.width, height: size.height };
}

export default function WallpapersAdmin() {
  const [rows, setRows] = useState([]);
  const [source, setSource] = useState('demo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminRequest('/wallpapers');
      setRows(data.wallpapers ?? []);
      setSource(data.source ?? 'demo');
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const remove = async (row) => {
    if (!window.confirm(`Delete “${row.title}”? The image file is removed too.`)) return;
    try {
      await adminRequest(`/wallpapers/${encodeURIComponent(row.slug)}`, { method: 'DELETE' });
      setNotice(`Deleted ${row.title}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? rows.filter((row) =>
        [row.title, row.slug, row.category, ...(row.tags ?? [])]
          .join(' ')
          .toLowerCase()
          .includes(needle),
      )
    : rows;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, collection or tag"
            className={`${input} sm:w-[280px]`}
            aria-label="Search wallpapers"
          />
          <span className="text-[12px] text-ink-3">
            {filtered.length} of {rows.length}
          </span>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setEditor({ mode: 'new' })}>
          <i className="fa-solid fa-plus text-[11px]" aria-hidden="true" />
          New wallpaper
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-danger-line bg-danger-bg px-4 py-3 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="rounded-lg border border-line bg-raised px-4 py-2 text-[12.5px] text-ink-2">{notice}</p>
      )}

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-line text-[11.5px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-4 py-2.5 font-normal">Wallpaper</th>
                <th className="px-3 py-2.5 font-normal">Collection</th>
                <th className="px-3 py-2.5 font-normal">Device</th>
                <th className="px-3 py-2.5 font-normal">Downloads</th>
                <th className="px-3 py-2.5 font-normal">Status</th>
                <th className="px-4 py-2.5 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[13px] text-ink-3">
                    Loading wallpapers…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-ink-3">
                    {rows.length === 0 ? 'No wallpapers yet. Add the first one.' : 'Nothing matches that search.'}
                  </td>
                </tr>
              )}
              {filtered.map((row) => (
                <tr key={row.id} className="align-middle">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={row.imageUrl || `/wallpapers/${row.slug}.jpg`}
                        alt=""
                        className="h-10 w-16 shrink-0 rounded object-cover"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[13px]">
                          {row.title}
                          {row.featured && (
                            <i className="fa-solid fa-star ml-1.5 text-[10px] text-amber" aria-label="Featured" />
                          )}
                        </p>
                        <p className="truncate text-[11.5px] text-ink-3">/{row.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] text-ink-2">{row.category}</td>
                  <td className="px-3 py-2.5 text-[12.5px] capitalize text-ink-2">{row.device}</td>
                  <td className="px-3 py-2.5 text-[12.5px] tabular-nums text-ink-2">
                    {formatCount(row.downloads)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        row.status === 'draft'
                          ? 'inline-flex items-center rounded-full border border-amber/40 px-2 py-0.5 text-[11px] text-amber'
                          : 'inline-flex items-center rounded-full border border-ok-line px-2 py-0.5 text-[11px] text-ok'
                      }
                    >
                      {row.status === 'draft' ? 'Draft' : 'Published'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="text-[12px] text-ink-2 transition-colors hover:text-ink"
                        onClick={() => setEditor({ mode: 'edit', row })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-[12px] text-ink-3 transition-colors hover:text-danger"
                        onClick={() => remove(row)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editor && (
        <Editor
          row={editor.mode === 'edit' ? editor.row : null}
          rows={rows}
          source={source}
          onClose={() => setEditor(null)}
          onSaved={(message) => {
            setEditor(null);
            setNotice(message);
            load();
          }}
        />
      )}
    </div>
  );
}

function Hint({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 flex max-w-full items-center gap-1.5 truncate rounded-full border border-amber/30 bg-amber/5 px-2 py-0.5 text-left text-[10.5px] text-amber transition-colors hover:border-amber/60 hover:bg-amber/10"
    >
      <i className="fa-solid fa-wand-magic-sparkles text-[9px]" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </button>
  );
}

function Editor({ row, rows, source, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    row
      ? {
          title: row.title,
          slug: row.slug,
          category: row.category,
          tags: (row.tags ?? []).join(', '),
          device: row.device ?? 'desktop',
          width: row.width,
          height: row.height,
          accent: row.accent,
          downloads: row.downloads,
          status: row.status ?? 'published',
          featured: Boolean(row.featured),
          imageUrl: row.imageUrl ?? '',
          imageData: null,
        }
      : { ...EMPTY },
  );
  const [slugTouched, setSlugTouched] = useState(Boolean(row));
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const suggestions = useMemo(() => suggestWallpaper(form.title, rows), [form.title, rows]);
  const collections = useMemo(() => collectionsFromRows(rows), [rows]);
  const tagPool = useMemo(() => tagPoolFromRows(rows), [rows]);

  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(''), 3500);
    return () => clearTimeout(timer);
  }, [flash]);

  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const changeTitle = (value) =>
    setForm((previous) => ({
      ...previous,
      title: value,
      slug: slugTouched ? previous.slug : slugifyTitle(value),
    }));

  const currentTags = form.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  const currentTagKeys = currentTags.map((tag) => tag.toLowerCase());
  const missingTags = (suggestions?.tags ?? []).filter((tag) => !currentTagKeys.includes(tag.toLowerCase()));

  const accentSuggestion = scan?.palette.accent ?? suggestions?.accent ?? '';
  const accentDiffers =
    Boolean(accentSuggestion) && accentSuggestion.toLowerCase() !== String(form.accent).toLowerCase();
  const downloadSuggestion = Number.isFinite(suggestions?.downloads) ? suggestions.downloads : null;

  const hasSomethingToFill = Boolean(
    (suggestions?.slug && !slugTouched && suggestions.slug !== form.slug) ||
      (suggestions?.category && suggestions.category !== form.category) ||
      missingTags.length ||
      accentDiffers ||
      (suggestions?.device && !scan && suggestions.device !== form.device) ||
      (downloadSuggestion !== null && downloadSuggestion !== Number(form.downloads)),
  );

  const preview = form.imageData || form.imageUrl || (row ? `/wallpapers/${row.slug}.jpg` : '');

  const fillAll = () => {
    const next = { ...form };
    const filled = [];
    if (!slugTouched && suggestions?.slug) {
      next.slug = suggestions.slug;
      if (next.slug !== form.slug) filled.push('slug');
    }
    if (suggestions?.category && suggestions.category !== form.category) {
      next.category = suggestions.category;
      filled.push('collection');
    }
    if (missingTags.length) {
      next.tags = mergeTags(form.tags, missingTags);
      filled.push('tags');
    }
    if (accentDiffers) {
      next.accent = accentSuggestion;
      filled.push('accent');
    }
    if (suggestions?.device && !scan && suggestions.device !== form.device) {
      Object.assign(next, applyDevice(next, suggestions.device));
      filled.push('device & size');
    }
    if (downloadSuggestion !== null && downloadSuggestion !== Number(form.downloads)) {
      next.downloads = downloadSuggestion;
      filled.push('downloads');
    }
    setForm(next);
    setFlash(filled.length ? `Filled ${filled.join(', ')}.` : 'Everything already matches the title.');
  };

  const pickImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose a JPEG, PNG or WebP image.');
      return;
    }

    setScanning(true);
    try {
      const result = await analyseImageFile(file);
      const paletteTags = tagsFromPalette(result.palette);
      const device = deviceFromAspect(result.width, result.height);
      const fromName = titleFromFilename(file.name);

      setForm((previous) => {
        const title = previous.title.trim() || fromName || previous.title;
        return {
          ...previous,
          imageData: result.imageData,
          imageUrl: '',
          width: result.width,
          height: result.height,
          device,
          accent: result.palette.accent,
          title,
          slug: slugTouched || previous.slug.trim() ? previous.slug : slugifyTitle(title),
          tags: mergeTags(previous.tags, paletteTags),
        };
      });
      setScan(result);
      setFlash(
        `Scanned image: accent ${result.palette.accent}, ${result.width}×${result.height}, ${device}.`,
      );
      setError('');
    } catch {
      setError('That image could not be read. Try another file.');
    } finally {
      setScanning(false);
    }
  };

  const syncSizeFromUrl = () => {
    const url = form.imageUrl.trim();
    if (!url) return;
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (!width || !height) return;
      setForm((previous) =>
        previous.imageUrl.trim() === url
          ? {
              ...previous,
              width,
              height,
              device: deviceFromAspect(width, height),
            }
          : previous,
      );
      setFlash(`Size read from image: ${width}×${height}.`);
    };
    image.src = url;
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const payload = {
      ...form,
      slug: form.slug.trim() || slugifyTitle(form.title),
      width: Number(form.width),
      height: Number(form.height),
      downloads: Number(form.downloads),
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    };
    try {
      if (row) {
        await adminRequest(`/wallpapers/${encodeURIComponent(row.slug)}`, {
          method: 'PATCH',
          body: payload,
        });
        onSaved(`Saved ${form.title}`);
      } else {
        await adminRequest('/wallpapers', { method: 'POST', body: payload });
        onSaved(`Added ${form.title}`);
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8">
      <form
        onSubmit={submit}
        className="w-full max-w-[780px] rounded-xl border border-line-2 bg-paper shadow-[0_30px_80px_-40px_rgba(0,0,0,0.95)]"
      >
        <datalist id="w-collections">
          {collections.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <datalist id="w-tag-pool">
          {tagPool.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
        <datalist id="w-title-pool">
          {rows.map((item) => (
            <option key={item.slug} value={item.title} />
          ))}
        </datalist>

        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display text-[22px] leading-none">
            {row ? 'Edit wallpaper' : 'New wallpaper'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-3 transition-colors hover:text-ink"
            aria-label="Close editor"
          >
            <i className="fa-solid fa-xmark text-[13px]" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-5 px-5 py-5 sm:grid-cols-[1.45fr_1fr]">
          <div className="space-y-3.5">
            <div>
              <label className={label} htmlFor="w-title">Title</label>
              <input
                id="w-title"
                className={input}
                required
                list="w-title-pool"
                value={form.title}
                onChange={(event) => changeTitle(event.target.value)}
                placeholder="Alpine Dawn"
                autoComplete="off"
              />
              {hasSomethingToFill && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber/25 bg-amber/[0.06] px-2.5 py-2">
                  <p className="text-[11.5px] text-ink-2">
                    <i className="fa-solid fa-wand-magic-sparkles mr-1.5 text-[10px] text-amber" aria-hidden="true" />
                    Suggestions for “{form.title.trim()}”
                  </p>
                  <button
                    type="button"
                    onClick={fillAll}
                    className="ml-auto inline-flex h-6 items-center rounded-md border border-amber/40 px-2 text-[11px] text-amber transition-colors hover:bg-amber/10"
                  >
                    Fill all
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="w-slug">Slug</label>
                <input
                  id="w-slug"
                  className={input}
                  value={form.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    set('slug', event.target.value);
                  }}
                  placeholder="auto from title"
                />
                {suggestions?.slug && suggestions.slug !== form.slug && (
                  <Hint onClick={() => { setSlugTouched(true); set('slug', suggestions.slug); }}>
                    {suggestions.slug}
                  </Hint>
                )}
              </div>
              <div>
                <label className={label} htmlFor="w-category">Collection</label>
                <input
                  id="w-category"
                  className={input}
                  required
                  list="w-collections"
                  value={form.category}
                  onChange={(event) => set('category', event.target.value)}
                  placeholder="Nature"
                  autoComplete="off"
                />
                {suggestions?.category && suggestions.category !== form.category && (
                  <Hint onClick={() => set('category', suggestions.category)}>{suggestions.category}</Hint>
                )}
              </div>
            </div>

            <div>
              <label className={label} htmlFor="w-tags">Tags (comma separated)</label>
              <input
                id="w-tags"
                className={input}
                list="w-tag-pool"
                value={form.tags}
                onChange={(event) => set('tags', event.target.value)}
                placeholder="mountains, lake, sunrise"
                autoComplete="off"
              />
              {missingTags.length > 0 && (
                <Hint onClick={() => set('tags', mergeTags(form.tags, missingTags))}>
                  {missingTags.join(', ')}
                </Hint>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={label} htmlFor="w-device">Device</label>
                <select
                  id="w-device"
                  className={input}
                  value={form.device}
                  onChange={(event) => setForm((previous) => applyDevice(previous, event.target.value))}
                >
                  <option value="desktop">Desktop</option>
                  <option value="tablet">Tablet</option>
                  <option value="mobile">Mobile</option>
                </select>
                {suggestions?.device && !scan && suggestions.device !== form.device && (
                  <Hint
                    onClick={() => setForm((previous) => applyDevice(previous, suggestions.device))}
                  >
                    {suggestions.device} · {DEVICE_SIZES[suggestions.device].width}×{DEVICE_SIZES[suggestions.device].height}
                  </Hint>
                )}
              </div>
              <div>
                <label className={label} htmlFor="w-width">Width</label>
                <input
                  id="w-width"
                  type="number"
                  min="1"
                  className={input}
                  value={form.width}
                  onChange={(event) => set('width', event.target.value)}
                />
              </div>
              <div>
                <label className={label} htmlFor="w-height">Height</label>
                <input
                  id="w-height"
                  type="number"
                  min="1"
                  className={input}
                  value={form.height}
                  onChange={(event) => set('height', event.target.value)}
                />
              </div>
            </div>

            {(() => {
              const size = DEVICE_SIZES[form.device] ?? DEVICE_SIZES.desktop;
              const differs = Number(form.width) !== size.width || Number(form.height) !== size.height;
              if (!differs) return null;
              return (
                <Hint onClick={() => setForm((previous) => applyDevice(previous, previous.device))}>
                  Auto size for {form.device}: {size.width}×{size.height}
                </Hint>
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="w-accent">Accent</label>
                <div className="flex items-center gap-2">
                  <input
                    id="w-accent"
                    type="color"
                    value={form.accent}
                    onChange={(event) => set('accent', event.target.value)}
                    className="h-9 w-11 cursor-pointer rounded-lg border border-line bg-panel p-1"
                  />
                  <input
                    className={input}
                    value={form.accent}
                    onChange={(event) => set('accent', event.target.value)}
                    aria-label="Accent hex"
                  />
                </div>
                {accentDiffers && (
                  <Hint onClick={() => set('accent', accentSuggestion)}>
                    <span
                      className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                      style={{ backgroundColor: accentSuggestion }}
                    />
                    {accentSuggestion}
                    {scan ? ' from image' : ' from title'}
                  </Hint>
                )}
              </div>
              <div>
                <label className={label} htmlFor="w-downloads">Download count</label>
                <input
                  id="w-downloads"
                  type="number"
                  min="0"
                  className={input}
                  value={form.downloads}
                  onChange={(event) => set('downloads', event.target.value)}
                />
                {downloadSuggestion !== null && downloadSuggestion !== Number(form.downloads) && (
                  <Hint onClick={() => set('downloads', downloadSuggestion)}>
                    ~{downloadSuggestion} · {suggestions.category} average
                  </Hint>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              {source === 'supabase' ? (
                <p className="text-[11.5px] text-ink-3">
                  Drafts and hero featuring need extra Supabase columns; the live table has no
                  status column yet.
                </p>
              ) : (
                <>
                  <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(event) => set('featured', event.target.checked)}
                      className="h-3.5 w-3.5 accent-[#d5a45c]"
                    />
                    Feature in the hero
                  </label>
                  <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
                    <input
                      type="checkbox"
                      checked={form.status === 'published'}
                      onChange={(event) => set('status', event.target.checked ? 'published' : 'draft')}
                      className="h-3.5 w-3.5 accent-[#d5a45c]"
                    />
                    Published
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-line bg-panel">
              {preview ? (
                <img src={preview} alt="" className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="grid aspect-[4/3] place-items-center text-[12px] text-ink-3">
                  No image yet
                </div>
              )}
            </div>

            {scan && (
              <div className="rounded-lg border border-line bg-panel px-3 py-2.5">
                <p className="text-[10.5px] uppercase tracking-wide text-ink-3">Scanned from image</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {scan.palette.swatches.map((swatch) => (
                    <button
                      key={`${swatch.hex}-${swatch.share}`}
                      type="button"
                      onClick={() => set('accent', swatch.hex)}
                      title={`Use ${swatch.hex} as the accent`}
                      aria-label={`Use ${swatch.hex} as the accent`}
                      className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 ${
                        form.accent.toLowerCase() === swatch.hex.toLowerCase()
                          ? 'border-ink'
                          : 'border-line-2'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    />
                  ))}
                  <span className="ml-1 text-[11px] text-ink-3">
                    {scan.width}×{scan.height} · {scan.palette.hueName} · {scan.palette.saturation > 0.12 ? 'colourful' : 'neutral'}
                  </span>
                </div>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-3">
                  Accent, device, size and colour tags were filled in from this picture.
                </p>
              </div>
            )}

            <div>
              <label className={`${btn} w-full cursor-pointer ${scanning ? 'opacity-60' : ''}`}>
                <i
                  className={`fa-solid ${scanning ? 'fa-circle-notch animate-spin' : 'fa-wand-magic-sparkles'} text-[11px]`}
                  aria-hidden="true"
                />
                {scanning ? 'Scanning image…' : 'Scan image & auto-fill'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={pickImage}
                  className="hidden"
                  disabled={scanning}
                />
              </label>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
                Resized to fit 2400 px, saved as JPEG. The accent colour and device come from the
                image itself.
              </p>
            </div>
            <div>
              <label className={label} htmlFor="w-image-url">or image URL</label>
              <input
                id="w-image-url"
                className={input}
                value={form.imageUrl}
                onChange={(event) => {
                  set('imageUrl', event.target.value);
                  set('imageData', null);
                  setScan(null);
                }}
                onBlur={syncSizeFromUrl}
                placeholder="https://… (size is read automatically)"
              />
            </div>
          </div>
        </div>

        {flash && (
          <p className="mx-5 mb-3 rounded-lg border border-amber/30 bg-amber/5 px-3 py-2 text-[12px] text-amber">
            {flash}
          </p>
        )}

        {error && (
          <p className="mx-5 mb-3 rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-[12.5px] text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          <button type="button" className={btn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={busy || scanning}>
            {busy ? 'Saving…' : row ? 'Save changes' : 'Add wallpaper'}
          </button>
        </div>
      </form>
    </div>
  );
}
