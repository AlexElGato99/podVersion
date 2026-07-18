import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getSettingsSection, invalidateSettingsCache } from "@/lib/settings";

const SECTIONS = ["payments", "printful", "printify", "general", "email", "analytics"] as const;
type Section = (typeof SECTIONS)[number];

// Field names holding real secrets — masked on read, and only overwritten
// when the admin submits a new, non-blank value (blank = keep existing).
const SECRET_FIELDS: Record<Section, string[]> = {
  payments: ["paypal_client_secret"],
  printful: ["printful_api_key", "printful_webhook_secret"],
  printify: ["printify_api_key"],
  general: [],
  email: ["email_api_key"],
  analytics: ["meta_conversions_token"],
};

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Returns the authenticated user only if they hold the 'admin' role, else null. */
async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}

function maskValue(value: string) {
  if (!value) return "";
  return value.length <= 4 ? "••••" : `••••${value.slice(-4)}`;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings: Record<Section, Record<string, string>> = {
    payments: {},
    printful: {},
    printify: {},
    general: {},
    email: {},
    analytics: {},
  };

  for (const section of SECTIONS) {
    // Merged view: Supabase-stored value if an admin has saved one, otherwise
    // seeded from .env.local — so the dashboard always shows real current values.
    const raw = await getSettingsSection(section);
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      masked[key] = SECRET_FIELDS[section].includes(key) ? maskValue(String(value ?? "")) : String(value ?? "");
    }
    settings[section] = masked;
  }

  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const section = body.section as Section;
  if (!SECTIONS.includes(section)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }

  const incoming = (body.data ?? {}) as Record<string, string>;
  const secretKeys = SECRET_FIELDS[section];

  // Merged view (DB value, or .env.local seed if never saved before) — used as
  // the base so a first save persists any env-seeded secrets into Supabase too.
  const existing = await getSettingsSection(section);

  // Blank secret fields mean "leave unchanged" — never overwrite a stored
  // secret with an empty string just because the admin didn't retype it.
  const merged: Record<string, string> = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (secretKeys.includes(key) && !value) continue;
    merged[key] = value;
  }

  const { error } = await supabaseAdmin
    .from("app_settings")
    .upsert({ id: section, data: merged, updated_at: new Date().toISOString() }, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateSettingsCache();
  return NextResponse.json({ ok: true });
}
