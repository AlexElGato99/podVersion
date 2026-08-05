-- ============================================================
-- POD Store — About Page Settings Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Powers Dashboard → About Page, a dedicated editor for the /about page's
-- narrative content (separate from the generic Pages CMS, since /about
-- keeps its own custom hero/story/values layout rather than freeform
-- rich text).
-- ============================================================

create table if not exists public.about_settings (
  id                 int primary key default 1 check (id = 1),
  badge_text         text not null default 'Our Story',
  headline           text not null default 'From Etsy & Amazon to Our Own Home',
  subheadline        text not null default 'Veliova started as another shop among many — selling on Etsy and Merch by Amazon. Now it''s something we built and control ourselves: a small, independent brand focused on doing one thing really well.',
  story_paragraphs   jsonb not null default '[]'::jsonb,
  values             jsonb not null default '[]'::jsonb,
  cta_title          text not null default 'Ready to find your next favorite piece?',
  cta_subtitle       text not null default 'Browse our full catalog and discover products you''ll love.',
  updated_at         timestamptz default now()
);

insert into public.about_settings (id) values (1) on conflict (id) do nothing;

alter table public.about_settings enable row level security;

drop policy if exists "Anyone can read about settings" on public.about_settings;
drop policy if exists "Admins can update about settings" on public.about_settings;

create policy "Anyone can read about settings"
  on public.about_settings for select
  using (true);

create policy "Admins can update about settings"
  on public.about_settings for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
