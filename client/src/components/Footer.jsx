import { Link } from '../router.jsx';
import { shell } from '../ui.js';

const LINKS = [
  { to: '/', label: 'Browse' },
  { to: '/devices', label: 'Devices' },
  { to: '/categories', label: 'Collections' },
  { to: '/favourites', label: 'Favourites' },
  { to: '/downloads', label: 'Downloads' },
  { to: '/contact', label: 'Contact' },
  { to: '/about', label: 'About' },
];

export default function Footer({ stats, siteName = 'Pixelfall', logoLetter = '', note, onShortcuts }) {
  const name = siteName.trim() || 'Pixelfall';
  const mark = (String(logoLetter).trim() || name).charAt(0).toUpperCase();
  return (
    <footer className="mt-auto border-t border-line bg-panel/30">
      <div className={shell}>
        <div className="grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(3,1fr)] lg:gap-10">
          <div>
            <Link to="/" className="flex items-center gap-2.5" aria-label={`${name} home`}>
              <span
                className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber to-[#a9762f] font-display text-[20px] leading-none text-[#1b1207]"
                aria-hidden="true"
              >
                {mark}
              </span>
              <span className="font-display text-[22px] leading-none">{name}</span>
            </Link>
            <p className="mt-3 max-w-[280px] text-[13px] leading-relaxed text-ink-2">
              A curated wallpaper archive. Original files, no watermark, free to download.
            </p>
          </div>

          <nav className="flex flex-col gap-2 text-[12.5px] text-ink-2" aria-label="Footer">
            <p className="eyebrow mb-1">Explore</p>
            {LINKS.map((entry) => (
              <Link key={entry.to} to={entry.to} className="transition-colors hover:text-ink">
                {entry.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2 text-[12.5px] text-ink-2">
            <p className="eyebrow mb-1">Collection</p>
            <span className="tabular-nums">{stats?.wallpapers ?? 0} wallpapers</span>
            <span className="tabular-nums">{stats?.downloads ?? 0} downloads</span>
            <span className="tabular-nums">{stats?.categories ?? 0} collections</span>
          </div>

          <div className="flex flex-col gap-2 text-[12.5px] text-ink-2">
            <p className="eyebrow mb-1">Built with</p>
            <span>React and Vite</span>
            <span>Node and Express</span>
            <span>Supabase</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-3 border-t border-line py-5 text-[11.5px] text-ink-3">
          <span>
            © {new Date().getFullYear()} {name}
          </span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>{note || 'Free to download. No attribution required.'}</span>
            {onShortcuts && (
              <button
                type="button"
                onClick={onShortcuts}
                className="transition-colors hover:text-ink-2"
              >
                Shortcuts
              </button>
            )}
            <Link to="/admin/login" className="transition-colors hover:text-ink-2">
              Admin
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
