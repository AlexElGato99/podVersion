-- ============================================================
-- POD Store — Products table + Google Merchant Center sync
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- IMPORTANT: this store currently sources products live from the
-- Printify/Printful APIs (see src/lib/products.ts) — there is no `products`
-- table. The Merchant Center webhook fires on row changes, so it needs a real
-- table to watch. This creates one; see the note at the bottom on keeping it
-- populated.
-- ============================================================

create table if not exists public.products (
  id                      uuid primary key default gen_random_uuid(),
  -- Source identifier, e.g. "printify_6a5e3c82194a900b06093802". Lets a sync
  -- job upsert without creating duplicates.
  external_id             text unique,
  title                   text not null,
  description             text,
  price                   numeric(10,2) not null,
  currency                text not null default 'USD',
  mockup_url              text,
  stock                   integer not null default 0,
  size                    text,
  color                   text,
  -- Groups size/colour variants of one design so Google shows them together.
  item_group_id           text,
  slug                    text,
  brand                   text default 'Veliova',
  google_product_category text default 'Apparel & Accessories > Clothing > Shirts & Tops',
  age_group               text default 'adult',
  gender                  text default 'unisex',
  is_published            boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists products_external_id_idx on public.products (external_id);
create index if not exists products_item_group_id_idx on public.products (item_group_id);

alter table public.products enable row level security;

drop policy if exists "Anyone can read published products" on public.products;
drop policy if exists "Admins can manage products" on public.products;

create policy "Anyone can read published products"
  on public.products for select
  using (is_published = true);

create policy "Admins can manage products"
  on public.products for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Keep updated_at fresh so UPDATE webhooks carry a meaningful timestamp.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();


-- ============================================================
-- Wire up the Database Webhook (UI, not SQL)
--
-- Supabase Dashboard → Database → Webhooks → "Create a new hook":
--   Name       : products-to-google-merchant
--   Table      : public.products
--   Events     : Insert, Update, Delete
--   Type       : HTTP Request
--   Method     : POST
--   URL        : https://veliova.com/api/webhooks/supabase-products
--   HTTP Headers:
--       Content-Type   : application/json
--       x-webhook-secret : <the same value you set for SUPABASE_WEBHOOK_SECRET>
--
-- Generate a secret with:  openssl rand -hex 32
-- ============================================================


-- ============================================================
-- Keeping this table in sync with Printify
--
-- Because the storefront reads products straight from the Printify API, rows
-- here will NOT appear on their own. Populate them with an upsert like this
-- (from a scheduled job or an admin action), and the webhook will forward each
-- change to Merchant Center automatically:
--
--   insert into public.products
--     (external_id, title, description, price, mockup_url, stock, size, color, item_group_id, slug)
--   values
--     ('printify_<id>-<variantId>', 'Title', 'Description', 15.50,
--      'https://images-api.printify.com/...', 10, 'L', 'Black',
--      'printify_<id>', 'my-tee--printify_<id>')
--   on conflict (external_id) do update set
--     title       = excluded.title,
--     description = excluded.description,
--     price       = excluded.price,
--     mockup_url  = excluded.mockup_url,
--     stock       = excluded.stock,
--     size        = excluded.size,
--     color       = excluded.color,
--     slug        = excluded.slug;
--
-- Note: Google treats every size/colour combination as its own product, so
-- insert one row per variant and give them a shared item_group_id.
-- ============================================================
