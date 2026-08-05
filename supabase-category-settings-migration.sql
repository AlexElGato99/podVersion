-- ============================================================
-- POD Store — Category Settings Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Formalizes public.category_settings, which powers the homepage's
-- "Shop by Category" section (Dashboard → Categories). This table already
-- exists in production (created ad hoc, no tracked migration existed for
-- it) — this file just documents/re-creates it safely with IF NOT EXISTS
-- so a fresh environment can be brought up from scratch.
-- ============================================================

create table if not exists public.category_settings (
  id                   int primary key default 1 check (id = 1),
  section_title        text not null default 'Shop by Category',
  section_description  text not null default 'Find exactly what you''re looking for',
  categories           jsonb not null default '[]'::jsonb,
  updated_at           timestamptz default now()
);

insert into public.category_settings (id) values (1) on conflict (id) do nothing;

alter table public.category_settings enable row level security;

drop policy if exists "Anyone can read category settings" on public.category_settings;
drop policy if exists "Admins can update category settings" on public.category_settings;

create policy "Anyone can read category settings"
  on public.category_settings for select
  using (true);

create policy "Admins can update category settings"
  on public.category_settings for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
