-- ============================================================
-- POD Store — Collections Settings Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Powers /collections (Dashboard → Collections). Unlike category_settings,
-- this doesn't store per-product assignments — admins define a collection
-- as a label + a list of keywords, and matching products are grouped into
-- it automatically at render time by checking whether the product's name
-- contains any of those keywords (same "auto-updates as the catalog
-- changes" behavior as before, now editable instead of hardcoded).
-- ============================================================

create table if not exists public.collections_settings (
  id            int primary key default 1 check (id = 1),
  collections   jsonb not null default '[]'::jsonb,
  updated_at    timestamptz default now()
);

insert into public.collections_settings (id) values (1) on conflict (id) do nothing;

alter table public.collections_settings enable row level security;

drop policy if exists "Anyone can read collections settings" on public.collections_settings;
drop policy if exists "Admins can update collections settings" on public.collections_settings;

create policy "Anyone can read collections settings"
  on public.collections_settings for select
  using (true);

create policy "Admins can update collections settings"
  on public.collections_settings for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
