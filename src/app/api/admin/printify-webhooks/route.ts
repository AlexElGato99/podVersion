import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getSettingsSection, invalidateSettingsCache } from "@/lib/settings";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TOPICS = ["order:sent-to-production", "order:shipment:created", "order:shipment:delivered"];

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

/**
 * Registers this store's Printify webhooks so shipment/tracking events flow
 * back into our /api/webhooks/printify route. Printify has no dashboard UI
 * for webhooks (unlike Printful) — they must be created via this API call,
 * which is why this lives behind an admin button rather than a manual field.
 */
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { printify_api_key, printify_shop_id } = await getSettingsSection("printify");
  if (!printify_api_key) {
    return NextResponse.json({ error: "No Printify API key saved yet. Add it in Settings → Printify API." }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL is not configured — required so Printify knows where to send webhooks." }, { status: 400 });
  }
  const webhookUrl = `${siteUrl.replace(/\/$/, "")}/api/webhooks/printify`;

  const headers = {
    Authorization: `Bearer ${printify_api_key}`,
    "Content-Type": "application/json",
  };

  try {
    // Resolve target shop ids the same way the rest of the app does.
    let shopIds: string[];
    if (printify_shop_id) {
      shopIds = printify_shop_id.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      const shopsRes = await fetch("https://api.printify.com/v1/shops.json", { headers });
      if (!shopsRes.ok) {
        return NextResponse.json({ error: `Printify API error ${shopsRes.status}: ${await shopsRes.text()}` }, { status: 400 });
      }
      const shops: Array<{ id: number }> = await shopsRes.json();
      shopIds = shops.map((s) => String(s.id));
    }

    if (!shopIds.length) {
      return NextResponse.json({ error: "No Printify shops found for this account." }, { status: 400 });
    }

    const perShopResults: { shopId: string; secret: string | null; error?: string }[] = [];

    for (const shopId of shopIds) {
      try {
        // Clear out any existing webhooks for our topics before re-registering,
        // so re-clicking this button (e.g. after a domain change) doesn't pile up duplicates.
        const listRes = await fetch(`https://api.printify.com/v1/shops/${shopId}/webhooks.json`, { headers });
        if (listRes.ok) {
          const existing: Array<{ id: string; topic: string }> = await listRes.json();
          for (const hook of existing) {
            if (TOPICS.includes(hook.topic)) {
              await fetch(`https://api.printify.com/v1/shops/${shopId}/webhooks/${hook.id}.json`, {
                method: "DELETE",
                headers,
              }).catch(() => {});
            }
          }
        }

        let secret: string | null = null;
        for (const topic of TOPICS) {
          const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/webhooks.json`, {
            method: "POST",
            headers,
            body: JSON.stringify({ topic, url: webhookUrl }),
          });
          if (!res.ok) {
            throw new Error(`Failed to register "${topic}": HTTP ${res.status} ${await res.text()}`);
          }
          const created: { secret?: string } = await res.json();
          if (created.secret) secret = created.secret;
        }

        perShopResults.push({ shopId, secret });
      } catch (err) {
        perShopResults.push({ shopId, secret: null, error: err instanceof Error ? err.message : String(err) });
      }
    }

    // Printify issues one signing secret per shop; store the first shop's
    // secret as the app-wide verification secret (matches the single-secret
    // check used by /api/webhooks/printify — fine for the common single-shop setup).
    const firstSecret = perShopResults.find((r) => r.secret)?.secret;
    if (firstSecret) {
      const existing = await getSettingsSection("printify");
      await supabaseAdmin.from("app_settings").upsert(
        { id: "printify", data: { ...existing, printify_webhook_secret: firstSecret }, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      invalidateSettingsCache();
    }

    const anyFailed = perShopResults.some((r) => r.error);
    return NextResponse.json(
      { ok: !anyFailed, webhookUrl, shops: perShopResults },
      { status: anyFailed ? 207 : 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: `Connection failed: ${(err as Error).message}` }, { status: 500 });
  }
}
