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

  const { printify_api_key, printify_shop_id } = await getSettingsSection("printify");

  if (!printify_api_key) {
    return NextResponse.json({ error: "No Printify API key saved yet. Add it in Settings → Printify API." }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${printify_api_key}`,

  try {
    // 1. Verify key by fetching shops
    const shopsRes = await fetch("https://api.printify.com/v1/shops.json", { headers });
    if (!shopsRes.ok) {
      const text = await shopsRes.text();
      if (shopsRes.status === 401) {
        return NextResponse.json({ error: "Invalid API key — Printify rejected it (401 Unauthorized)." }, { status: 400 });
      }
      return NextResponse.json({ error: `Printify API error ${shopsRes.status}: ${text}` }, { status: 400 });
    }

    const shops: Array<{ id: number; title: string; sales_channel: string }> = await shopsRes.json();
    if (!shops.length) {
      return NextResponse.json({ error: "API key is valid but no shops were found on this account." }, { status: 400 });
    }

    // 2. Use configured shop or first available
    const shopId = printify_shop_id || String(shops[0].id);
    const activeShop = shops.find((s) => String(s.id) === shopId) ?? shops[0];

    // 3. Fetch product count for the active shop + error details for ALL shops
    const shopDetails = await Promise.all(
      shops.map(async (s) => {
        const r = await fetch(
          `https://api.printify.com/v1/shops/${s.id}/products.json?page=1&limit=1`,
          { headers }
        );
        const rawBody = await r.text();
        if (!r.ok) {
          return { id: s.id, title: s.title, sales_channel: s.sales_channel, error: `HTTP ${r.status}`, error_body: rawBody };
        }
        const d = JSON.parse(rawBody);
        return { id: s.id, title: s.title, sales_channel: s.sales_channel, product_count: d?.total ?? 0 };
      })
    );

    const activeDetail = shopDetails.find((s) => s.id === activeShop.id);

    return NextResponse.json({
      ok: !activeDetail?.error,
      active_shop_id: activeShop.id,
      active_shop_name: activeShop.title,
      all_shops: shopDetails,
    });
  } catch (err) {
    return NextResponse.json({ error: `Connection failed: ${(err as Error).message}` }, { status: 500 });
  }
}
