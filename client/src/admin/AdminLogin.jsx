import { useState } from 'react';
import { adminRequest } from './api.js';
import { btnPrimary, input, label } from './ui.js';
import ThemeToggle from '../components/ThemeToggle.jsx';

export default function AdminLogin({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await adminRequest('/login', { method: 'POST', body: { email, password } });
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center bg-paper px-5 py-10">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-ink font-display text-[20px] leading-none text-paper">
            P
          </span>
          <div>
            <p className="font-display text-[21px] leading-none">Pixelfall</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-ink-3">Admin studio</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="mt-7 rounded-xl border border-line bg-panel p-5 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.9)]"
        >
          <h1 className="font-display text-[26px] leading-none">Sign in</h1>
          <p className="mt-1.5 text-[12.5px] text-ink-3">
            Manage wallpapers, site copy and visitor requests.
          </p>

          <div className="mt-5">
            <label className={label} htmlFor="admin-email">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={input}
              placeholder="you@example.com"
            />
          </div>

          <div className="mt-4">
            <label className={label} htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={input}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p
              className="mt-4 rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-[12.5px] text-danger"
              role="alert"
            >
              {error}
            </p>
          )}

          <button type="submit" className={`${btnPrimary} mt-5 w-full`} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
            <i className="fa-solid fa-arrow-right text-[11px]" aria-hidden="true" />
          </button>
        </form>

        <p className="mt-4 text-center text-[12px] text-ink-3">
          <a href="/" className="transition-colors hover:text-ink">
            Back to the site
          </a>
        </p>
      </div>
    </div>
  );
}
