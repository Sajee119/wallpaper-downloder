import { useState } from 'react';
import { sendMessage } from '../api.js';
import { shell } from '../ui.js';
import { btnPrimary, input, label, textarea } from '../admin/ui.js';

export default function ContactPage({ settings }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', body: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await sendMessage(form);
      setSent(true);
      setForm({ name: '', email: '', subject: '', body: '', website: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={`${shell} page-enter flex-1 py-14`}>
      <div className="max-w-[620px]">
        <p className="eyebrow">Contact</p>
        <h1 className="page-title mt-3">Send a request</h1>
        <p className="page-lede">
          Ask for a wallpaper, report a broken download, or suggest a collection. Requests land in
          the admin inbox and get answered at{' '}
          <span className="text-ink">{settings?.contactEmail || 'hello@pixelfall.app'}</span>.
        </p>

        {sent ? (
          <div className="surface mt-8 rounded-2xl px-5 py-10 text-center">
            <i className="fa-solid fa-envelope-circle-check text-[22px] text-amber" aria-hidden="true" />
            <h2 className="mt-3 font-display text-[24px]">Request sent</h2>
            <p className="mt-1.5 text-[13px] text-ink-2">
              Thanks — your message is in the queue and the admin will reply by email.
            </p>
            <button type="button" className={`${btnPrimary} mt-5`} onClick={() => setSent(false)}>
              Send another
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="surface mt-8 space-y-4 rounded-2xl p-5 sm:p-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="c-name">Name</label>
                <input
                  id="c-name"
                  required
                  className={input}
                  value={form.name}
                  onChange={(event) => set('name', event.target.value)}
                />
              </div>
              <div>
                <label className={label} htmlFor="c-email">Email</label>
                <input
                  id="c-email"
                  type="email"
                  required
                  className={input}
                  value={form.email}
                  onChange={(event) => set('email', event.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={label} htmlFor="c-subject">Subject</label>
              <input
                id="c-subject"
                className={input}
                value={form.subject}
                onChange={(event) => set('subject', event.target.value)}
                placeholder="Wallpaper request"
              />
            </div>

            <div>
              <label className={label} htmlFor="c-body">Message</label>
              <textarea
                id="c-body"
                required
                rows={6}
                className={textarea}
                value={form.body}
                onChange={(event) => set('body', event.target.value)}
                placeholder="What would you like to see?"
              />
            </div>

            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(event) => set('website', event.target.value)}
              className="hidden"
              aria-hidden="true"
            />

            {error && (
              <p className="rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-[12.5px] text-danger" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className={btnPrimary} disabled={busy}>
              {busy ? 'Sending…' : 'Send request'}
              <i className="fa-solid fa-paper-plane text-[11px]" aria-hidden="true" />
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
