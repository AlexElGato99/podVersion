import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/collections — list all collections with their products
export async function GET() {
  const { data: collections, error } = await db
    .from("collections")
    .select("*, collection_products(catalog_product_id, catalog_product_name, catalog_product_image, placement, default_price, is_enabled, sort_order)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collections: collections ?? [] });
}

// POST /api/collections — create or update a collection
export async function POST(req: NextRequest) {
  const body = await req.json();
  // Accept both `products` and `collection_products` key names
  const products = body.products ?? body.collection_products;
  // Only keep real DB columns for the collections table
  const { id, name, description, status } = body;
  const collectionRow = { name, description, status: status ?? "active" };

  let collectionId = id;

  if (collectionId) {
    // Update existing
    const { error } = await db
      .from("collections")
      .update({ ...collectionRow, updated_at: new Date().toISOString() })
      .eq("id", collectionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Create new
    const { data, error } = await db
      .from("collections")
      .insert({ ...collectionRow, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    collectionId = data.id;
  }

  // Upsert products in collection
  if (Array.isArray(products)) {
    // Delete removed products
    await db.from("collection_products").delete().eq("collection_id", collectionId);
    // Re-insert
    if (products.length > 0) {
      const { error } = await db.from("collection_products").insert(
        products.map((p, i) => ({ ...p, collection_id: collectionId, sort_order: i }))
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, id: collectionId });
}

// DELETE /api/collections?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.from("collection_products").delete().eq("collection_id", id);
  const { error } = await db.from("collections").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
