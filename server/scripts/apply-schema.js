// Applies supabase/schema.sql over a direct Postgres connection.
// Add DATABASE_URL (Supabase -> Connect -> Session pooler URI) to server/.env, then: npm run db:apply
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, '../../supabase/schema.sql');
const connectionString = (process.env.DATABASE_URL || '').trim();

if (!connectionString || /^your[-_]/i.test(connectionString)) {
  console.error(
    'Missing DATABASE_URL in server/.env.\n' +
      'Supabase -> Connect -> Session pooler -> copy the URI, replace [YOUR-PASSWORD] with the database password,\n' +
      'then add it to server/.env as DATABASE_URL=postgresql://... and run npm run db:apply again.',
  );
  process.exit(1);
}

const sql = fs.readFileSync(schemaPath, 'utf8');
const isLocal = /(^|@)(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
const client = new pg.Client({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  const { rows } = await client.query(
    "select to_regclass('public.wallpapers') as wallpapers, to_regclass('public.favorites') as favorites",
  );
  console.log('schema applied:', rows[0]);
} catch (error) {
  console.error(`schema failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
