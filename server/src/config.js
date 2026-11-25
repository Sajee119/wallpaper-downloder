// Placeholder values from .env.example must not switch the API into Supabase mode.
function cleanEnv(value) {
  const trimmed = (value || '').trim();
  if (!trimmed || /^your[-_]/.test(trimmed)) return '';
  return trimmed;
}

const supabaseUrl = cleanEnv(process.env.SUPABASE_URL).replace(/\/+$/, '');
const supabaseKey =
  cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanEnv(process.env.SUPABASE_ANON_KEY);

function resolvePort(value) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isInteger(parsed) && parsed > 0 && parsed < 65536) return parsed;
  return 4000;
}

export const config = {
  port: resolvePort(process.env.PORT),
  supabaseUrl,
  supabaseKey,
  supabaseServiceKey: cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'wallpapers',
  useSupabase: Boolean(supabaseUrl && supabaseKey),
  adminEmail: (process.env.ADMIN_EMAIL || '').trim(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminPasswordHash: (process.env.ADMIN_PASSWORD_HASH || '').trim(),
};
