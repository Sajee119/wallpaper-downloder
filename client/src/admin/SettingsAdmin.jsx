import { useEffect, useState } from 'react';
import { adminRequest } from './api.js';
import { btnPrimary, card, input, label, textarea } from './ui.js';

const THEME_OPTIONS = [
  ['auto', 'Follow the visitor’s system'],
  ['light', 'Light'],
  ['dark', 'Dark'],
  ['night', 'Night (true black)'],
];

const GROUPS = [
  {
    title: 'Brand',
    note: 'The name and logo mark used in the header, footer and admin sidebar.',
    fields: [
      { key: 'siteName', label: 'Site name', hint: 'Shown in the header and footer.' },
      {
        key: 'logoLetter',
        label: 'Logo letter',
        maxLength: 1,
        mark: true,
        hint: 'One character for the square mark. Leave empty to use the first letter of the site name.',
      },
    ],
  },
  {
    title: 'Home page',
    note: 'The copy above the wallpaper grid.',
    fields: [
      { key: 'heroKicker', label: 'Eyebrow line', hint: 'Small uppercase line above the headline.' },
      { key: 'tagline', label: 'Hero headline' },
      { key: 'heroBody', label: 'Hero paragraph', type: 'textarea', rows: 3 },
      {
        key: 'themeDefault',
        label: 'Default theme',
        type: 'select',
        options: THEME_OPTIONS,
        hint: 'Used for visitors who have not picked a theme themselves.',
      },
    ],
  },
  {
    title: 'Announcement bar',
    note: 'Leave the message empty to hide the bar completely.',
    fields: [
      { key: 'announcement', label: 'Message' },
      { key: 'announcementLabel', label: 'Link label', hint: 'Only shown when a link is set.' },
      {
        key: 'announcementLink',
        label: 'Link',
        hint: 'An in-site path such as /about, or a full https:// address.',
      },
    ],
  },
  {
    title: 'Downloads',
    fields: [
      {
        key: 'downloadsRequireSignIn',
        label: 'Require sign-in to download',
        type: 'toggle',
        hint: 'When on, visitors must sign in with Google before saving originals. Previewing stays free.',
      },
    ],
  },
  {
    title: 'Footer and contact',
    fields: [
      { key: 'footerNote', label: 'Footer note' },
      { key: 'contactEmail', label: 'Contact email' },
    ],
  },
];

function Field({ field, form, setValue }) {
  const id = `s-${field.key}`;

  if (field.type === 'toggle') {
    const checked = form[field.key] !== false;
    return (
      <div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={`${id}-label`}
          onClick={() => setValue(field.key, !checked)}
          className="flex w-full items-center justify-between gap-4 rounded-lg border border-line bg-paper px-3 py-2.5 text-left transition-colors hover:border-line-2"
        >
          <span id={`${id}-label`} className="text-[13px] text-ink">
            {field.label}
          </span>
          <span
            className={`relative h-5 w-9 flex-none rounded-full transition-colors ${
              checked ? 'bg-ink' : 'bg-line-2'
            }`}
            aria-hidden="true"
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-paper transition-transform ${
                checked ? 'translate-x-[18px]' : 'translate-x-0.5'
              }`}
            />
          </span>
        </button>
        {field.hint && <p className="mt-1 text-[11.5px] text-ink-3">{field.hint}</p>}
      </div>
    );
  }

  return (
    <div>
      <label className={label} htmlFor={id}>
        {field.label}
      </label>
      <div className="flex items-center gap-2">
        {field.type === 'textarea' ? (
          <textarea
            id={id}
            rows={field.rows ?? 3}
            className={textarea}
            value={form[field.key] ?? ''}
            onChange={(event) => setValue(field.key, event.target.value)}
          />
        ) : field.type === 'select' ? (
          <select
            id={id}
            className={input}
            value={form[field.key] ?? 'auto'}
            onChange={(event) => setValue(field.key, event.target.value)}
          >
            {field.options.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            className={input}
            maxLength={field.maxLength}
            value={form[field.key] ?? ''}
            onChange={(event) => setValue(field.key, event.target.value)}
          />
        )}
        {field.mark && (
          <span
            className="grid h-9 w-9 flex-none place-items-center rounded-md bg-ink font-display text-[17px] leading-none text-paper"
            aria-hidden="true"
          >
            {(form.logoLetter || form.siteName || 'P').trim().charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      {field.hint && <p className="mt-1 text-[11.5px] text-ink-3">{field.hint}</p>}
    </div>
  );
}

export default function SettingsAdmin() {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    adminRequest('/settings')
      .then((data) => active && setForm(data.settings))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  const setValue = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await adminRequest('/settings', { method: 'PUT', body: form });
      setForm(data.settings);
      setNotice('Settings saved. Reload the public site to see them.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!form) {
    return error ? (
      <p className="rounded-lg border border-danger-line bg-danger-bg px-4 py-3 text-[13px] text-danger">{error}</p>
    ) : (
      <p className="text-[13px] text-ink-3">Loading settings…</p>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-[760px] space-y-4">
      {GROUPS.map((group) => (
        <section key={group.title} className={`${card} p-5`}>
          <div className="border-b border-line pb-3">
            <h2 className="text-[14px] font-medium">{group.title}</h2>
            {group.note && <p className="mt-1 text-[11.5px] text-ink-3">{group.note}</p>}
          </div>
          <div className="mt-4 space-y-4">
            {group.fields.map((field) => (
              <Field key={field.key} field={field} form={form} setValue={setValue} />
            ))}
          </div>
        </section>
      ))}

      {error && (
        <p className="rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-[12.5px] text-danger" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="text-[12.5px] text-ink-2">{notice}</p>}

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? 'Saving…' : 'Save settings'}
        </button>
        <span className="text-[11.5px] text-ink-3">
          Changes apply to every visitor on the public site.
        </span>
      </div>
    </form>
  );
}
