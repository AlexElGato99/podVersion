-- ============================================================
-- HERO SECTION MIGRATION
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- This is a standalone migration — safe to run even if you
-- already ran the full supabase-schema.sql
-- ============================================================

-- ── 1. HERO SETTINGS TABLE (singleton row, id always = 1) ──
create table if not exists public.hero_settings (
  id                  int primary key default 1 check (id = 1),
  headline            text not null default 'The leader in quality custom T-Shirts',
  subtitle            text not null default 'Turn your ideas into premium products that leave a lasting impression',
  cta_primary_text    text not null default 'Shop Now',
  cta_primary_link    text not null default '/shop',
  bg_from             text not null default '#d4f1f9',
  bg_to               text not null default '#bde8f7',
  main_image_url      text not null default 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&auto=format&fit=crop&q=80',
  floating_cards      jsonb not null default '[
    {"id":"1","emoji":"🐼","image_url":"","label":"","sublabel":"","bg":"#0d3d5f","text_color":"#ffffff","position":"top-left"},
    {"id":"2","emoji":"","image_url":"","label":"Company Name","sublabel":"Slogan Here","bg":"#ffffff","text_color":"#374151","position":"top-right"},
    {"id":"3","emoji":"🚛","image_url":"","label":"","sublabel":"","bg":"#ffffff","text_color":"#374151","position":"mid-right"},
    {"id":"4","emoji":"👨‍🚀","image_url":"","label":"","sublabel":"","bg":"#d4eaff","text_color":"#374151","position":"bottom-right"}
  ]',
  updated_at          timestamptz default now()
);

-- Seed the singleton row
insert into public.hero_settings (id) values (1) on conflict (id) do nothing;

-- ── 2. RLS for hero_settings ────────────────────────────────
alter table public.hero_settings enable row level security;

drop policy if exists "Anyone can read hero settings"  on public.hero_settings;
drop policy if exists "Admins can update hero settings" on public.hero_settings;

create policy "Anyone can read hero settings"
  on public.hero_settings for select
  using (true);

create policy "Admins can update hero settings"
  on public.hero_settings for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ── 3. STORAGE BUCKET: hero-images ─────────────────────────
-- Public bucket — uploaded images are readable by anyone
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hero-images',
  'hero-images',
  true,
  5242880,   -- 5 MB max
  array['image/jpeg','image/png','image/webp','image/gif','image/avif']
)
on conflict (id) do nothing;

-- ── 4. STORAGE RLS POLICIES ────────────────────────────────
drop policy if exists "Public can read hero images"   on storage.objects;
drop policy if exists "Admins can upload hero images"  on storage.objects;
drop policy if exists "Admins can update hero images"  on storage.objects;
drop policy if exists "Admins can delete hero images"  on storage.objects;

create policy "Public can read hero images"
  on storage.objects for select
  using (bucket_id = 'hero-images');

create policy "Admins can upload hero images"
  on storage.objects for insert
  with check (
    bucket_id = 'hero-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update hero images"
  on storage.objects for update
  using (
    bucket_id = 'hero-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete hero images"
  on storage.objects for delete
  using (
    bucket_id = 'hero-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
