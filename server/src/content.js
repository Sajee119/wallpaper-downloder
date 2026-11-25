// Editable site content. The admin panel writes this file and the public demo
// store reads it, so changes made in /admin appear on the site immediately.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wallpapers as seedWallpapers, WALLPAPER_DIMENSIONS } from './seed-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'content.json');

export const DEFAULT_SETTINGS = {
  siteName: 'Pixelfall',
  logoLetter: '',
  tagline: 'Wallpapers worth staring at',
  heroKicker: 'Curated wallpaper archive',
  heroBody:
    'Landscapes, city lights and gradients, filed by mood. Preview any wallpaper, then save the original file. No account needed.',
  announcement: '',
  announcementLabel: 'Read more',
  announcementLink: '',
  footerNote: 'Free to download. No attribution required.',
  contactEmail: 'hello@pixelfall.app',
  themeDefault: 'auto',
  downloadsRequireSignIn: true,
};

export const newId = () => crypto.randomUUID();

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function seedRows() {
  return seedWallpapers.map((item) => ({
    id: item.slug,
    slug: item.slug,
    title: item.title,
    category: item.category,
    tags: item.tags,
    width: item.width ?? WALLPAPER_DIMENSIONS.width,
    height: item.height ?? WALLPAPER_DIMENSIONS.height,
    device: item.device ?? 'desktop',
    accent: item.accent,
    downloads: item.downloads ?? 0,
    createdAt: item.createdAt,
    status: 'published',
    featured: false,
    imageUrl: null,
  }));
}

function normalizeRow(row) {
  const width = Number(row?.width);
  const height = Number(row?.height);
  const downloads = Number(row?.downloads);
  return {
    id: String(row?.id ?? row?.slug ?? newId()),
    slug: String(row?.slug ?? ''),
    title: String(row?.title ?? 'Untitled').slice(0, 120),
    category: String(row?.category ?? 'Uncategorised').slice(0, 60),
    tags: Array.isArray(row?.tags) ? row.tags.map((tag) => String(tag)).slice(0, 12) : [],
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : WALLPAPER_DIMENSIONS.width,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : WALLPAPER_DIMENSIONS.height,
    device: DEVICES.has(row?.device) ? row.device : 'desktop',
    accent: /^#[0-9a-fA-F]{6}$/.test(String(row?.accent ?? '')) ? String(row.accent) : '#6b7a99',
    downloads:
      Number.isFinite(downloads) && downloads >= 0 ? Math.round(downloads) : 0,
    createdAt: row?.createdAt ?? new Date().toISOString(),
    status: row?.status === 'draft' ? 'draft' : 'published',
    featured: Boolean(row?.featured),
    imageUrl: typeof row?.imageUrl === 'string' && row.imageUrl.trim() ? row.imageUrl.trim() : null,
  };
}

function normalizeMessage(row) {
  return {
    id: String(row?.id ?? newId()),
    name: String(row?.name ?? 'Guest').slice(0, 80),
    email: String(row?.email ?? '').slice(0, 160),
    subject: String(row?.subject ?? 'Website request').slice(0, 120),
    body: String(row?.body ?? '').slice(0, 4000),
    createdAt: row?.createdAt ?? new Date().toISOString(),
    status: ['new', 'read', 'replied'].includes(row?.status) ? row.status : 'new',
    reply: String(row?.reply ?? '').slice(0, 4000),
    repliedAt: row?.repliedAt ?? null,
  };
}

const DEVICES = new Set(['desktop', 'tablet', 'mobile']);

function normalize(raw) {
  return {
    settings: { ...DEFAULT_SETTINGS, ...(raw?.settings ?? {}) },
    wallpapers: Array.isArray(raw?.wallpapers)
      ? raw.wallpapers.map(normalizeRow).filter((row) => row.slug)
      : seedRows(),
    messages: Array.isArray(raw?.messages) ? raw.messages.map(normalizeMessage) : [],
  };
}

let state = null;
let writeQueue = Promise.resolve();

async function persist() {
  const snapshot = JSON.stringify(state, null, 2);
  writeQueue = writeQueue
    .catch(() => {})
    .then(async () => {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
      const temp = `${DATA_FILE}.tmp`;
      await fs.promises.writeFile(temp, snapshot, 'utf8');
      await fs.promises.rename(temp, DATA_FILE);
    })
    .catch((error) => {
      console.error('[content] could not write content.json:', error.message);
    });
  return writeQueue;
}

export async function initContent() {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = JSON.parse(await fs.promises.readFile(DATA_FILE, 'utf8'));
    state = normalize(raw);
  } catch {
    state = { settings: { ...DEFAULT_SETTINGS }, wallpapers: seedRows(), messages: [] };
    await persist();
  }
  return state;
}

export function getContent() {
  if (!state) throw new Error('Content store is not initialised');
  return state;
}

export function saveContent() {
  return persist();
}
