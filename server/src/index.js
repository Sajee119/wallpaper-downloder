import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { adminRouter, publicRouter } from './admin.js';
import { config } from './config.js';
import { initContent } from './content.js';
import { initStore, store } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, '../public/wallpapers');
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

app.use(
  '/wallpapers',
  express.static(IMAGES_DIR, { maxAge: '7d', immutable: true, fallthrough: false }),
);

app.use('/api', publicRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    source: store.source,
    supabase: config.useSupabase,
    supabaseReady: store.source === 'supabase',
  });
});

app.get(
  '/api/wallpapers',
  asyncHandler(async (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : 'All';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
    const sort = req.query.sort === 'newest' ? 'newest' : 'trending';
    const page = clampInt(req.query.page, 1, 1, 500);
    const limit = clampInt(req.query.limit, 12, 1, 48);
    const deviceParam =
      typeof req.query.device === 'string' ? req.query.device.toLowerCase() : '';
    const device = ['desktop', 'tablet', 'mobile'].includes(deviceParam) ? deviceParam : '';
    const ids =
      typeof req.query.ids === 'string'
        ? req.query.ids
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
            .slice(0, 48)
        : [];

    const result = await store.list({ category, q, sort, page, limit, ids, device });
    res.json(result);
  }),
);

// Typeahead for the header search field.
app.get(
  '/api/suggestions',
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
    if (q.length < 2) return res.json({ wallpapers: [], categories: [], tags: [] });

    const result = await store.list({
      category: 'All',
      q,
      sort: 'trending',
      page: 1,
      limit: 6,
      ids: [],
    });
    const needle = q.toLowerCase();

    const tags = [...new Set(result.items.flatMap((item) => item.tags ?? []))]
      .filter((tag) => tag.toLowerCase().includes(needle))
      .slice(0, 4);
    const categories = (result.categories ?? [])
      .filter((category) => category.toLowerCase().includes(needle))
      .slice(0, 4);

    res.json({
      wallpapers: result.items.slice(0, 5).map(({ slug, title, category, thumbUrl }) => ({
        slug,
        title,
        category,
        thumbUrl,
      })),
      categories,
      tags,
    });
  }),
);

app.get(
  '/api/featured',
  asyncHandler(async (req, res) => {
    const item = await store.getFeatured();
    if (!item) return res.status(404).json({ error: 'No wallpapers yet' });
    res.json(item);
  }),
);

app.get(
  '/api/categories',
  asyncHandler(async (req, res) => {
    const result = await store.list({ category: 'All', q: '', sort: 'trending', page: 1, limit: 1 });
    res.json({ categories: result.categories, stats: result.stats, source: result.source });
  }),
);

app.get(
  '/api/wallpapers/random',
  asyncHandler(async (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : 'All';
    const item = await store.getRandom(category);
    if (!item) return res.status(404).json({ error: 'No wallpapers yet' });
    res.json(item);
  }),
);

app.get(
  '/api/wallpapers/:slug',
  asyncHandler(async (req, res) => {
    const item = await store.getBySlug(req.params.slug);
    if (!item) return res.status(404).json({ error: 'Wallpaper not found' });
    res.json(item);
  }),
);

// Streams the original file with an attachment header so the browser saves it,
// including when the bytes live in Supabase Storage.
app.get(
  '/api/wallpapers/:slug/file',
  asyncHandler(async (req, res) => {
    const target = await store.getFileTarget(req.params.slug);
    if (!target) return res.status(404).json({ error: 'Wallpaper file not found' });

    if (target.kind === 'local') {
      return res.download(target.path, target.filename);
    }

    const upstream = await fetch(target.url);
    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({ error: 'Could not read the wallpaper from Supabase Storage' });
    }
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    const size = upstream.headers.get('content-length');
    if (size) res.setHeader('Content-Length', size);
    res.setHeader('Content-Disposition', `attachment; filename="${target.filename}"`);
    await pipeline(Readable.fromWeb(upstream.body), res);
  }),
);

app.post(
  '/api/wallpapers/:slug/download',
  asyncHandler(async (req, res) => {
    const downloads = await store.incrementDownloads(req.params.slug);
    if (downloads === null) return res.status(404).json({ error: 'Wallpaper not found' });
    res.json({
      slug: req.params.slug,
      downloads,
      downloadUrl: `/api/wallpapers/${encodeURIComponent(req.params.slug)}/file`,
    });
  }),
);

// In production the built React app is served by this same Node process.
if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/wallpapers/')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (status >= 500) console.error('[api]', err);
  res.status(status).json({ error: err.message || 'Something went wrong' });
});

await initContent();
await initStore();

// Hosts (Railway, Render, Fly, a VPS) need a public bind address; local dev keeps loopback.
const host = process.env.HOST || '127.0.0.1';

const server = app.listen(config.port, host, () => {
  console.log(
    `Pixelfall API on http://${host}:${config.port} — data source: ${
      config.useSupabase ? 'Supabase' : 'bundled demo catalog'
    }`,
  );
});

// A second copy of the API (a forgotten dev server, or another app on the same
// port) used to crash the process with an unhandled 'error' event. Report it
// clearly instead, so the fix is obvious: stop the other process or change PORT.
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `[api] Port ${config.port} on ${host} is already in use. Stop the process using it ` +
        `(or set PORT to a free port) and restart.`,
    );
    process.exit(1);
  }
  throw error;
});
