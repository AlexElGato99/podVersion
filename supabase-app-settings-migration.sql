-- App Settings migration
-- Stores admin-editable integration settings (Payments, Printful API, Email, Analytics)
-- shown as tabs on the dashboard's General Settings page.
--
-- Security notes:
--   * RLS is enabled with NO policies, so this table is completely unreachable
--     via the anon or authenticated Supabase keys (client-side code, PostgREST, etc.).
--   * The only way to read/write this table is through the service-role key,
--     which is used exclusively by src/app/api/app-settings/route.ts on the server.
--   * That route additionally requires the caller to be an authenticated Supabase
--     user whose `profiles.role` is 'admin' before it will read or write anything.
--   * Secret-type fields (API keys/tokens) are masked before being sent to the
--     browser and are only overwritten when the admin submits a new, non-blank value.

create table if not exists public.app_settings (
  id text primary key,                          -- 'payments' | 'printful' | 'email' | 'analytics'
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
-- Intentionally no policies: only the service-role key (server-only) can access this table.
