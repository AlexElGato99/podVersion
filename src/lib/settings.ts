import { createClient } from "@supabase/supabase-js";

export type SettingsSection = "payments" | "printful" | "printify" | "general" | "email" | "analytics";

// Created lazily (not at module load) and guarded — if these env vars are
// missing/misconfigured (e.g. not set for the Vercel "Production" environment
// scope), we must NOT throw here. Throwing at import time would crash every
// route that reads settings (client-id, printful.ts, webhooks, etc.) with an
// unhandled exception instead of a clean JSON error, silently breaking things
// like the PayPal button with no visible cause.
let supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "[settings] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set — " +
      "falling back to .env-only settings (dashboard-saved values will not be read)."
    );
    return null;
  }
  supabaseAdmin = createClient(url, key);
  return supabaseAdmin;
}

// Values read from .env.local — used only as a fallback until an admin saves
// a real value through the dashboard. Once saved, the Supabase-stored value
// always wins, so changes take effect without touching environment variables
// or redeploying.
const ENV_FALLBACKS: Record<SettingsSection, Record<string, string | undefined>> = {
  payments: {
    paypal_client_id: process.env.PAYPAL_CLIENT_ID,
    paypal_client_secret: process.env.PAYPAL_CLIENT_SECRET,
    paypal_environment: process.env.PAYPAL_ENV,
  },
  printful: {
    printful_api_key: process.env.PRINTFUL_API_KEY,
    printful_store_id: process.env.PRINTFUL_STORE_ID,
    printful_webhook_secret: process.env.PRINTFUL_WEBHOOK_SECRET,
  },
  printify: {
    printify_api_key: process.env.PRINTIFY_API_KEY,
    printify_shop_id: process.env.PRINTIFY_SHOP_ID,
  },
  general: {
    /** "printful" | "printify" | "both" */
    pod_provider: process.env.POD_PROVIDER ?? "printful",
  },
  email: {
    email_api_key: process.env.EMAIL_API_KEY,
    email_from_address: process.env.EMAIL_FROM_ADDRESS,
    email_from_name: process.env.EMAIL_FROM_NAME,
    email_support_address: process.env.EMAIL_SUPPORT_ADDRESS,
  },
  analytics: {
    ga_measurement_id: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    gtm_container_id: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID,
    meta_pixel_id: process.env.NEXT_PUBLIC_META_PIXEL_ID,
    meta_conversions_token: process.env.META_CONVERSIONS_TOKEN,
  },
};

let cache: { data: Record<SettingsSection, Record<string, string>>; expires: number } | null = null;
const CACHE_TTL_MS = 15_000; // short TTL — keeps DB reads cheap while still picking up admin edits quickly

// Logged once per server instance instead of on every request — the
// `app_settings` table not existing yet is expected until the admin runs
// supabase-app-settings-migration.sql, and is already handled gracefully
// (falls back to .env values), so it shouldn't spam production logs as a
// repeated "error" on every single page/API request.
let missingTableWarned = false;

async function loadAllSections(): Promise<Record<SettingsSection, Record<string, string>>> {
  if (cache && cache.expires > Date.now()) return cache.data;

  const stored: Partial<Record<SettingsSection, Record<string, string>>> = {};
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin.from("app_settings").select("*");
    if (!error) {
      const rows = (data ?? []) as Array<{ id: string; data: Record<string, string> | null }>;
      for (const row of rows) {
        stored[row.id as SettingsSection] = (row.data ?? {}) as Record<string, string>;
      }
    } else if (error.message.includes("Could not find the table")) {
      // Expected until the migration is run — warn once, not on every request.
      if (!missingTableWarned) {
        missingTableWarned = true;
        console.warn(
          "[settings] 'app_settings' table not found — using .env values only. " +
          "Run supabase-app-settings-migration.sql in Supabase SQL Editor to enable " +
          "saving settings from the dashboard. (This warning will not repeat.)"
        );
      }
    } else {
      console.error("[settings] Failed to read app_settings from Supabase:", error.message);
    }
  }

  const merged = {} as Record<SettingsSection, Record<string, string>>;
  (Object.keys(ENV_FALLBACKS) as SettingsSection[]).forEach((section) => {
    const dbValues = stored[section] ?? {};
    const fallback = ENV_FALLBACKS[section];
    const combined: Record<string, string> = {};
    for (const key of Object.keys(fallback)) {
      combined[key] = dbValues[key] || fallback[key] || "";
    }
    for (const [key, value] of Object.entries(dbValues)) {
      if (!(key in combined)) combined[key] = value;
    }
    merged[section] = combined;
  });

  cache = { data: merged, expires: Date.now() + CACHE_TTL_MS };
  return merged;
}

/** Merged settings for a section — Supabase value if saved, otherwise the .env.local fallback. */
export async function getSettingsSection(section: SettingsSection): Promise<Record<string, string>> {
  const all = await loadAllSections();
  return all[section];
}

export async function getSetting(section: SettingsSection, key: string): Promise<string> {
  const sectionData = await getSettingsSection(section);
  return sectionData[key] ?? "";
}

/** Call right after saving settings so the next read reflects the change immediately. */
export function invalidateSettingsCache() {
  cache = null;
}
