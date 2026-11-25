import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'pixelfall:theme';
const ORDER = ['light', 'dark', 'night'];

export const THEMES = [
  { key: 'light', label: 'Light', note: 'Paper', icon: 'fa-sun' },
  { key: 'dark', label: 'Dark', note: 'Graphite', icon: 'fa-moon' },
  { key: 'night', label: 'Night', note: 'True black', icon: 'fa-star' },
];

function readStored() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return ORDER.includes(value) ? value : null;
  } catch {
    return null;
  }
}

function systemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
}

function remember(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage may be blocked */
  }
}

const ThemeContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  cycleTheme: () => {},
  setDefaultTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => readStored() ?? systemTheme());
  const [chosen, setChosen] = useState(() => readStored() !== null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Until the visitor picks a theme, follow the operating system.
  useEffect(() => {
    if (chosen) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setThemeState(query.matches ? 'light' : 'dark');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [chosen]);

  const setTheme = useCallback((next) => {
    if (!ORDER.includes(next)) return;
    setChosen(true);
    setThemeState(next);
    remember(next);
  }, []);

  const cycleTheme = useCallback(() => {
    setChosen(true);
    setThemeState((current) => {
      const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
      remember(next);
      return next;
    });
  }, []);

  // Applies the site owner's default from admin settings, unless the visitor
  // already chose a theme of their own.
  const setDefaultTheme = useCallback(
    (next) => {
      if (!ORDER.includes(next)) return;
      setThemeState((current) => (chosen ? current : next));
    },
    [chosen],
  );

  const value = useMemo(
    () => ({ theme, setTheme, cycleTheme, setDefaultTheme }),
    [cycleTheme, setDefaultTheme, setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
