import { useEffect } from 'react';

const SHORTCUTS = [
  { keys: ['/', 'Ctrl', 'K'], label: 'Focus the search field' },
  { keys: ['T'], label: 'Cycle light, dark and night' },
  { keys: ['?'], label: 'Open this shortcut list' },
  { keys: ['←', '→'], label: 'Move through a preview' },
  { keys: ['Esc'], label: 'Close a preview or dialog' },
];

export default function ShortcutsDialog({ onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="w-full max-w-[440px] rounded-3xl border border-line-2 bg-panel p-5 shadow-[0_50px_120px_-50px_rgba(0,0,0,0.95)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="shortcuts-title" className="font-display text-[22px] leading-none">
              Keyboard shortcuts
            </h2>
            <p className="mt-1.5 text-[12px] text-ink-3">
              They pause while you are typing in a field.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 flex-none place-items-center rounded-lg border border-line text-ink-3 transition-colors hover:text-ink"
            aria-label="Close shortcuts"
          >
            <i className="fa-solid fa-xmark text-[13px]" aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-4 divide-y divide-line border-y border-line">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.label} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-ink-2">{shortcut.label}</dt>
              <dd className="flex flex-none gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="rounded border border-line bg-raised px-1.5 py-0.5 text-[11px] text-ink-2"
                  >
                    {key}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>

        <button type="button" onClick={onClose} className="mt-4 w-full rounded-lg bg-ink px-4 py-2 text-[13px] font-medium text-paper transition-opacity hover:opacity-90">
          Got it
        </button>
      </div>
    </div>
  );
}
