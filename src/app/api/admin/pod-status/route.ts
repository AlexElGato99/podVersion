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

  const provider = general.pod_provider ?? "(not set — defaults to printful)";

  const result: Record<string, unknown> = {
    active_provider: provider,
    printful: {
      api_key_set: !!printful.printful_api_key,
      store_id: printful.printful_store_id || "(not set)",
    },
    printify: {
      api_key_set: !!printify.printify_api_key,
      shop_id: printify.printify_shop_id || "(not set — will auto-detect)",
    },
  };

  // Try live Printify fetch to see what products are actually visible
  if (printify.printify_api_key) {
    try {
      const headers = { Authorization: `Bearer ${printify.printify_api_key}`, "Content-Type": "application/json" };
      const shopRes = await fetch("https://api.printify.com/v1/shops.json", { headers });
      if (shopRes.ok) {
        const shops: Array<{ id: number; title: string }> = await shopRes.json();
        const activeId = printify.printify_shop_id || String(shops[0]?.id);
        const prodRes  = await fetch(`https://api.printify.com/v1/shops/${activeId}/products.json?page=1&limit=5`, { headers, cache: "no-store" });
        if (prodRes.ok) {
          const data = await prodRes.json();
          result.printify_live = {
            shop_used: activeId,
            total_products: data.total,
            sample_titles: (data.data as Array<{ title: string; visible: boolean }>)
              .map((p) => `${p.title}${p.visible === false ? " [HIDDEN]" : ""}`),
          };
        } else {
          result.printify_live = { error: `products fetch failed: ${prodRes.status}` };
        }
      }
    } catch (e) {
      result.printify_live = { error: (e as Error).message };
    }
  }

  return NextResponse.json(result);
}
