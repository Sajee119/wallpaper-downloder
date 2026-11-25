import { useEffect, useRef, useState } from 'react';
import { THEMES, useTheme } from '../theme.jsx';

export default function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const current = THEMES.find((entry) => entry.key === theme) ?? THEMES[1];

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

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-full border border-line bg-panel/70 text-[12px] text-ink-2 transition-colors hover:border-line-2 hover:bg-panel hover:text-ink"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}. Press T to switch.`}
        title={`Theme: ${current.label} — press T to switch`}
        onClick={() => setOpen((value) => !value)}
      >
        <i className={`fa-solid ${current.icon}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl border border-line-2 bg-panel p-1.5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.95)]"
          role="menu"
          aria-label="Colour theme"
        >
          {THEMES.map((option) => {
            const active = option.key === theme;
            return (
              <button
                key={option.key}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setTheme(option.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
                  active ? 'bg-raised text-ink' : 'text-ink-2 hover:bg-raised hover:text-ink'
                }`}
              >
                <i
                  className={`fa-solid ${option.icon} w-3.5 text-center text-[11px] ${
                    active ? 'text-amber' : 'text-ink-3'
                  }`}
                  aria-hidden="true"
                />
                <span className="flex-1">{option.label}</span>
                <span className="text-[10.5px] text-ink-3">{option.note}</span>
                {active && (
                  <i className="fa-solid fa-check text-[10px] text-amber" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
