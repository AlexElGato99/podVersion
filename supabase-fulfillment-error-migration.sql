-- ============================================================
-- POD Store — Fulfillment Error Tracking Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Adds a column to record why a Printful order failed to create,
-- so paid-but-unfulfilled orders are visible to the admin instead
-- of failing silently.
-- ============================================================

alter table public.orders
  add column if not exists fulfillment_error text;
