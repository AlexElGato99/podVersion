-- ============================================================
-- POD Store — SEO Settings Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Dashboard → SEO (src/app/dashboard/seo/page.tsx) has always posted to
-- /api/seo-settings, but public.seo_settings was never created — every
-- "Save" click (site verification tags, per-page overrides, redirects,
-- sitemap entries) has been silently failing with "Could not find the
-- table 'public.seo_settings'". This creates it, following the same
-- id + jsonb pattern already used by app_settings/hero_settings.
-- ============================================================

create table if not exists public.seo_settings (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz default now()
);

alter table public.seo_settings enable row level security;
-- Intentionally no policies: only the service-role key (server-only,
-- used exclusively by src/app/api/seo-settings/route.ts) can access this table.
