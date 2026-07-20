-- Homepage sections table used by /dashboard/homepage-sections
create table if not exists public.homepage_sections (
  key text primary key,
  label text not null,
  subtitle text not null,
  shop_slug text not null default '',
  is_visible boolean not null default true,
  max_products integer not null default 6 check (max_products >= 1 and max_products <= 12),
  sort_order integer not null default 0,
  bg text not null default 'white' check (bg in ('white', 'zinc')),
  badge_first text,
  badge_second text,
  updated_at timestamptz not null default now()
);

-- Seed defaults (idempotent)
insert into public.homepage_sections (key, label, subtitle, shop_slug, is_visible, max_products, sort_order, bg)
values
  ('tshirts',  'Custom T-Shirts & Graphic Tees', 'Premium unisex tees with vibrant DTG prints', 't-shirt', true, 6, 0, 'white'),
  ('hoodies',  'Hoodies & Sweatshirts',          'Cozy custom hoodies — perfect for every season', 'hoodie', true, 6, 1, 'zinc'),
  ('mugs',     'Custom Mugs & Drinkware',        'Start your morning with your favourite design', 'mug', true, 6, 2, 'white'),
  ('stickers', 'Stickers & Decals',              'Waterproof, fade-resistant custom stickers', 'sticker', true, 6, 3, 'zinc'),
  ('caps',     'Caps & Hats',                    'Structured & unstructured caps for every style', 'cap', true, 6, 4, 'white'),
  ('other',    'Accessories & More',             'Posters, phone cases, tote bags & beyond', '', true, 6, 5, 'zinc')
on conflict (key) do nothing;

-- Optional: keep updated_at fresh when a row is changed
create or replace function public.set_homepage_sections_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_homepage_sections_updated_at on public.homepage_sections;
create trigger trg_homepage_sections_updated_at
before update on public.homepage_sections
for each row execute function public.set_homepage_sections_updated_at();
