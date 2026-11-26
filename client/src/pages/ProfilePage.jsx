import { useEffect, useState } from 'react';
import { Link } from '../router.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useAuth } from '../auth.jsx';
import { getDownloads } from '../history.js';
import { formatDate } from '../utils.js';
import { btnGhost, btnGhostSm, btnPrimary, field, shell } from '../ui.js';

export default function ProfilePage({ onSignIn }) {
  const { user, initializing, configured, favorites, updateProfile, signOut } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [downloads, setDownloads] = useState([]);

  const metadata = user?.user_metadata ?? {};
  const googleName = metadata.full_name || metadata.name || '';
  const avatar = metadata.avatar_url || metadata.picture;
  const displayName = googleName || user?.email || 'Your profile';

  useEffect(() => {
    setName(googleName);
    setBio(metadata.bio ?? '');
    setMessage('');
    setError('');
  }, [user?.id, googleName, metadata.bio]);

  useEffect(() => {
    setDownloads(getDownloads(user?.id));
  }, [user?.id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    setMessage('');
    try {
      await updateProfile({ full_name: name.trim(), bio: bio.trim() });
      setMessage('Profile saved');
    } catch (err) {
      setError(err.message || 'Could not save your profile');
    } finally {
      setPending(false);
    }
  }

  if (initializing) {
    return (
      <main className={`${shell} flex-1 py-14`}>
        <div className="skeleton h-40 rounded-2xl border border-line" aria-hidden="true" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className={`${shell} page-enter page-wrap flex-1`}>
        <PageHeader
          eyebrow="Account"
          title="Profile"
          lede="Sign in with Google to see your profile, favourites and download history in one place. No password to remember."
        />

        <div className="empty-state mt-10">
          <i className="fa-regular fa-user text-[18px] text-ink-3" aria-hidden="true" />
          <h2 className="mt-3 font-display text-[24px]">You are not signed in</h2>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-2">
            {configured
              ? 'Google is the only sign-in method, so there is no password to create.'
              : 'Supabase is not configured in this build, so sign-in is unavailable.'}
          </p>
          <button type="button" className={`${btnPrimary} mt-5`} onClick={onSignIn}>
            <i className="fa-brands fa-google text-[12px]" aria-hidden="true" />
            Continue with Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <div className={`${shell} page-enter page-wrap`}>
        <header className="flex flex-wrap items-center gap-5 page-head">
          <span className="grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-full border border-line-2 bg-raised text-[20px] font-medium ring-2 ring-amber/25">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-[clamp(1.9rem,3.6vw,2.6rem)] leading-none tracking-[-0.01em]">
              {displayName}
            </h1>
            <p className="mt-1.5 truncate text-[13px] text-ink-2">{user.email}</p>
            <p className="mt-1 text-[12px] text-ink-3">
              {metadata.full_name || metadata.name ? 'Google account' : 'Signed in'}
              {user.created_at ? ` · joined ${formatDate(user.created_at)}` : ''}
            </p>
          </div>

          <div className="ml-auto flex gap-2">
            <Link className={btnGhostSm} to="/downloads">
              <i className="fa-solid fa-arrow-down text-[10px]" aria-hidden="true" />
              Downloads
            </Link>
            <Link className={btnGhostSm} to="/favourites">
              <i className="fa-regular fa-heart text-[10px]" aria-hidden="true" />
              Favourites
            </Link>
          </div>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <section aria-labelledby="profile-details">
            <h2 id="profile-details" className="text-[14px] font-medium">
              Profile details
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-3">
              Your Google name and photo are shown in the header. You can set how the name appears
              here.
            </p>

            <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] text-ink-3">Display name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={60}
                  placeholder="Your name"
                  className={field}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] text-ink-3">Bio</span>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  maxLength={160}
                  rows={3}
                  placeholder="What you look for in a wallpaper"
                  className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-ink transition-colors placeholder:text-ink-3 focus:border-line-2 focus:outline-none"
                />
                <span className="text-[11px] tabular-nums text-ink-3">{bio.length} / 160</span>
              </label>

              {error && (
                <p
                  className="rounded-md border border-danger-line bg-danger-bg px-3 py-2 text-[12.5px] text-danger"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {message && (
                <p
                  className="rounded-md border border-ok-line bg-ok-bg px-3 py-2 text-[12.5px] text-ok"
                  role="status"
                >
                  {message}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button type="submit" className={btnPrimary} disabled={pending}>
                  {pending ? 'Saving' : 'Save changes'}
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={async () => {
                    await signOut();
                  }}
                >
                  Sign out
                </button>
              </div>
            </form>
          </section>

          <section aria-labelledby="profile-activity">
            <h2 id="profile-activity" className="text-[14px] font-medium">
              Activity
            </h2>

            <dl className="spec-grid mt-4 grid-cols-2">
              <div className="spec">
                <dt>Saved wallpapers</dt>
                <dd className="text-[22px]">{favorites.size}</dd>
              </div>
              <div className="spec">
                <dt>Downloads here</dt>
                <dd className="text-[22px]">{downloads.length}</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-center justify-between gap-3">
              <h3 className="text-[13px] font-medium">Recent downloads</h3>
              {downloads.length > 0 && (
                <Link to="/downloads" className="text-[12px] text-ink-2 hover:text-ink">
                  See all
                  <i className="fa-solid fa-arrow-right ml-1.5 text-[10px]" aria-hidden="true" />
                </Link>
              )}
            </div>

            {downloads.length === 0 ? (
              <p className="mt-2 rounded-lg border border-line bg-panel px-4 py-6 text-center text-[12.5px] text-ink-3">
                Nothing downloaded yet.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {downloads.slice(0, 3).map((entry) => (
                  <li key={entry.slug}>
                    <Link
                      to={`/w/${encodeURIComponent(entry.slug)}`}
                      className="surface flex items-center gap-3 rounded-2xl p-2 transition-colors hover:border-line-2"
                    >
                      <span className="h-10 w-16 flex-none overflow-hidden rounded border border-line bg-raised">
                        {entry.thumbUrl ? (
                          <img
                            src={entry.thumbUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px]">{entry.title}</span>
                        <span className="block text-[11px] text-ink-3">
                          {formatDate(entry.at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 text-[11px] leading-relaxed text-ink-3">
              Download history is stored in this browser. Favourites are stored with your account.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
