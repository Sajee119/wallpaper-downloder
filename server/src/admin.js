import crypto from 'node:crypto';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { DEFAULT_SETTINGS, getContent, newId, saveContent, slugify } from './content.js';
import { store } from './store.js';

const COOKIE_NAME = 'pf_admin';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const DEVICES = new Set(['desktop', 'tablet', 'mobile']);
const THEME_DEFAULTS = new Set(['auto', 'light', 'dark', 'night']);

// Text settings are trimmed to a hard limit; the rest are validated per type.
const TEXT_SETTINGS = {
  siteName: 60,
  logoLetter: 1,
  tagline: 120,
  heroKicker: 80,
  heroBody: 400,
  announcement: 160,
  announcementLabel: 40,
  announcementLink: 300,
  footerNote: 160,
  contactEmail: 160,
};

const sessions = new Map();
const loginAttempts = new Map();
const requestHits = new Map();

export const adminRouter = express.Router();
export const publicRouter = express.Router();

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function badRequest(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  const out = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

function currentSession(req) {
  const token = readCookies(req)[COOKIE_NAME];
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function checkCredentials(email, password) {
  if (!config.adminEmail) return false;
  if (!safeEqual(String(email).trim().toLowerCase(), config.adminEmail.toLowerCase())) {
    return false;
  }
  if (config.adminPasswordHash) {
    const [scheme, saltHex, hashHex] = config.adminPasswordHash.split('$');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    if (!expected.length) return false;
    const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), expected.length);
    return crypto.timingSafeEqual(expected, actual);
  }
  if (!config.adminPassword) return false;
  return safeEqual(String(password), config.adminPassword);
}

function recentHits(map, key, windowMs) {
  const now = Date.now();
  const hits = (map.get(key) ?? []).filter((time) => now - time < windowMs);
  map.set(key, hits);
  return hits;
}

function clientKey(req) {
  return req.ip || req.socket?.remoteAddress || 'local';
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.host === req.headers.host) return true;
  if (req.headers['x-forwarded-host'] && url.host === req.headers['x-forwarded-host']) return true;
  // The Vite dev proxy rewrites Host, so accept loopback origins in local development.
  return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
}

function requireAdmin(req, res, next) {
  const session = currentSession(req);
  if (!session) return res.status(401).json({ authenticated: false, error: 'Sign in first.' });
  req.admin = session;
  return next();
}

