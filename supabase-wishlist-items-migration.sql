-- Wishlist table for per-user saved products
create table if not exists public.wishlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  image_url text,
  price numeric,
  currency text default 'USD',
  source text check (source in ('printful', 'printify')),
  added_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.wishlist_items enable row level security;

-- Users can read/write only their own wishlist rows
drop policy if exists "wishlist_select_own" on public.wishlist_items;
create policy "wishlist_select_own"
  on public.wishlist_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "wishlist_insert_own" on public.wishlist_items;
create policy "wishlist_insert_own"
  on public.wishlist_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "wishlist_update_own" on public.wishlist_items;
create policy "wishlist_update_own"
  on public.wishlist_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "wishlist_delete_own" on public.wishlist_items;
create policy "wishlist_delete_own"
  on public.wishlist_items
  for delete
  using (auth.uid() = user_id);
