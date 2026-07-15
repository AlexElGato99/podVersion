import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/templates — list all saved templates
export async function GET() {
  const { data, error } = await db
    .from("product_templates")
    .select("*")
    .order("catalog_product_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

// POST /api/templates — upsert a template by catalog_product_id
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    catalog_product_id, catalog_product_name, catalog_product_image,
    selected_variant_ids, placement, default_price, notes,
  } = body;

  if (!catalog_product_id) {
    return NextResponse.json({ error: "catalog_product_id required" }, { status: 400 });
  }

  const { data: existing } = await db
    .from("product_templates")
    .select("id")
    .eq("catalog_product_id", catalog_product_id)
    .single();

  if (existing) {
    const { error } = await db
      .from("product_templates")
      .update({
        catalog_product_name,
        catalog_product_image,
        selected_variant_ids: selected_variant_ids ?? [],
        placement: placement ?? "front",
        default_price: default_price ?? "24.99",
        notes: notes ?? "",
        updated_at: new Date().toISOString(),
      })
      .eq("catalog_product_id", catalog_product_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await db
      .from("product_templates")
      .insert({
        catalog_product_id,
        catalog_product_name,
        catalog_product_image,
        selected_variant_ids: selected_variant_ids ?? [],
        placement: placement ?? "front",
        default_price: default_price ?? "24.99",
        notes: notes ?? "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/templates?catalog_product_id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("catalog_product_id");
  if (!id) return NextResponse.json({ error: "catalog_product_id required" }, { status: 400 });
  const { error } = await db
    .from("product_templates")
    .delete()
    .eq("catalog_product_id", parseInt(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
