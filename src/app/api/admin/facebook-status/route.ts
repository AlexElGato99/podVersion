import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { buildFacebookFeed } from "@/lib/facebook-feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://veliova.com").replace(/\/$/, "");

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
 * Reports what the Facebook feed currently contains, so the dashboard can
 * show real-time statistics about the catalog.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { items, variantCount } = await buildFacebookFeed(SITE_URL);

    // Count unique designs
    const designs = new Set(items.map((i) => i.item_group_id)).size;

    // Count by availability
    const inStock = items.filter((i) => i.availability === "in stock").length;
    const outOfStock = items.filter((i) => i.availability === "out of stock").length;

    return NextResponse.json({
      feedUrl: `${SITE_URL}/facebook-feed.xml`,
      itemCount: items.length,
      designCount: designs,
      variantCount,
      inStock,
      outOfStock,
      lastUpdated: new Date().toISOString(),
      sample: items.slice(0, 5).map((i) => ({
        id: i.id,
        title: i.title,
        price: `${i.price} ${i.currency}`,
        availability: i.availability,
        color: i.color,
        size: i.size,
      })),
    });
  } catch (err) {
    console.error("[facebook-status] Failed to build feed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build feed" },
      { status: 502 }
    );
  }
}
