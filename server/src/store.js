import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { getContent, newId, saveContent } from './content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public/wallpapers');

const SORTS = {
  trending: (a, b) => b.downloads - a.downloads,
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function writeLocalImage(slug, dataUrl) {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ''));
  if (!match) throw httpError('Upload a JPEG image.', 400);
  const buffer = Buffer.from(match[1], 'base64');
  if (!buffer.length) throw httpError('That image file is empty.', 400);
  if (buffer.length > 8 * 1024 * 1024) throw httpError('Images must be smaller than 8 MB.', 400);
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(path.join(PUBLIC_DIR, `${slug}.jpg`), buffer);
}

function sanitizeSearch(value) {
  return String(value || '').replace(/[%,()*_\\]/g, ' ').trim();
}

/* -------------------------------------------------------------------------- */
/* Demo store (no Supabase credentials)                                       */
/* -------------------------------------------------------------------------- */

// Admin-managed content lives in server/data/content.json; drafts stay hidden.
function publishedRows() {
  return getContent().wallpapers.filter((row) => row.status !== 'draft');
}

function decorateDemo(row) {
  const url = row.imageUrl || `/wallpapers/${row.slug}.jpg`;
  return { ...row, url, thumbUrl: url };
}

const demoStore = {
  source: 'demo',

  async list({ category, q, sort, page, limit, ids = [], device = '' }) {
    let items = publishedRows().map(decorateDemo);
    if (category && category !== 'All') {
      items = items.filter((item) => item.category === category);
    }
    if (device) {
      items = items.filter((item) => item.device === device);
    }
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter((item) =>
        [item.title, item.category, ...item.tags].join(' ').toLowerCase().includes(needle),
      );
    }
    if (ids.length > 0) {
      const order = new Map(ids.map((id, index) => [id, index]));
      items = items
        .filter((item) => order.has(item.id))
        .sort((a, b) => order.get(a.id) - order.get(b.id));
    } else {
      items.sort(SORTS[sort] ?? SORTS.trending);
    }

    const total = items.length;
    const start = (page - 1) * limit;
    return {
      items: items.slice(start, start + limit),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      categories: demoCategories(),
      stats: demoStats(),
      source: 'demo',
    };
  },

  async getFeatured() {
    const rows = publishedRows().map(decorateDemo);
    return rows.find((row) => row.featured) ?? [...rows].sort(SORTS.trending)[0] ?? null;
  },

  async getRandom(category) {
    const pool = publishedRows().filter(
      (row) => !category || category === 'All' || row.category === category,
    );
    if (pool.length === 0) return null;
    return decorateDemo(pool[Math.floor(Math.random() * pool.length)]);
  },

  async getBySlug(slug) {
    const row = publishedRows().find((item) => item.slug === slug);
    return row ? decorateDemo(row) : null;
  },

  async incrementDownloads(slug) {
    const row = getContent().wallpapers.find((item) => item.slug === slug);
    if (!row) return null;
    row.downloads = (row.downloads ?? 0) + 1;
    saveContent();
    return row.downloads;
  },

  async getFileTarget(slug) {
    const row = getContent().wallpapers.find((item) => item.slug === slug);
    if (!row) return null;
    if (row.imageUrl) {
      return { kind: 'remote', url: row.imageUrl, filename: `${row.slug}.jpg` };
    }
    const filePath = path.join(PUBLIC_DIR, `${row.slug}.jpg`);
    if (!fs.existsSync(filePath)) return null;
    return { kind: 'local', path: filePath, filename: `${row.slug}.jpg` };
  },

  async adminList() {
    return [...getContent().wallpapers].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  },

  async adminCreate(input, imageData) {
    const content = getContent();
    if (content.wallpapers.some((row) => row.slug === input.slug)) {
      throw httpError('That slug is already in use.', 409);
    }
    if (imageData) writeLocalImage(input.slug, imageData);
    const row = {
      id: newId(),
      ...input,
      imageUrl: imageData ? null : (input.imageUrl ?? null),
      createdAt: new Date().toISOString(),
    };
    content.wallpapers.unshift(row);
    await saveContent();
    return row;
  },

  async adminUpdate(slug, input, imageData) {
    const content = getContent();
    const index = content.wallpapers.findIndex((row) => row.slug === slug);
    if (index < 0) throw httpError('Wallpaper not found.', 404);
    const existing = content.wallpapers[index];

    if (input.slug !== existing.slug && content.wallpapers.some((row) => row.slug === input.slug)) {
      throw httpError('That slug is already in use.', 409);
    }

    if (imageData) {
      writeLocalImage(input.slug, imageData);
      input.imageUrl = null;
      if (input.slug !== existing.slug) {
        const oldFile = path.join(PUBLIC_DIR, `${existing.slug}.jpg`);
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }
    } else if (input.slug !== existing.slug && !input.imageUrl && !existing.imageUrl) {
      const from = path.join(PUBLIC_DIR, `${existing.slug}.jpg`);
      if (fs.existsSync(from)) fs.renameSync(from, path.join(PUBLIC_DIR, `${input.slug}.jpg`));
    }

    const updated = { ...existing, ...input };
    content.wallpapers[index] = updated;
    await saveContent();
    return updated;
  },

  async adminDelete(slug) {
    const content = getContent();
    const index = content.wallpapers.findIndex((row) => row.slug === slug);
    if (index < 0) throw httpError('Wallpaper not found.', 404);
    const [removed] = content.wallpapers.splice(index, 1);
    await saveContent();
    if (!removed.imageUrl) {
      const file = path.join(PUBLIC_DIR, `${removed.slug}.jpg`);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    return true;
  },
};

