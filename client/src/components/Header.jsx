import { useEffect, useMemo, useRef, useState } from 'react';
import AccountMenu from './AccountMenu.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { Link, matchRoute, useRouter } from '../router.jsx';
import { fetchSuggestions } from '../api.js';

const NAV = [
  { to: '/', label: 'Browse', pages: ['home', 'detail'] },
  { to: '/devices', label: 'Devices', pages: ['devices'] },
  { to: '/categories', label: 'Collections', pages: ['categories'] },
  { to: '/favourites', label: 'Favourites', pages: ['favourites'] },
  { to: '/about', label: 'About', pages: ['about'] },
];

const TYPE_ICON = {
  wallpaper: 'fa-regular fa-image',
  category: 'fa-solid fa-layer-group',
  tag: 'fa-solid fa-hashtag',
};

export default function Header({ query, onQuery, source, siteName = 'Pixelfall', logoLetter = '', onSignIn }) {
  const { path, navigate } = useRouter();
  const route = matchRoute(path);
  const name = siteName.trim() || 'Pixelfall';
  const mark = (String(logoLetter).trim() || name).charAt(0).toUpperCase();

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef(null);

  const entries = useMemo(() => {
    if (!suggestions) return [];
    return [
      ...suggestions.wallpapers.map((item) => ({
        type: 'wallpaper',
        key: `w-${item.slug}`,
        label: item.title,
        meta: item.category,
        slug: item.slug,
      })),
      ...suggestions.categories.map((category) => ({
        type: 'category',
        key: `c-${category}`,
        label: category,
        meta: 'Collection',
      })),
      ...suggestions.tags.map((tag) => ({
        type: 'tag',
        key: `t-${tag}`,
        label: tag,
        meta: 'Tag',
      })),
    ];
  }, [suggestions]);

  useEffect(() => {
    const focusSearch = () => {
      const input = searchRef.current?.querySelector('input');
      if (!input) return;
      input.focus();
      input.select();
      setSuggestOpen(true);
    };
    window.addEventListener('pixelfall:focus-search', focusSearch);
    return () => window.removeEventListener('pixelfall:focus-search', focusSearch);
  }, []);

  useEffect(() => {
    if (!suggestOpen) return undefined;
    const onPointerDown = (event) => {
      if (!searchRef.current?.contains(event.target)) setSuggestOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [suggestOpen]);

  useEffect(() => {
    const term = query.trim();
    if (!suggestOpen || term.length < 2) {
      setSuggestions(null);
      setActiveIndex(-1);
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchSuggestions(term, controller.signal)
        .then((data) => {
          if (!active) return;
          setSuggestions(data);
          setActiveIndex(-1);
        })
        .catch(() => {});
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, suggestOpen]);

  const choose = (entry) => {
    setSuggestOpen(false);
    if (entry.type === 'wallpaper') {
      navigate(`/w/${encodeURIComponent(entry.slug)}`);
    } else if (entry.type === 'category') {
      navigate(`/c/${encodeURIComponent(entry.label)}`);
    } else {
      onQuery(entry.label);
      navigate('/');
    }
  };

  const onSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      setSuggestOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setSuggestOpen(true);
      if (entries.length === 0) return;
      setActiveIndex((index) => {
        const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
        if (next < 0) return entries.length - 1;
        if (next >= entries.length) return 0;
        return next;
      });
      return;
    }
    if (event.key === 'Enter' && activeIndex >= 0 && entries[activeIndex]) {
      event.preventDefault();
      choose(entries[activeIndex]);
    }
  };

  const term = query.trim();
  const showPopup = suggestOpen && term.length >= 2;

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 sm:h-[68px] sm:flex-nowrap sm:px-8 sm:py-0">
        <Link to="/" className="flex items-center gap-2.5" aria-label={`${name} home`}>
          <span
            className="grid h-9 w-9 place-items-center rounded-[10px] bg-gradient-to-br from-amber to-[#a9762f] font-display text-[20px] leading-none text-[#1b1207] shadow-[0_12px_24px_-18px_rgba(217,166,94,0.9)]"
            aria-hidden="true"
          >
            {mark}
          </span>
          <span className="font-display text-[22px] leading-none tracking-[-0.015em]">{name}</span>
        </Link>

        <nav
          className="order-4 -mx-1 flex w-full items-center gap-0.5 overflow-x-auto pb-1 text-[12.5px] sm:order-none sm:mx-0 sm:w-auto sm:overflow-visible sm:pb-0"
          aria-label="Primary"
        >
          {NAV.map((entry) => {
            const active = entry.pages.includes(route.page);
            return (
              <Link
                key={entry.to}
                to={entry.to}
                aria-current={active ? 'page' : undefined}
                className="nav-pill shrink-0 whitespace-nowrap"
              >
                {entry.label}
              </Link>
            );
          })}
        </nav>

        <div
          ref={searchRef}
          className="relative order-3 basis-full sm:order-none sm:ml-auto sm:basis-auto sm:max-w-[300px]"
        >
          <label className="relative block">
            <i
              className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-3"
              aria-hidden="true"
            />
            <input
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showPopup}
              aria-controls="search-suggestions"
              aria-activedescendant={
                activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
              }
              value={query}
              onChange={(event) => {
                onQuery(event.target.value);
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search wallpapers"
              aria-label="Search wallpapers"
              className="h-9 w-full rounded-[10px] border border-line bg-panel/70 pl-9 pr-3.5 text-[13px] text-ink transition-colors placeholder:text-ink-3 focus:border-line-2 focus:bg-panel focus:outline-none"
            />
          </label>

          {showPopup && (
            <div
              id="search-suggestions"
              role="listbox"
              aria-label="Search suggestions"
              className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-line-2 bg-panel p-1 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.95)]"
            >
              {entries.length === 0 ? (
                <p className="px-3 py-2 text-[12px] text-ink-3">No matches</p>
              ) : (
                entries.map((entry, index) => (
                  <button
                    key={entry.key}
                    id={`suggestion-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(entry)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
                      index === activeIndex ? 'bg-raised text-ink' : 'text-ink-2'
                    }`}
                  >
                    <i
                      className={`${TYPE_ICON[entry.type]} w-3 text-center text-[11px] text-ink-3`}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate text-[13px]">{entry.label}</span>
                    <span className="text-[11px] text-ink-3">{entry.meta}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <span className="hidden items-center gap-2 rounded-full border border-line bg-panel/50 px-2.5 py-1 text-[11px] text-ink-3 md:inline-flex">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              source === 'supabase' ? 'bg-emerald-400' : 'bg-ink-3'
            }`}
            aria-hidden="true"
          />
          {source === 'supabase' ? 'Live catalog' : 'Demo catalog'}
        </span>

        <div className="order-2 ml-auto flex items-center gap-2 sm:order-none sm:ml-0">
          <ThemeToggle />
          <AccountMenu onSignIn={onSignIn} />
        </div>
      </div>
    </header>
  );
}
