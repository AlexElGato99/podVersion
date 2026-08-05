-- ============================================================
-- POD Store — Pages (CMS) Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Powers Dashboard → Pages, a simple CMS for editable content pages
-- (legal pages, FAQ, shipping/returns, etc.), rendered publicly at
-- /[slug] via src/app/(store)/[slug]/page.tsx.
-- ============================================================

create table if not exists public.pages (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  title              text not null,
  content            text not null default '',        -- rich text stored as HTML
  meta_description   text,
  is_published       boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists pages_slug_idx on public.pages (slug);

alter table public.pages enable row level security;

drop policy if exists "Anyone can read published pages" on public.pages;
drop policy if exists "Admins can manage all pages" on public.pages;

-- Published pages are public (the storefront route needs anon read access).
create policy "Anyone can read published pages"
  on public.pages for select
  using (is_published = true);

-- Admins can read/write everything, including drafts.
create policy "Admins can manage all pages"
  on public.pages for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
