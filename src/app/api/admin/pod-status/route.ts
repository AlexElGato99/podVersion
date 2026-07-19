import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getSettingsSection } from "@/lib/settings";

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

  const general  = await getSettingsSection("general");
  const printify = await getSettingsSection("printify");
  const printful = await getSettingsSection("printful");

  const provider = general.pod_provider || "printful";

  const result: Record<string, unknown> = {
    "1_active_provider": provider,
    "2_printful": {
      api_key_set: !!printful.printful_api_key,
      store_id: printful.printful_store_id || "(not set)",
    },
    "3_printify": {
      api_key_set: !!printify.printify_api_key,
      shop_id_setting: printify.printify_shop_id || "(blank = auto-detect all shops)",
    },
  };

  // Live Printify test
  if (printify.printify_api_key) {
    try {
      const headers = {
        Authorization: `Bearer ${printify.printify_api_key}`,
        "Content-Type": "application/json",
      };

      // Get all shops
      const shopsRes = await fetch("https://api.printify.com/v1/shops.json", { headers, cache: "no-store" });
      if (!shopsRes.ok) {
        result["4_printify_live"] = { error: `shops.json failed with status ${shopsRes.status}` };
      } else {
        const shops: Array<{ id: number; title: string }> = await shopsRes.json();
        const shopIds = printify.printify_shop_id
          ? printify.printify_shop_id.split(",").map((s: string) => s.trim())
          : shops.map((s) => String(s.id));

        const shopDetails = await Promise.all(
          shopIds.map(async (shopId) => {
            try {
              const r = await fetch(
                `https://api.printify.com/v1/shops/${shopId}/products.json?page=1&limit=5`,
                { headers, cache: "no-store" }
              );
              if (!r.ok) return { shop_id: shopId, error: `HTTP ${r.status}` };
              const data = await r.json();
              return {
                shop_id: shopId,
                shop_title: shops.find((s) => String(s.id) === shopId)?.title ?? "unknown",
                total_products: data.total ?? 0,
                sample: (data.data as Array<{ title: string; visible?: boolean }>)
                  ?.slice(0, 5)
                  .map((p) => p.title) ?? [],
              };
            } catch (e) {
              return { shop_id: shopId, error: (e as Error).message };
            }
          })
        );

        result["4_printify_live"] = { shops_on_account: shops.map((s) => ({ id: s.id, title: s.title })), shops_fetched: shopDetails };
      }
    } catch (e) {
      result["4_printify_live"] = { error: (e as Error).message };
    }
  } else {
    result["4_printify_live"] = "skipped — no API key saved";
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
