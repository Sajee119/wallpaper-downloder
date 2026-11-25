import { useState } from 'react';

const GUIDES = {
  windows: {
    label: 'Windows',
    steps: [
      'Download the original with the button above.',
      'In File Explorer, right-click the saved file and choose “Set as desktop background” — or use Settings → Personalisation → Background → Browse.',
      'Pick Fill for the best coverage on screens with a different shape.',
    ],
  },
  macos: {
    label: 'macOS',
    steps: [
      'Download the original with the button above.',
      'Open System Settings → Wallpaper → Add Photo (or drag the file onto the current wallpaper).',
      'Choose Fill, then set it for one desktop or all of them.',
    ],
  },
  android: {
    label: 'Android',
    steps: [
      'Download the original, then open the file from Files or Photos.',
      'Tap More → “Use as wallpaper” (the wording varies by phone maker).',
      'Pick Home screen, Lock screen or both, then confirm.',
    ],
  },
  ios: {
    label: 'iPhone / iPad',
    steps: [
      'Download the original; it is saved to Photos.',
      'Open Photos → the wallpaper → Share → “Use as Wallpaper”.',
      'Turn off Perspective zoom so the image is not cropped, then tap Set.',
    ],
  },
};

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'windows';
  const agent = navigator.userAgent;
  if (/android/i.test(agent)) return 'android';
  if (/iphone|ipad|ipod/i.test(agent)) return 'ios';
  if (/mac os x|macintosh/i.test(agent)) return 'macos';
  return 'windows';
}

export default function SetWallpaperGuide({ width, height, className = '' }) {
  const [platform, setPlatform] = useState(detectPlatform);
  const guide = GUIDES[platform] ?? GUIDES.windows;

  return (
    <details className={`group rounded-2xl border border-line bg-panel ${className}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 text-[12.5px] text-ink-2 transition-colors hover:text-ink">
        <span className="flex items-center gap-2">
          <i className="fa-solid fa-display text-[11px] text-ink-3" aria-hidden="true" />
          How to set it on your screen
        </span>
        <i
          className="fa-solid fa-chevron-down text-[10px] text-ink-3 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="border-t border-line px-3.5 py-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Operating system">
          {Object.entries(GUIDES).map(([key, entry]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={platform === key}
              onClick={() => setPlatform(key)}
              className={`h-7 rounded-md border px-2 text-[11.5px] transition-colors ${
                platform === key
                  ? 'border-line-2 bg-raised text-ink'
                  : 'border-line text-ink-3 hover:text-ink-2'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-[12px] leading-relaxed text-ink-2">
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        {width && height ? (
          <p className="mt-2.5 text-[11px] leading-relaxed text-ink-3">
            This file is {width} × {height} px. Pick the “fill” option when your screen has a
            different shape.
          </p>
        ) : null}
      </div>
    </details>
  );
}
