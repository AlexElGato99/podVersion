import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { buildPinterestFeed } from "@/lib/pinterest-feed";

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
 * Reports what the Pinterest feed currently contains, so the settings page can
 * show real numbers instead of asking the admin to open the raw XML.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { items, variantCount } = await buildPinterestFeed(SITE_URL);
    const designs = new Set(items.map((i) => i.item_group_id)).size;

    return NextResponse.json({
      feedUrl: `${SITE_URL}/pinterest-feed.xml`,
      itemCount: items.length,
      designCount: designs,
      variantCount,
      sample: items.slice(0, 3).map((i) => ({
        id: i.id,
        title: i.title,
        price: i.price,
      })),
    });
  } catch (err) {
    console.error("[pinterest-status] Failed to build feed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build feed" },
      { status: 502 }
    );
  }
}