function normalizeWallpaperInput(body, existing = null) {
  const title = String(body?.title ?? '').trim().slice(0, 120);
  if (!title) throw badRequest('A title is required.');

  const category = String(body?.category ?? '').trim().slice(0, 60);
  if (!category) throw badRequest('A collection is required.');

  const slug = slugify(String(body?.slug ?? '').trim() || title);
  if (!slug) throw badRequest('A slug is required.');

  const width = Number.parseInt(body?.width, 10);
  const height = Number.parseInt(body?.height, 10);
  const downloads = Number.parseInt(body?.downloads, 10);
  const rawTags = Array.isArray(body?.tags) ? body.tags : String(body?.tags ?? '').split(',');
  const tags = [...new Set(rawTags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];

  return {
    title,
    slug,
    category,
    tags: tags.slice(0, 12),
    device: DEVICES.has(body?.device) ? body.device : (existing?.device ?? 'desktop'),
    width: Number.isFinite(width) && width > 0 ? width : (existing?.width ?? 1392),
    height: Number.isFinite(height) && height > 0 ? height : (existing?.height ?? 752),
    accent: /^#[0-9a-fA-F]{6}$/.test(String(body?.accent ?? ''))
      ? String(body.accent)
      : (existing?.accent ?? '#6b7a99'),
    downloads:
      Number.isFinite(downloads) && downloads >= 0
        ? downloads
        : (existing?.downloads ?? 0),
    status: body?.status === 'draft' ? 'draft' : 'published',
    featured: Boolean(body?.featured),
    imageUrl:
      'imageUrl' in (body ?? {})
        ? String(body.imageUrl ?? '').trim() || null
        : (existing?.imageUrl ?? null),
  };
}

function trimSetting(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

/* -------------------------------------------------------------------------- */
/* Public endpoints: site settings and the request form                       */
/* -------------------------------------------------------------------------- */

publicRouter.get('/settings', (req, res) => {
  res.json({ settings: getContent().settings });
});

publicRouter.post(
  '/messages',
  asyncHandler(async (req, res) => {
    // Hidden field: real visitors never fill it in.
    if (String(req.body?.website ?? '').trim()) return res.json({ ok: true });

    const hits = recentHits(requestHits, clientKey(req), 60 * 60 * 1000);
    if (hits.length >= 6) {
      return res.status(429).json({ error: 'Too many requests. Try again in an hour.' });
    }

    const name = trimSetting(req.body?.name, 80);
    const email = trimSetting(req.body?.email, 160);
    const subject = trimSetting(req.body?.subject, 120) || 'Website request';
    const body = trimSetting(req.body?.body, 4000);

    if (!name) return res.status(400).json({ error: 'Tell us your name.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (body.length < 10) return res.status(400).json({ error: 'Write a little more detail.' });

    hits.push(Date.now());
    requestHits.set(clientKey(req), hits);

    const content = getContent();
    content.messages.unshift({
      id: newId(),
      name,
      email,
      subject,
      body,
      createdAt: new Date().toISOString(),
      status: 'new',
      reply: '',
      repliedAt: null,
    });
    await saveContent();
    res.status(201).json({ ok: true });
  }),
);

/* -------------------------------------------------------------------------- */
/* Admin auth                                                                 */
/* -------------------------------------------------------------------------- */

adminRouter.use((req, res, next) => {
  if (!['GET', 'HEAD'].includes(req.method) && !sameOrigin(req)) {
    return res.status(403).json({ error: 'Cross-origin request blocked.' });
  }
  return next();
});

adminRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const ip = clientKey(req);
    if (recentHits(loginAttempts, ip, 10 * 60 * 1000).length >= 8) {
      return res.status(429).json({ error: 'Too many attempts. Wait a few minutes.' });
    }

    const email = String(req.body?.email ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!checkCredentials(email, password)) {
      const hits = loginAttempts.get(ip) ?? [];
      hits.push(Date.now());
      loginAttempts.set(ip, hits);
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    loginAttempts.delete(ip);
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, {
      email: config.adminEmail,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_MS,
    });
    res.json({ authenticated: true, email: config.adminEmail });
  }),
);

adminRouter.post('/logout', (req, res) => {
  const token = readCookies(req)[COOKIE_NAME];
  if (token) sessions.delete(token);
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ authenticated: false });
});

adminRouter.get('/session', (req, res) => {
  const session = currentSession(req);
  if (!session) return res.json({ authenticated: false });
  res.json({ authenticated: true, email: session.email });
});

adminRouter.use(requireAdmin);

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

adminRouter.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const content = getContent();
    const wallpapers = await store.adminList();
    const published = wallpapers.filter((row) => row.status !== 'draft');
    res.json({
      source: store.source,
      settings: content.settings,
      totals: {
        wallpapers: wallpapers.length,
        published: published.length,
        drafts: wallpapers.length - published.length,
        downloads: wallpapers.reduce((sum, row) => sum + (row.downloads ?? 0), 0),
        categories: new Set(published.map((row) => row.category)).size,
        requests: content.messages.length,
        newRequests: content.messages.filter((row) => row.status === 'new').length,
      },
      top: [...published]
        .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))
        .slice(0, 5)
        .map((row) => ({
          slug: row.slug,
          title: row.title,
          category: row.category,
          downloads: row.downloads,
          status: row.status,
        })),
      recentRequests: content.messages.slice(0, 4),
    });
  }),
);

/* -------------------------------------------------------------------------- */
/* Wallpapers                                                                 */
/* -------------------------------------------------------------------------- */

adminRouter.get(
  '/wallpapers',
  asyncHandler(async (req, res) => {
    res.json({ wallpapers: await store.adminList(), source: store.source });
  }),
);

