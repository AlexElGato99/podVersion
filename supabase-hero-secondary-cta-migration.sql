-- ============================================================
-- POD Store — Hero Secondary CTA Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- The hero editor (Dashboard → Hero Section) has always let admins edit a
-- "Secondary Button Text/Link", but public.hero_settings was never created
-- with those columns — every save from that page has been silently failing
-- with "Could not find the 'cta_secondary_link' column of 'hero_settings'".
-- This adds the missing columns so Save actually persists them.
-- ============================================================

alter table public.hero_settings
  add column if not exists cta_secondary_text text not null default 'View Collections',
  add column if not exists cta_secondary_link text not null default '/collections';
