import { useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { btnPrimary, iconBtn } from '../ui.js';

export default function AuthDialog({ onClose, reason }) {
  const { configured, signInWithGoogle } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  async function handleGoogle() {
    setPending(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in could not start.');
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-line-2 bg-panel p-6 shadow-[0_50px_120px_-50px_rgba(0,0,0,0.95)] sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-label="Sign in to Pixelfall"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={`${iconBtn} absolute right-3 top-3`}
          onClick={onClose}
          aria-label="Close sign in"
        >
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>

        <h2 className="font-display text-[28px] leading-none tracking-[-0.01em]">Sign in</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          {reason || 'Sign in to keep favourites, downloads and your profile across devices.'}
        </p>

        {!configured ? (
          <div className="mt-5 rounded-2xl border border-line bg-paper p-4 text-[12.5px] leading-relaxed text-ink-2">
            <p>
              <span className="text-ink">Sign in needs Supabase.</span> Add these two values to{' '}
              <code className="rounded bg-raised px-1 py-0.5 text-[11px] text-ink">client/.env</code>{' '}
              from Supabase → Project settings → API, then restart npm run dev.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md border border-line bg-panel p-3 text-[11px] leading-relaxed text-ink-2">
              {`VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-key`}
            </pre>
            <p className="mt-3 text-[11.5px] text-ink-3">
              Enable the Google provider in Supabase, then allow this origin under Authentication →
              URL configuration.
            </p>
          </div>
        ) : (
          <>
            <button
              type="button"
              className={`${btnPrimary} mt-5 w-full`}
              onClick={handleGoogle}
              disabled={pending}
            >
              <i className="fa-brands fa-google text-[13px]" aria-hidden="true" />
              {pending ? 'Opening Google' : 'Continue with Google'}
            </button>

            {error && (
              <p
                className="mt-3 rounded-md border border-danger-line bg-danger-bg px-3 py-2 text-[12.5px] leading-relaxed text-danger"
                role="alert"
              >
                {error}
              </p>
            )}

            <p className="mt-4 text-[11.5px] leading-relaxed text-ink-3">
              Google confirms who you are, so there is no password to create or remember. Only your
              name, email and avatar are stored, and favourites stay visible to you alone.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
