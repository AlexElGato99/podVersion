-- ============================================================
-- POD Store — Printify Order Fulfillment Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Extends public.orders with the columns needed for Printify
-- fulfillment alongside the existing Printful support, and lets
-- a single checkout that spans both providers produce one order
-- row per provider (each with its own shipment/tracking).
-- ============================================================

alter table public.orders
  add column if not exists printify_order_id text,
  add column if not exists provider          text not null default 'printful'
                              check (provider in ('printful', 'printify'));

create unique index if not exists orders_printify_order_id_idx on public.orders (printify_order_id);

-- A checkout spanning both providers now inserts one row per provider that
-- share the same paypal_order_id, so that id can no longer be unique.
drop index if exists orders_paypal_order_id_idx;
create index if not exists orders_paypal_order_id_idx on public.orders (paypal_order_id);

-- Backfill: existing rows all came from Printful fulfillment.
update public.orders set provider = 'printful' where provider is null;
