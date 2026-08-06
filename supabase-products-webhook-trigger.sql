-- ============================================================
-- POD Store — Create the products webhook directly in SQL
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Use this when the Database → Webhooks UI will not list public.products in
-- its table dropdown. This creates exactly the same object the UI would
-- create: a row-level trigger that calls supabase_functions.http_request().
--
-- Prerequisites (you have already done these):
--   1. public.products exists
--   2. Webhooks are enabled on the project, which installs pg_net and the
--      supabase_functions schema
-- ============================================================

-- Safety check: fail loudly with a clear message if webhooks were never
-- enabled, instead of erroring with an opaque "schema does not exist".
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'supabase_functions' and p.proname = 'http_request'
  ) then
    raise exception
      'supabase_functions.http_request() not found. Open Database → Webhooks in the dashboard and enable webhooks first.';
  end if;
end;
$$;


-- ── Replace these two values before running ──
--   1. The URL must be your PUBLIC deployed site. Supabase's servers make this
--      request, so localhost will not work.
--   2. The secret must match the Webhook secret saved in
--      Dashboard → Settings → Google Merchant.

drop trigger if exists products_to_google_merchant on public.products;

create trigger products_to_google_merchant
  after insert or update or delete on public.products
  for each row
  execute function supabase_functions.http_request(
    'https://veliova.com/api/webhooks/supabase-products',
    'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"REPLACE_WITH_YOUR_WEBHOOK_SECRET"}',
    '{}',
    '5000'
  );


-- ── Verify it was created ──
select
  t.tgname          as trigger_name,
  c.relname         as table_name,
  t.tgenabled       as enabled
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'products'
  and not t.tgisinternal;


-- ── Test it end to end ──
-- Inserting a row fires the webhook immediately. Watch the result in
-- Supabase → Logs → Postgres, or in your app's server logs.
--
--   insert into public.products (title, price, mockup_url, stock, size, color, item_group_id)
--   values ('Webhook test tee', 19.99,
--           'https://images-api.printify.com/mockup/example.jpg',
--           5, 'L', 'Black', 'webhook-test');
--
-- Then remove it again:
--   delete from public.products where item_group_id = 'webhook-test';


-- ── Removing the webhook later ──
--   drop trigger if exists products_to_google_merchant on public.products;
