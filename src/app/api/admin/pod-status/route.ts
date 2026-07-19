import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getSettingsSection, invalidateSettingsCache } from "@/lib/settings";
import { getStoreProducts } from "@/lib/products";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Force-bust the settings cache so we always read fresh DB values
  invalidateSettingsCache();

  const general  = await getSettingsSection("general");
  const printify = await getSettingsSection("printify");
  const printful = await getSettingsSection("printful");

  const provider = general.pod_provider || "printful";

  // --- Step 1: settings check ---
  const settingsCheck = {
    pod_provider_in_db: provider,
    printful_api_key_set: !!printful.printful_api_key,
    printful_store_id: printful.printful_store_id || "(not set)",
    printify_api_key_set: !!printify.printify_api_key,
    printify_shop_id_setting: printify.printify_shop_id || "(blank = auto-detect all shops)",
  };

  // --- Step 2: live Printify raw API call (bypass all caching) ---
  let printifyRaw: Record<string, unknown> = {};
  if (printify.printify_api_key) {
    try {
      const headers = { Authorization: `Bearer ${printify.printify_api_key}` };
      const shopsRes = await fetch("https://api.printify.com/v1/shops.json", { headers, cache: "no-store" });
      if (!shopsRes.ok) {
        printifyRaw = { error: `shops.json HTTP ${shopsRes.status}: ${await shopsRes.text()}` };
      } else {
        const shops: Array<{ id: number; title: string }> = await shopsRes.json();
        const shopIds = printify.printify_shop_id
          ? printify.printify_shop_id.split(",").map((s: string) => s.trim())
          : shops.map((s) => String(s.id));

        const shopResults = await Promise.all(shopIds.map(async (sid) => {
          const r = await fetch(`https://api.printify.com/v1/shops/${sid}/products.json?page=1&limit=50`, { headers, cache: "no-store" });
          const rawBody = await r.text();
          if (!r.ok) return { shop_id: sid, http_status: r.status, error_body: rawBody };
          const d = JSON.parse(rawBody);
          const products = (d.data ?? []) as Array<{ id: string; title: string; visible?: boolean }>;
          return {
            shop_id: sid,
            shop_name: shops.find((s) => String(s.id) === sid)?.title ?? "?",
            total: d.total ?? products.length,
            products: products.map((p) => ({ id: p.id, title: p.title, visible: p.visible !== false })),
          };
        }));
        printifyRaw = { all_account_shops: shops, shops_queried: shopResults };
      }
    } catch (e) {
      printifyRaw = { error: (e as Error).message };
    }
  } else {
    printifyRaw = { skipped: "No Printify API key is saved in Settings → Printify API" };
  }

  // --- Step 3: call the exact same function the storefront uses ---
  let storefrontResult: Record<string, unknown> = {};
  try {
    const products = await getStoreProducts();
    storefrontResult = {
      total: products.length,
      printful_count: products.filter((p) => p._source === "printful").length,
      printify_count: products.filter((p) => p._source === "printify").length,
      sample: products.slice(0, 10).map((p) => ({ id: p.id, name: p.name, source: p._source })),
    };
  } catch (e) {
    storefrontResult = { error: (e as Error).message };
  }

  return NextResponse.json(
    {
      "1_settings": settingsCheck,
      "2_printify_raw_api": printifyRaw,
      "3_storefront_getStoreProducts": storefrontResult,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
