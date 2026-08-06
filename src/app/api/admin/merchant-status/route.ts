import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getSettingsSection } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin" ? user : null;
}

/**
 * Readiness check for the Merchant Center sync, used by the settings page to
 * show which setup steps are still outstanding. Reports only booleans and
 * counts, never the credential values themselves.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const saved = await getSettingsSection("google_merchant");

  // The webhook fires on row changes, so it needs a real `products` table to
  // watch. Report whether it exists and how many rows it holds.
  let productsTable: { exists: boolean; rowCount: number | null } = {
    exists: false,
    rowCount: null,
  };

  try {
    const { count, error } = await supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true });
    if (!error) {
      productsTable = { exists: true, rowCount: count ?? 0 };
    }
  } catch {
    // Table missing — leave defaults.
  }

  const checks = {
    merchantId: !!saved.google_merchant_id,
    serviceAccountEmail: !!saved.google_merchant_client_email,
    privateKey: !!saved.google_merchant_private_key,
    webhookSecret: !!saved.supabase_webhook_secret,
    productsTable: productsTable.exists,
  };

  return NextResponse.json({
    checks,
    productsRowCount: productsTable.rowCount,
    ready: Object.values(checks).every(Boolean),
    webhookUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || "https://veliova.com").replace(/\/$/, "")}/api/webhooks/supabase-products`,
  });
}
