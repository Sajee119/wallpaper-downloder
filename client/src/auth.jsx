import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isAuthConfigured, supabase } from './supabase.js';

const AuthContext = createContext(null);

function describeError(error) {
  const message = error?.message || 'Something went wrong';
  if (error?.code === '42P01' || /relation .* does not exist/i.test(message)) {
    return 'The favorites table is missing. Run supabase/schema.sql in the Supabase SQL editor.';
  }
  if (error?.code === '42501' || /row-level security/i.test(message)) {
    return 'Favourites are blocked by row level security. Re-run the policies in supabase/schema.sql.';
  }
  if (/provider is not enabled|unsupported provider/i.test(message)) {
    return 'Google sign-in is not enabled for this Supabase project. Turn it on under Authentication → Providers → Google.';
  }
  if (/redirect.*not allowed|redirect_uri_mismatch/i.test(message)) {
    return 'This URL is not in the Supabase redirect allowlist. Add it under Authentication → URL configuration.';
  }
  return message;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(Boolean(supabase));
  const [favorites, setFavorites] = useState(() => new Set());
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [favoritesError, setFavoritesError] = useState('');

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session ?? null);
      })
      .finally(() => {
        if (active) setInitializing(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!supabase || !userId) {
      setFavorites(new Set());
      setFavoritesError('');
      setFavoritesReady(true);
      return undefined;
    }

    let active = true;
    setFavoritesReady(false);

    (async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('wallpaper_id')
        .eq('user_id', userId);

      if (!active) return;
      if (error) {
        setFavoritesError(describeError(error));
        setFavorites(new Set());
      } else {
        setFavoritesError('');
        setFavorites(new Set((data ?? []).map((row) => row.wallpaper_id)));
      }
      setFavoritesReady(true);
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured for this build.');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
        skipBrowserRedirect: true,
      },
    });
    if (error) throw new Error(describeError(error));

    const url = data?.url;
    if (!url) throw new Error('Google sign-in could not start.');

    // A disabled provider would otherwise drop the browser on a raw JSON 400.
    try {
      const probe = await fetch(url, { method: 'GET', redirect: 'manual' });
      if (probe.type !== 'opaqueredirect' && !probe.ok) {
        let message = '';
        try {
          const body = await probe.json();
          message = body.msg || body.message || body.error_description || '';
        } catch {
          /* keep the generic message */
        }
        throw new Error(
          describeError(new Error(message || 'Google sign-in is not available right now.')),
        );
      }
    } catch (probeError) {
      const text = probeError instanceof Error ? probeError.message : '';
      if (text && !/failed to fetch|networkerror|load failed/i.test(text)) throw probeError;
    }

    window.location.assign(url);
  }, []);

  const updateProfile = useCallback(
    async (updates) => {
      if (!supabase || !userId) throw new Error('Sign in to edit your profile.');
      const { data, error } = await supabase.auth.updateUser({ data: updates });
      if (error) throw new Error(describeError(error));
      if (data?.user) {
        setSession((previous) =>
          previous ? { ...previous, user: data.user } : previous,
        );
      }
    },
    [userId],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const toggleFavorite = useCallback(
    async (wallpaperId) => {
      if (!supabase || !userId) throw new Error('Sign in to save wallpapers.');
      const wasSaved = favorites.has(wallpaperId);

      setFavorites((previous) => {
        const next = new Set(previous);
        if (wasSaved) next.delete(wallpaperId);
        else next.add(wallpaperId);
        return next;
      });

      const { error } = wasSaved
        ? await supabase
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('wallpaper_id', wallpaperId)
        : await supabase.from('favorites').insert({ user_id: userId, wallpaper_id: wallpaperId });

      if (error) {
        setFavorites((previous) => {
          const next = new Set(previous);
          if (wasSaved) next.add(wallpaperId);
          else next.delete(wallpaperId);
          return next;
        });
        throw new Error(describeError(error));
      }
    },
    [favorites, userId],
  );

  const value = useMemo(
    () => ({
      configured: isAuthConfigured,
      initializing,
      session,
      user: session?.user ?? null,
      favorites,
      favoritesReady,
      favoritesError,
      signInWithGoogle,
      updateProfile,
      signOut,
      toggleFavorite,
      isFavorite: (wallpaperId) => favorites.has(wallpaperId),
    }),
    [
      initializing,
      session,
      favorites,
      favoritesReady,
      favoritesError,
      signInWithGoogle,
      updateProfile,
      signOut,
      toggleFavorite,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
