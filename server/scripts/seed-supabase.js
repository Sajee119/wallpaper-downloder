// Uploads the bundled images to Supabase Storage and upserts the catalog rows.
// Requires SUPABASE_SERVICE_ROLE_KEY in server/.env and the schema from supabase/schema.sql.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { wallpapers, WALLPAPER_DIMENSIONS } from '../src/seed-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, '../public/wallpapers');
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'wallpapers';

const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Add them to server/.env, run supabase/schema.sql in the Supabase SQL editor, then retry.',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Fail before uploading 25 images if the tables from supabase/schema.sql are missing.
const { error: tableError } = await supabase.from('wallpapers').select('id').limit(1);
if (tableError) {
  console.error(
    `Cannot use public.wallpapers: ${tableError.message}\n\n` +
      'Run supabase/schema.sql in the Supabase SQL editor first (SQL Editor -> New query -> paste -> Run).\n' +
      'If you already ran it, check that the editor did not report an error: it applies the file as one transaction.',
  );
  process.exit(1);
}

// A public bucket is all the images need; create it if the project has none yet.
const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
if (bucketListError) {
  console.error(`Cannot list storage buckets: ${bucketListError.message}`);
  process.exit(1);
}
if (!buckets?.some((item) => item.name === bucket)) {
  const { error: bucketError } = await supabase.storage.createBucket(bucket, { public: true });
  if (bucketError && !/already exists/i.test(bucketError.message)) {
    console.error(`Cannot create storage bucket "${bucket}": ${bucketError.message}`);
    process.exit(1);
  }
  console.log(`created public storage bucket ${bucket}`);
}

const rows = [];

for (const item of wallpapers) {
  const filename = `${item.slug}.jpg`;
  const filePath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`skip ${item.slug}: ${filename} not found`);
    continue;
  }

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filename, fs.readFileSync(filePath), { contentType: 'image/jpeg', upsert: true });
  if (uploadError) {
    console.error(`upload failed for ${filename}: ${uploadError.message}`);
    process.exit(1);
  }

  rows.push({
    slug: item.slug,
    title: item.title,
    category: item.category,
    tags: item.tags,
    width: item.width ?? WALLPAPER_DIMENSIONS.width,
    height: item.height ?? WALLPAPER_DIMENSIONS.height,
    device: item.device ?? 'desktop',
    storage_path: filename,
    accent: item.accent,
    downloads: item.downloads,
    created_at: item.createdAt,
  });
  console.log(`uploaded ${filename}`);
}

const { error } = await supabase.from('wallpapers').upsert(rows, { onConflict: 'slug' });
if (error) {
  console.error(`row upsert failed: ${error.message}`);
  process.exit(1);
}

console.log(`\nSeeded ${rows.length} wallpapers into Supabase (bucket: ${bucket}).`);
