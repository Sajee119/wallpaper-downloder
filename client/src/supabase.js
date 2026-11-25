import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Auth and favourites talk to Supabase straight from the browser using the
// public anon key. Row level security in supabase/schema.sql keeps every row
// scoped to auth.uid(), so the key cannot read another user's favourites.
export const isAuthConfigured = Boolean(url && anonKey);

export const supabase = isAuthConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
