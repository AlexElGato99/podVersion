import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/design-products?design_id=xxx
export async function GET(req: NextRequest) {
  const design_id = req.nextUrl.searchParams.get("design_id");
  if (!design_id) return NextResponse.json({ error: "design_id required" }, { status: 400 });

  const { data, error } = await db
    .from("design_products")
    .select("*")
    .eq("design_id", design_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

// POST /api/design-products — upsert a single design-product config
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    design_id,
    catalog_product_id,
    catalog_product_name,
    catalog_product_image,
    is_enabled,
    placement,
    position_data,
    selected_variant_ids,
    default_price,
    selected_mockup_url,
  } = body;

  if (!design_id || !catalog_product_id) {
    return NextResponse.json({ error: "design_id and catalog_product_id required" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Try update first (matching unique constraint)
  const { data: existing } = await db
    .from("design_products")
    .select("id, printful_sync_product_id, status")
    .eq("design_id", design_id)
    .eq("catalog_product_id", catalog_product_id)
    .maybeSingle();

  if (existing) {
    // If already published and config changed, mark as needs_update
    const newStatus =
      existing.printful_sync_product_id && existing.status === "published"
        ? "needs_update"
        : existing.status ?? "draft";

    const { error } = await db
      .from("design_products")
      .update({
        ...(catalog_product_name !== undefined && { catalog_product_name }),
        ...(catalog_product_image !== undefined && { catalog_product_image }),
        ...(is_enabled !== undefined && { is_enabled }),
        ...(placement !== undefined && { placement }),
        ...(position_data !== undefined && { position_data }),
        ...(selected_variant_ids !== undefined && { selected_variant_ids }),
        ...(default_price !== undefined && { default_price }),
        ...(selected_mockup_url !== undefined && { selected_mockup_url }),
        status: newStatus,
        updated_at: now,
      })
      .eq("id", existing.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: existing.id });
  }

  // Insert
  const { data: inserted, error } = await db
    .from("design_products")
    .insert({
      design_id,
      catalog_product_id,
      catalog_product_name,
      catalog_product_image,
      is_enabled: is_enabled ?? false,
      placement: placement ?? "front",
      position_data: position_data ?? null,
      selected_mockup_url: selected_mockup_url ?? null,
      selected_variant_ids: selected_variant_ids ?? [],
      default_price: default_price ?? "24.99",
      status: "draft",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: inserted?.id });
}

// DELETE /api/design-products?design_id=xxx&catalog_product_id=yyy
export async function DELETE(req: NextRequest) {
  const design_id          = req.nextUrl.searchParams.get("design_id");
  const catalog_product_id = req.nextUrl.searchParams.get("catalog_product_id");
  if (!design_id || !catalog_product_id) {
    return NextResponse.json({ error: "design_id and catalog_product_id required" }, { status: 400 });
  }
  const { error } = await db
    .from("design_products")
    .delete()
    .eq("design_id", design_id)
    .eq("catalog_product_id", Number(catalog_product_id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
