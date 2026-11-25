# Pixelfall

A wallpaper download site: **React** front end, **Node/Express** API, **Supabase** for the catalog, image storage and download counts.

Browse a curated grid, filter by category, search by title or tag, preview the full image, and download the original file in one click. Download counts are written back to the database. Sign in with email and password to save wallpapers to a personal favourites list.

## Stack

| Layer    | Choice                                              |
| -------- | --------------------------------------------------- |
| Frontend | React 18 + Vite, History-API router                  |
| Styling  | Tailwind CSS v4, Font Awesome Free icons             |
| Backend  | Node 20+ / Express 4                                 |
| Database | Supabase Postgres (`wallpapers`, `favorites`)        |
| Auth     | Supabase Auth (email + password)                     |
| Images   | Supabase Storage (`wallpapers` bucket) or local disk |

## Run it

```bash
npm install
npm run dev
```

- Web app: http://127.0.0.1:5173
- API: http://127.0.0.1:4000

Without Supabase credentials the API serves the bundled demo catalog (25 wallpapers stored in `server/public/wallpapers`), so the site works immediately. The header shows `Demo catalog` in that mode.

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste `supabase/schema.sql`, and run it. This creates the `wallpapers` and `favorites` tables, row level security, and the `increment_wallpaper_downloads` function. The SQL editor applies the file as one transaction, so if it reports an error nothing is created — check the result message before moving on. If you would rather not use the editor, add `DATABASE_URL` (Supabase → Connect → Session pooler URI) to `server/.env` and run `npm run db:setup`, which applies the schema and then seeds.
3. Copy `server/.env.example` to `server/.env` and fill in **Project Settings → API**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (only used by the seed script — keep it server-side)
4. Copy `client/.env.example` to `client/.env` with the same project URL and **anon** key. Accounts and favourites run in the browser against Supabase Auth; the anon key is public and safe there because row level security limits every row to `auth.uid()`.
5. Seed the table and bucket with the bundled images (this also creates the public `wallpapers` storage bucket if it is missing):

   ```bash
   npm run seed
   ```

6. Restart `npm run dev`. The header status switches to `Live catalog`, and previews/downloads now stream from Supabase Storage.

### Accounts

Sign-in is **Google OAuth only**; there is no email/password form. Enable it once:

1. In Google Cloud Console create an OAuth client of type **Web application**.
   - Authorized JavaScript origins: `http://127.0.0.1:5173` (and your deployed origin).
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
2. In Supabase, open **Authentication → Providers → Google**, enable it and paste the Client ID and Client Secret.
3. In **Authentication → URL configuration**, set the Site URL to `http://127.0.0.1:5173` and add `http://127.0.0.1:5173/auth/callback` (plus the production equivalent) to the Redirect URLs.

The app sends the browser to Google, Supabase returns it to `/auth/callback`, and the session is picked up automatically before redirecting to `/profile`. If the provider is not enabled, the dialog explains what is missing.

### What an account holds

- **Favourites** in `public.favorites`, scoped to the signed-in user by row level security.
- **Profile** — display name and a 160-character bio saved on the Supabase user record, alongside the Google name, email and avatar.
- **Download history** — the last 40 downloads are kept in this browser per account, and the `/downloads` page can re-download or clear them. Favourites only ever live in Supabase.

## Pages

The client uses a small History-API router (`client/src/router.jsx`), so every page has a real URL and the browser back button works.

| Route             | Page                                                        |
| ----------------- | ----------------------------------------------------------- |
| `/`               | Hero, filters and the paginated collection                   |
| `/c/:category`    | The collection pre-filtered to one category                  |
| `/d/:device`      | Wallpapers for `desktop`, `tablet` or `mobile` screens       |
| `/devices`        | Desktop, tablet and phone sections with counts               |
| `/w/:slug`        | Wallpaper detail page with related wallpapers and share link |
| `/categories`     | All collections with counts and cover images                 |
| `/favourites`     | The signed-in user's saved wallpapers                        |
| `/profile`        | Google identity, editable name and bio, activity summary     |
| `/downloads`      | Per-browser download history with re-download                |
| `/auth/callback`  | Completes the Google redirect, then opens the profile        |
| `/contact`        | Request form that feeds the admin inbox                      |
| `/about`          | How the collection and the app work                          |
| `/admin/login`    | Admin sign-in                                                |
| `/admin`          | Admin dashboard: totals, top wallpapers, latest requests     |
| `/admin/wallpapers` | Add, edit, feature, draft and delete wallpapers           |
| `/admin/messages` | Read visitor requests and save/send replies                  |
| `/admin/users`    | Accounts from Supabase Auth                                  |
| `/admin/settings` | Site name, hero copy, announcement, footer note              |