function demoCategories() {
  return [...new Set(publishedRows().map((item) => item.category))].sort();
}

function demoStats() {
  const rows = publishedRows();
  return {
    wallpapers: rows.length,
    downloads: rows.reduce((sum, item) => sum + (item.downloads ?? 0), 0),
    categories: new Set(rows.map((item) => item.category)).size,
  };
}

/* -------------------------------------------------------------------------- */
/* Supabase store                                                             */
/* -------------------------------------------------------------------------- */

const supabase = config.useSupabase
  ? createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

function storageUrl(storagePath) {
  if (!storagePath) return null;
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  const clean = String(storagePath).replace(/^\/+/, '');
  return `${config.supabaseUrl}/storage/v1/object/public/${config.storageBucket}/${clean
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

function fromAdminRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    tags: row.tags ?? [],
    width: row.width,
    height: row.height,
    device: row.device ?? 'desktop',
    accent: row.accent ?? '#6b7a99',
    downloads: row.downloads ?? 0,
    createdAt: row.created_at,
    status: 'published',
    featured: false,
    imageUrl: /^https?:\/\//i.test(row.storage_path ?? '') ? row.storage_path : null,
  };
}

async function uploadImage(slug, dataUrl) {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ''));
  if (!match) throw httpError('Upload a JPEG image.', 400);
  const buffer = Buffer.from(match[1], 'base64');
  if (!buffer.length) throw httpError('That image file is empty.', 400);
  if (buffer.length > 8 * 1024 * 1024) throw httpError('Images must be smaller than 8 MB.', 400);

  const storagePath = `${slug}.jpg`;
  const { error } = await supabase.storage
    .from(config.storageBucket)
    .upload(storagePath, buffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    });
  if (error) throw fail(error, 'image upload');
  return storagePath;
}

function fromRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    tags: row.tags ?? [],
    width: row.width,
    height: row.height,
    accent: row.accent ?? '#6b7a99',
    device: row.device ?? 'desktop',
    downloads: row.downloads ?? 0,
    createdAt: row.created_at,
    url: storageUrl(row.storage_path),
    thumbUrl: storageUrl(row.thumb_path || row.storage_path),
  };
}

function fail(error, action) {
  const err = new Error(`Supabase ${action} failed: ${error.message}`);
  err.status = 502;
  return err;
}

const supabaseStore = {
  source: 'supabase',

  async list({ category, q, sort, page, limit, ids = [], device = '' }) {
    const validIds = ids.filter((id) => UUID_RE.test(id));
    if (ids.length > 0 && validIds.length === 0) {
      return {
        items: [],
        total: 0,
        page,
        pages: 1,
        categories: await supabaseCategories(),
        stats: await supabaseStats(),
        source: 'supabase',
      };
    }

    let query = supabase.from('wallpapers').select('*', { count: 'exact' });
    if (validIds.length > 0) query = query.in('id', validIds);
    if (category && category !== 'All') query = query.eq('category', category);
    if (device) query = query.eq('device', device);
    if (q) {
      const needle = sanitizeSearch(q);
      if (needle) {
        query = query.or(
          `title.ilike.%${needle}%,category.ilike.%${needle}%,tags.cs.{${needle}}`,
        );
      }
    }
    query =
      sort === 'newest'
        ? query.order('created_at', { ascending: false })
        : query.order('downloads', { ascending: false });

    const start = (page - 1) * limit;
    const { data, error, count } = await query.range(start, start + limit - 1);
    if (error) throw fail(error, 'query');

    const [categories, stats] = await Promise.all([supabaseCategories(), supabaseStats()]);
    const total = count ?? data.length;

    return {
      items: data.map(fromRow),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      categories,
      stats,
      source: 'supabase',
    };
  },

  async getFeatured() {
    const { data, error } = await supabase
      .from('wallpapers')
      .select('*')
      .order('downloads', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw fail(error, 'query');
    return data ? fromRow(data) : null;
  },

  async getBySlug(slug) {
    const { data, error } = await supabase
      .from('wallpapers')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw fail(error, 'query');
    return data ? fromRow(data) : null;
  },

  async getRandom(category) {
    const scoped = category && category !== 'All';

    // A plain GET (not HEAD) so a missing table surfaces as an error instead of 0 rows.
    let countQuery = supabase.from('wallpapers').select('id', { count: 'exact' }).limit(1);
    if (scoped) countQuery = countQuery.eq('category', category);
    const { count, error: countError } = await countQuery;
    if (countError) throw fail(countError, 'query');
    if (!count) return null;

    const offset = Math.floor(Math.random() * count);
    let query = supabase
      .from('wallpapers')
      .select('*')
      .order('created_at', { ascending: true })
      .range(offset, offset);
    if (scoped) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw fail(error, 'query');
    return data?.[0] ? fromRow(data[0]) : null;
  },

  async incrementDownloads(slug) {
    const { data, error } = await supabase.rpc('increment_wallpaper_downloads', { p_slug: slug });
    if (error) throw fail(error, 'download counter');
    return typeof data === 'number' ? data : null;
  },

  async getFileTarget(slug) {
    const { data, error } = await supabase
      .from('wallpapers')
      .select('slug, storage_path')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw fail(error, 'query');
    if (!data?.storage_path) return null;
    return {
      kind: 'remote',
      url: storageUrl(data.storage_path),
      filename: `${data.slug}.jpg`,
    };
  },

  async adminList() {
    const { data, error } = await supabase
      .from('wallpapers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw fail(error, 'query');
    return (data ?? []).map(fromAdminRow);
  },

  async adminCreate(input, imageData) {
    const storagePath = imageData ? await uploadImage(input.slug, imageData) : input.imageUrl;
    if (!storagePath) throw httpError('Upload an image or paste an image URL.', 400);

    const { data, error } = await supabase
      .from('wallpapers')
      .insert({
        slug: input.slug,
        title: input.title,
        category: input.category,
        tags: input.tags,
        width: input.width,
        height: input.height,
        device: input.device,
        accent: input.accent,
        downloads: input.downloads ?? 0,
        storage_path: storagePath,
      })
      .select()
      .single();
    if (error) throw fail(error, 'insert');
    return fromAdminRow(data);
  },

  async adminUpdate(slug, input, imageData) {
    const { data: existing, error: readError } = await supabase
      .from('wallpapers')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (readError) throw fail(readError, 'query');
    if (!existing) throw httpError('Wallpaper not found.', 404);

    let storagePath = existing.storage_path;
    if (imageData) {
      storagePath = await uploadImage(input.slug, imageData);
      if (
        existing.storage_path &&
        !/^https?:/i.test(existing.storage_path) &&
        existing.storage_path !== storagePath
      ) {
        try {
          await supabase.storage.from(config.storageBucket).remove([existing.storage_path]);
        } catch {
          /* the new image is already saved */
        }
      }
    } else if (input.imageUrl) {
      storagePath = input.imageUrl;
    } else if (
      input.slug !== existing.slug &&
      existing.storage_path &&
      !/^https?:/i.test(existing.storage_path)
    ) {
      const next = `${input.slug}.jpg`;
      const { error: moveError } = await supabase.storage
        .from(config.storageBucket)
        .move(existing.storage_path, next);
      if (!moveError) storagePath = next;
    }

    const { data, error } = await supabase
      .from('wallpapers')
      .update({
        slug: input.slug,
        title: input.title,
        category: input.category,
        tags: input.tags,
        width: input.width,
        height: input.height,
        device: input.device,
        accent: input.accent,
        downloads: input.downloads ?? 0,
        storage_path: storagePath,
      })
      .eq('slug', slug)
      .select()
      .single();
    if (error) throw fail(error, 'update');
    return fromAdminRow(data);
  },

  async adminDelete(slug) {
    const { data, error } = await supabase
      .from('wallpapers')
      .delete()
      .eq('slug', slug)
      .select('storage_path');
    if (error) throw fail(error, 'delete');
    const removed = data?.[0];
    if (removed?.storage_path && !/^https?:/i.test(removed.storage_path)) {
      try {
        await supabase.storage.from(config.storageBucket).remove([removed.storage_path]);
      } catch {
        /* the row is already gone */
      }
    }
    if (!removed) throw httpError('Wallpaper not found.', 404);
    return true;
  },
};

async function supabaseCategories() {
  try {
    const { data, error } = await supabase.from('wallpapers').select('category').limit(2000);
    if (error) throw error;
    return [...new Set(data.map((row) => row.category))].sort();
  } catch {
    return [];
  }
}

async function supabaseStats() {
  try {
    const { data, error } = await supabase.from('wallpapers').select('downloads').limit(5000);
    if (error) throw error;
    return {
      wallpapers: data.length,
      downloads: data.reduce((sum, row) => sum + (row.downloads ?? 0), 0),
      categories: new Set(data.map((row) => row.category ?? '')).size,
    };
  } catch {
    return { wallpapers: 0, downloads: 0, categories: 0 };
  }
}

let activeStore = config.useSupabase ? supabaseStore : demoStore;

export const store = {
  get source() {
    return activeStore.source;
  },
  list: (params) => activeStore.list(params),
  getFeatured: () => activeStore.getFeatured(),
  getBySlug: (slug) => activeStore.getBySlug(slug),
  getRandom: (category) => activeStore.getRandom(category),
  incrementDownloads: (slug) => activeStore.incrementDownloads(slug),
  getFileTarget: (slug) => activeStore.getFileTarget(slug),
  adminList: () => activeStore.adminList(),
  adminCreate: (input, imageData) => activeStore.adminCreate(input, imageData),
  adminUpdate: (slug, input, imageData) => activeStore.adminUpdate(slug, input, imageData),
  adminDelete: (slug) => activeStore.adminDelete(slug),
};

// A configured project whose `wallpapers` table is missing (schema not run yet)
// must not take the whole site down, so fall back to the bundled catalog.
export async function initStore() {
  if (!config.useSupabase) return { source: 'demo', configured: false };
  try {
    const { error } = await supabase.from('wallpapers').select('id').limit(1);
    if (error) throw error;
    activeStore = supabaseStore;
    return { source: 'supabase', configured: true };
  } catch (error) {
    console.warn(
      `[store] Supabase is configured but unusable (${error.message}). Serving the bundled demo catalog.`,
    );
    activeStore = demoStore;
    return { source: 'demo', configured: true, error: error.message };
  }
}