adminRouter.post(
  '/wallpapers',
  asyncHandler(async (req, res) => {
    const input = normalizeWallpaperInput(req.body);
    const row = await store.adminCreate(input, req.body?.imageData);
    res.status(201).json({ wallpaper: row });
  }),
);

adminRouter.patch(
  '/wallpapers/:slug',
  asyncHandler(async (req, res) => {
    const rows = await store.adminList();
    const existing = rows.find((row) => row.slug === req.params.slug);
    if (!existing) throw badRequest('Wallpaper not found.', 404);

    const input = normalizeWallpaperInput(req.body, existing);
    const row = await store.adminUpdate(req.params.slug, input, req.body?.imageData);
    res.json({ wallpaper: row });
  }),
);

adminRouter.delete(
  '/wallpapers/:slug',
  asyncHandler(async (req, res) => {
    await store.adminDelete(req.params.slug);
    res.json({ ok: true });
  }),
);

/* -------------------------------------------------------------------------- */
/* Site settings                                                              */
/* -------------------------------------------------------------------------- */

adminRouter.get('/settings', (req, res) => {
  res.json({ settings: getContent().settings });
});

adminRouter.put(
  '/settings',
  asyncHandler(async (req, res) => {
    const content = getContent();
    const body = req.body ?? {};
    for (const [key, max] of Object.entries(TEXT_SETTINGS)) {
      if (key in body) content.settings[key] = trimSetting(body[key], max);
    }

    if ('themeDefault' in body) {
      const next = String(body.themeDefault ?? '');
      content.settings.themeDefault = THEME_DEFAULTS.has(next) ? next : 'auto';
    }

    if ('downloadsRequireSignIn' in body) {
      const value = body.downloadsRequireSignIn;
      content.settings.downloadsRequireSignIn = value === true || value === 'true';
    }

    // Only allow in-site paths or absolute http(s) links in the announcement bar.
    if (!/^(\/|https?:\/\/)/i.test(content.settings.announcementLink)) {
      content.settings.announcementLink = '';
    }

    if (!content.settings.siteName) content.settings.siteName = DEFAULT_SETTINGS.siteName;
    await saveContent();
    res.json({ settings: content.settings });
  }),
);

/* -------------------------------------------------------------------------- */
/* Requests inbox                                                             */
/* -------------------------------------------------------------------------- */

adminRouter.get('/messages', (req, res) => {
  res.json({ messages: getContent().messages });
});

adminRouter.patch(
  '/messages/:id',
  asyncHandler(async (req, res) => {
    const content = getContent();
    const message = content.messages.find((row) => row.id === req.params.id);
    if (!message) throw badRequest('Request not found.', 404);

    if (typeof req.body?.reply === 'string') message.reply = req.body.reply.trim().slice(0, 4000);
    if (['new', 'read', 'replied'].includes(req.body?.status)) {
      message.status = req.body.status;
      if (message.status === 'replied') message.repliedAt = new Date().toISOString();
    }
    await saveContent();
    res.json({ message });
  }),
);

adminRouter.delete(
  '/messages/:id',
  asyncHandler(async (req, res) => {
    const content = getContent();
    const index = content.messages.findIndex((row) => row.id === req.params.id);
    if (index < 0) throw badRequest('Request not found.', 404);
    content.messages.splice(index, 1);
    await saveContent();
    res.json({ ok: true });
  }),
);

/* -------------------------------------------------------------------------- */
/* Accounts                                                                   */
/* -------------------------------------------------------------------------- */

let adminClient = null;

function getAdminClient() {
  if (!config.supabaseServiceKey || !config.supabaseUrl) return null;
  adminClient ??= createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const client = getAdminClient();
    if (!client) {
      return res.json({
        available: false,
        reason: 'Add SUPABASE_SERVICE_ROLE_KEY to server/.env to list accounts.',
        users: [],
      });
    }

    const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (error) return res.json({ available: false, reason: error.message, users: [] });

    res.json({
      available: true,
      users: (data?.users ?? []).map((user) => ({
        id: user.id,
        email: user.email ?? '—',
        provider: user.app_metadata?.provider ?? 'email',
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        confirmed: Boolean(user.email_confirmed_at),
      })),
    });
  }),
);
