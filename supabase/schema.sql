-- Pixelfall schema for Supabase
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create extension if not exists pgcrypto;

create table if not exists public.wallpapers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  tags text[] not null default '{}',
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  storage_path text not null,
  thumb_path text,
  accent text not null default '#6b7a99',
  downloads integer not null default 0,
  created_at timestamptz not null default now()
);

-- Existing installs: add the device column used by the Mobile/Tablet sections.
alter table public.wallpapers
  add column if not exists device text not null default 'desktop';

create index if not exists wallpapers_category_idx on public.wallpapers (category);
create index if not exists wallpapers_device_idx on public.wallpapers (device);
create index if not exists wallpapers_downloads_idx on public.wallpapers (downloads desc);
create index if not exists wallpapers_created_idx on public.wallpapers (created_at desc);

-- Row level security: everyone may read, only the service role may write.
alter table public.wallpapers enable row level security;

drop policy if exists "Wallpapers are publicly readable" on public.wallpapers;
create policy "Wallpapers are publicly readable"
  on public.wallpapers
  for select
  to anon, authenticated
  using (true);

-- Atomic download counter used by POST /api/wallpapers/:slug/download
create or replace function public.increment_wallpaper_downloads(p_slug text)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.wallpapers
     set downloads = downloads + 1
   where slug = p_slug
  returning downloads;
$$;

revoke all on function public.increment_wallpaper_downloads(text) from public;
grant execute on function public.increment_wallpaper_downloads(text) to anon, authenticated;

-- Storage is intentionally not touched here. On current Supabase projects the
-- `postgres` role cannot create policies on storage.objects, and because the SQL
-- editor runs this file as one transaction that failure would roll back every
-- table above. The public "wallpapers" bucket is created by `npm run seed`
-- (or manually under Storage), and a public bucket needs no objects policy.

-- Per-user favourites. Each row belongs to one signed-in user.
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  wallpaper_id uuid not null references public.wallpapers (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, wallpaper_id)
);

create index if not exists favorites_user_idx on public.favorites (user_id, created_at desc);

alter table public.favorites enable row level security;

-- A user can only see and change their own favourites. auth.uid() is set by
-- Supabase Auth from the signed-in session, never by the client payload.
drop policy if exists "Users read their own favorites" on public.favorites;
create policy "Users read their own favorites"
  on public.favorites
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users add their own favorites" on public.favorites;
create policy "Users add their own favorites"
  on public.favorites
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users remove their own favorites" on public.favorites;
create policy "Users remove their own favorites"
  on public.favorites
  for delete
  to authenticated
  using (auth.uid() = user_id);
