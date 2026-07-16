-- ============================================================
-- POD Store — Orders Integration Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Extends public.orders (from supabase-schema.sql) with the
-- columns needed for PayPal payment + Printful fulfillment + tracking.
-- ============================================================

alter table public.orders
  add column if not exists paypal_order_id  text,
  add column if not exists payment_status   text not null default 'pending'
                              check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  add column if not exists email            text,
  add column if not exists subtotal_amount  numeric(10,2),
  add column if not exists shipping_amount  numeric(10,2),
  add column if not exists tax_amount       numeric(10,2),
  add column if not exists tracking_number  text,
  add column if not exists tracking_url     text,
  add column if not exists carrier          text;

-- Widen the status check to include the 'shipped' state (reported via Printful webhook)
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'processing', 'fulfilled', 'shipped', 'cancelled', 'refunded'));

create unique index if not exists orders_paypal_order_id_idx on public.orders (paypal_order_id);
