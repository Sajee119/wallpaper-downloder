import { Link } from '../router.jsx';
import { formatCount } from '../utils.js';
import { btnGhost, btnGhostSm, btnPrimary, shell } from '../ui.js';

const STEPS = [
  {
    title: 'Preview, then decide',
    body: 'Open any wallpaper full size, check its resolution and tags, and step through the grid with the arrow keys.',
  },
  {
    title: 'Download the original',
    body: 'The API streams the stored JPEG with an attachment header, so the browser saves exactly what the archive holds.',
  },
  {
    title: 'Keep the ones you like',
    body: 'Sign in and the heart saves a wallpaper to your account. Favourites live in Supabase and follow you between devices.',
  },
];

const DEVELOPER = {
  name: 'Sajeepan',
  handle: '@Sajee119',
  github: 'https://github.com/Sajee119',
  avatar: '/developer/sajeepan.jpg',
  bio: 'Aspiring software engineer working across the stack — full-stack development, problem solving and continuous learning. Pixelfall is designed, built and maintained by him.',
  facts: [
    { label: 'Location', value: 'Sri Lanka' },
    { label: 'Studio', value: 'Future designers' },
    { label: 'Public repositories', value: '32' },
    { label: 'On GitHub since', value: '2024' },
  ],
  links: [
    { label: 'GitHub', href: 'https://github.com/Sajee119', icon: 'fa-brands fa-github' },
    { label: 'Portfolio', href: 'https://sajeepan-portfolio.vercel.app/', icon: 'fa-solid fa-globe' },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/sivanadaraja-sajeepan/',
      icon: 'fa-brands fa-linkedin',
    },
    { label: 'X', href: 'https://x.com/SSajeepan3492', icon: 'fa-brands fa-x-twitter' },
    { label: 'Instagram', href: 'https://www.instagram.com/sajif_s_/', icon: 'fa-brands fa-instagram' },
  ],
  stack: ['JavaScript', 'Python'],
};

const FAQS = [
  {
    q: 'Do I need an account?',
    a: 'Only to download. Browsing, previewing and searching are open to everyone; downloading an original and saving favourites use a free Google sign-in.',
  },
  {
    q: 'Does it cost anything?',
    a: 'No. There are no ads, paywalls or watermarks, and you do not have to credit the site when you use a wallpaper.',
  },
  {
    q: 'What resolution do I get?',
    a: 'The file exactly as the archive stores it — usually 1392 × 752 for desktop, 880 × 1184 for tablet and 752 × 1392 for phones. The resolution on the wallpaper page is the real size.',
  },
  {
    q: 'Can I ask for a wallpaper?',
    a: 'Yes. Send a note from the contact page and it lands in the admin inbox with the rest of the requests.',
  },
];

export default function AboutPage({ stats }) {
  return (
    <main className="flex-1">
      <div className={`${shell} page-enter py-14`}>
        <header className="max-w-2xl">
          <p className="eyebrow">About</p>
          <h1 className="page-title mt-3">A small archive, chosen by hand</h1>
          <p className="page-lede">
            Pixelfall keeps the catalog short on purpose. Each wallpaper is picked for a specific
            mood: a quiet forest, a wet neon street, a gradient that works behind icons.
          </p>
        </header>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step) => (
            <article className="surface rounded-2xl p-5" key={step.title}>
              <h2 className="text-[14px] font-medium">{step.title}</h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{step.body}</p>
            </article>
          ))}
        </div>

        <section className="mt-10 grid gap-8 border-t border-line pt-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div>
            <h2 className="font-display text-[26px] leading-none tracking-[-0.01em]">
              React, Node and Supabase
            </h2>
            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-ink-2">
              The React client is built with Vite and talks to an Express API. With Supabase
              configured the API reads the catalog from Postgres and streams originals from storage.
              Without it, the same API serves a bundled catalog so the site still runs. Accounts and
              favourites use Supabase Auth from the browser, with row level security keeping each
              list private.
            </p>
          </div>

          <dl className="flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <dt className="text-[12px] text-ink-3">Wallpapers</dt>
              <dd className="mt-1 text-[22px] tabular-nums">{stats?.wallpapers ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-3">Downloads</dt>
              <dd className="mt-1 text-[22px] tabular-nums">
                {stats ? formatCount(stats.downloads) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-3">Collections</dt>
              <dd className="mt-1 text-[22px] tabular-nums">{stats?.categories ?? '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-10 border-t border-line pt-8" aria-labelledby="about-developer">
          <h2
            id="about-developer"
            className="font-display text-[26px] leading-none tracking-[-0.01em]"
          >
            Built by
          </h2>
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-ink-2">
            One developer keeps the archive running: the catalog, the API, the admin panel and the
            interface you are reading now.
          </p>

          <div className="surface mt-5 grid gap-5 rounded-2xl p-5 sm:grid-cols-[auto_1fr] sm:gap-6 sm:p-6">
            <img
              src={DEVELOPER.avatar}
              alt={`Portrait of ${DEVELOPER.name}`}
              width="88"
              height="88"
              loading="lazy"
              className="h-[88px] w-[88px] rounded-xl border border-line-2 object-cover"
            />

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <h3 className="text-[15px] font-medium">{DEVELOPER.name}</h3>
                <a
                  className="text-[12.5px] text-ink-3 transition-colors hover:text-ink"
                  href={DEVELOPER.github}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {DEVELOPER.handle}
                </a>
                <span className="rounded-full border border-line-2 px-2 py-0.5 text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
                  Developer
                </span>
              </div>

              <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-ink-2">
                {DEVELOPER.bio}
              </p>

              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
                {DEVELOPER.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-[11.5px] text-ink-3">{fact.label}</dt>
                    <dd className="mt-0.5 text-[12.5px] font-medium">{fact.value}</dd>
                  </div>
                ))}
                <div>
                  <dt className="text-[11.5px] text-ink-3">Main languages</dt>
                  <dd className="mt-0.5 text-[12.5px] font-medium">
                    {DEVELOPER.stack.join(' · ')}
                  </dd>
                </div>
              </dl>

              <ul className="mt-4 flex flex-wrap gap-2">
                {DEVELOPER.links.map((link) => (
                  <li key={link.label}>
                    <a
                      className={btnGhostSm}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <i className={`${link.icon} text-[12px] text-ink-3`} aria-hidden="true" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-10 border-t border-line pt-8" aria-labelledby="about-faq">
          <h2 id="about-faq" className="font-display text-[26px] leading-none tracking-[-0.01em]">
            Common questions
          </h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group py-3.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13.5px] font-medium">
                  {faq.q}
                  <i
                    className="fa-solid fa-plus text-[10px] text-ink-3 transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-ink-2">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-2.5">
          <Link className={btnPrimary} to="/">
            Browse the archive
            <i className="fa-solid fa-arrow-right text-[11px]" aria-hidden="true" />
          </Link>
          <Link className={btnGhost} to="/categories">
            View collections
          </Link>
        </div>
      </div>
    </main>
  );
}
