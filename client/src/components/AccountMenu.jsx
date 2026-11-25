import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '../router.jsx';
import { useAuth } from '../auth.jsx';
import { getDownloads } from '../history.js';
import { btnGhostSm } from '../ui.js';

export default function AccountMenu({ onSignIn }) {
  const { navigate } = useRouter();
  const { user, initializing, favorites, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);
  const containerRef = useRef(null);

  const metadata = user?.user_metadata ?? {};
  const name = metadata.full_name || metadata.name || user?.email || 'Signed in';
  const avatar = metadata.avatar_url || metadata.picture;

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !user) return;
    setDownloadCount(getDownloads(user.id).length);
  }, [open, user]);

  if (initializing) {
    return <span className="h-9 w-9 rounded-full border border-line bg-panel" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <button type="button" className={btnGhostSm} onClick={onSignIn}>
        <i className="fa-brands fa-google text-[11px]" aria-hidden="true" />
        Sign in
      </button>
    );
  }

  const initial = name.charAt(0).toUpperCase();

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-line-2 bg-raised text-[12px] font-medium text-ink transition-colors hover:border-ink-3"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((value) => !value)}
      >
        {avatar ? (
          <img src={avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] w-60 rounded-2xl border border-line-2 bg-panel p-1.5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.95)]"
          role="menu"
        >
          <div className="flex items-center gap-2.5 border-b border-line px-2.5 pb-2.5 pt-1.5">
            <span className="grid h-8 w-8 flex-none place-items-center overflow-hidden rounded-full border border-line bg-raised text-[12px]">
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                initial
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] text-ink">{name}</span>
              <span className="block truncate text-[11px] text-ink-3">{user.email}</span>
            </span>
          </div>

          <p className="px-2.5 pb-1 pt-2 text-[11px] text-ink-3">
            {favorites.size} saved · {downloadCount} downloaded
          </p>

          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-raised hover:text-ink"
            role="menuitem"
            onClick={() => go('/profile')}
          >
            <i className="fa-regular fa-user w-3 text-center text-[11px] text-ink-3" aria-hidden="true" />
            Profile
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-raised hover:text-ink"
            role="menuitem"
            onClick={() => go('/downloads')}
          >
            <i
              className="fa-solid fa-arrow-down w-3 text-center text-[11px] text-ink-3"
              aria-hidden="true"
            />
            Downloads
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-raised hover:text-ink"
            role="menuitem"
            onClick={() => go('/favourites')}
          >
            <i className="fa-regular fa-heart w-3 text-center text-[11px] text-ink-3" aria-hidden="true" />
            Favourites
          </button>

          <div className="my-1 border-t border-line" />

          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-raised hover:text-ink"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
              navigate('/');
            }}
          >
            <i
              className="fa-solid fa-arrow-right-from-bracket w-3 text-center text-[11px] text-ink-3"
              aria-hidden="true"
            />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