Old `/?w=<slug>` share links redirect to `/w/<slug>`.

The header search shows suggestions under the field as you type: matching wallpapers, collections and tags, navigable with the arrow keys.

## Admin panel

Sign in at `/admin/login` with the credentials in `server/.env`:

```bash
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=change-me            # or ADMIN_PASSWORD_HASH=scrypt$salt$hash
```

Generate a hash instead of storing the plain password:

```bash
node -e "const c=require('node:crypto');const s=c.randomBytes(16);console.log('scrypt$'+s.toString('hex')+'$'+c.scryptSync(process.argv[1],s,64).toString('hex'))" 'your-password'
```

Sessions are an httpOnly cookie valid for 8 hours; login attempts are rate-limited. The panel manages the **active store**: with Supabase ready it inserts, updates and deletes `public.wallpapers` rows and uploads images to the `wallpapers` bucket; without Supabase it edits `server/data/content.json` and the local JPEGs. Site settings and visitor requests always live in `server/data/content.json`, so they work in both modes.

Drafts and hero featuring are local-store features: the current Supabase table has no `status`/`featured` column, so the editor hides those switches when Supabase is live.

## Scripts

| Command         | What it does                                            |
| --------------- | ------------------------------------------------------- |
| `npm run dev`   | API on :4000 and Vite on :5173 with hot reload           |
| `npm run build` | Builds the React app to `client/dist`                    |
| `npm run start` | Serves the API and the built app together on :4000       |
| `npm run seed`  | Uploads images and upserts catalog rows into Supabase    |

## API

| Method | Route                                   | Description                                    |
| ------ | --------------------------------------- | ---------------------------------------------- |
| GET    | `/api/health`                           | Status and active data source                   |
| GET    | `/api/wallpapers?category=&q=&sort=&page=&limit=&ids=&device=` | Filtered, paginated list |
| GET    | `/api/suggestions?q=`                   | Search typeahead: wallpapers, collections, tags |
| GET    | `/api/featured`                         | Most downloaded wallpaper (hero)                |
| GET    | `/api/categories`                       | Categories plus aggregate stats                 |
| GET    | `/api/wallpapers/random?category=`      | Random wallpaper, optionally within a category  |
| GET    | `/api/wallpapers/:slug`                 | Single wallpaper                                |
| GET    | `/api/wallpapers/:slug/file`            | Streams the original file as an attachment      |
| POST   | `/api/wallpapers/:slug/download`        | Increments the counter, returns the download URL |
| GET    | `/api/settings`                         | Public site copy used by the header, hero and footer |
| POST   | `/api/messages`                         | Stores a visitor request (rate-limited)          |
| POST   | `/api/admin/login`                      | Admin sign-in, sets the session cookie           |
| GET    | `/api/admin/overview`                   | Dashboard totals, top wallpapers, latest requests |
| GET/POST | `/api/admin/wallpapers`               | List every wallpaper / create one                |
| PATCH/DELETE | `/api/admin/wallpapers/:slug`      | Update or delete one wallpaper                   |
| GET/PUT | `/api/admin/settings`                  | Read or update site settings                     |
| GET    | `/api/admin/messages`                   | Visitor requests                                 |
| PATCH/DELETE | `/api/admin/messages/:id`          | Save a reply, change status, delete              |
| GET    | `/api/admin/users`                      | Supabase accounts (service role key required)    |

Every `/api/admin/*` route except `login` requires the admin session cookie.

`sort` accepts `trending` (most downloaded) or `newest`. `ids` is a comma-separated list (max 48) used by the favourites view; category, search and sort still apply.

## Adding wallpapers

Put a JPEG in `server/public/wallpapers/` named `<slug>.jpg`, add an entry to `server/src/seed-data.js`, then run `npm run seed`. With Supabase connected, upload any new images to the `wallpapers` bucket and insert a matching row — the UI reads everything from the API.

## Notes

- The demo store persists wallpapers, download counts, settings and requests in `server/data/content.json`.
- If Supabase is configured but the `wallpapers` table is missing, the API logs a warning and serves the demo catalog (`/api/health` shows `supabaseReady: false`) instead of failing every request.
- Accounts require Supabase. In demo mode the sign-in dialog explains which two values to add.
- Secrets live in `server/.env` and are git-ignored. The service role key never reaches the browser; the React app only talks to this API, while auth and favourites use the anon key directly against Supabase with RLS enforced.
