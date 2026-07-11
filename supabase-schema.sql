-- ============================================================
-- POD Store — Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES TABLE
--    Extends Supabase auth.users with role and customer info
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-create a profile whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 2. ORDERS TABLE
--    Stores customer orders placed through Printful
-- ────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references public.profiles(id) on delete set null,
  printful_order_id   text unique,          -- Printful's order ID
  status              text not null default 'pending'
                        check (status in ('pending', 'processing', 'fulfilled', 'cancelled', 'refunded')),
  total_amount        numeric(10,2) not null,
  currency            text not null default 'USD',
  shipping_address    jsonb,                -- { name, address1, city, country_code, zip }
  items               jsonb,                -- array of { variant_id, name, quantity, price, image_url }
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 3. COUPONS TABLE
--    Discount codes managed from the dashboard
-- ────────────────────────────────────────────────────────────
create table if not exists public.coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  discount_type   text not null check (discount_type in ('percentage', 'fixed')),
  discount_value  numeric(10,2) not null,
  min_order       numeric(10,2) default 0,
  max_uses        int,                      -- null = unlimited
  used_count      int not null default 0,
  active          boolean not null default true,
  expires_at      timestamptz,
  created_at      timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 4. NOTIFICATIONS TABLE
--    Admin notifications (new orders, etc.)
-- ────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,               -- 'new_order' | 'refund' | 'system'
  title       text not null,
  message     text,
  read        boolean not null default false,
  metadata    jsonb,
  created_at  timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 5. SITE_SETTINGS TABLE
--    Key-value store for dashboard-controlled settings
--    (hero text, SEO, footer, etc.)
-- ────────────────────────────────────────────────────────────
create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz default now()
);

-- Insert default settings
insert into public.site_settings (key, value) values
  ('hero',         '{"title": "Premium Print-On-Demand", "subtitle": "Design your style, we handle the rest.", "cta_text": "Shop Now", "cta_link": "/shop"}'),
  ('seo',          '{"site_title": "POD Store", "meta_description": "Premium print-on-demand products", "og_image": ""}'),
  ('footer',       '{"copyright": "© 2026 POD Store. All rights reserved.", "show_social": true}'),
  ('quick_stats',  '[{"label": "Products", "value": "100+"}, {"label": "Happy Customers", "value": "500+"}, {"label": "Countries", "value": "30+"}]')
on conflict (key) do nothing;

-- ────────────────────────────────────────────────────────────
-- 6. HERO SETTINGS TABLE
--    Single-row table (id = 1) controlling the store hero section.
--    Managed from the admin dashboard at /dashboard/hero
-- ────────────────────────────────────────────────────────────
create table if not exists public.hero_settings (
  id                  int primary key default 1 check (id = 1),   -- singleton
  headline            text not null default 'The leader in quality custom T-Shirts',
  subtitle            text not null default 'Turn your ideas into premium products that leave a lasting impression',
  cta_primary_text    text not null default 'Shop Now',
  cta_primary_link    text not null default '/shop',
  bg_from             text not null default '#d4f1f9',
  bg_to               text not null default '#bde8f7',
  main_image_url      text not null default 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&auto=format&fit=crop&q=80',
  floating_cards      jsonb not null default '[
    {"id":"1","emoji":"🐼","label":"","sublabel":"","bg":"#0d3d5f","text_color":"#ffffff","position":"top-left"},
    {"id":"2","emoji":"","label":"Company Name","sublabel":"Slogan Here","bg":"#ffffff","text_color":"#374151","position":"top-right"},
    {"id":"3","emoji":"🚛","label":"","sublabel":"","bg":"#ffffff","text_color":"#374151","position":"mid-right"},
    {"id":"4","emoji":"👨‍🚀","label":"","sublabel":"","bg":"#d4eaff","text_color":"#374151","position":"bottom-right"}
  ]',
  updated_at          timestamptz default now()
);

-- Seed default row
insert into public.hero_settings (id) values (1) on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────

-- profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- orders
alter table public.orders enable row level security;

create policy "Users can view own orders"
  on public.orders for select
  using (user_id = auth.uid());

create policy "Admins can view all orders"
  on public.orders for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- coupons (admin only write, anyone can read active ones)
alter table public.coupons enable row level security;

create policy "Anyone can read active coupons"
  on public.coupons for select
  using (active = true);

create policy "Admins can manage coupons"
  on public.coupons for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- notifications (admin only)
alter table public.notifications enable row level security;

create policy "Admins can manage notifications"
  on public.notifications for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- site_settings (public read, admin write)
alter table public.site_settings enable row level security;

create policy "Anyone can read site settings"
  on public.site_settings for select
  using (true);

create policy "Admins can update site settings"
  on public.site_settings for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- hero_settings (public read, admin write)
alter table public.hero_settings enable row level security;

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

-- ────────────────────────────────────────────────────────────
-- 7. MAKE YOURSELF AN ADMIN
--    After running this schema, run this query with your
--    user's email address to grant admin access:
--
-- update public.profiles
-- set role = 'admin'
-- where email = 'your-email@example.com';
-- ────────────────────────────────────────────────────────────
-- Step 1: Insert profile if it doesn't exist yet, then set admin role