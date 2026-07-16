import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/mockups?design_product_id=xxx — list stored mockup images for one design+product
export async function GET(req: NextRequest) {
  const designProductId = req.nextUrl.searchParams.get("design_product_id");
  if (!designProductId) return NextResponse.json({ error: "design_product_id required" }, { status: 400 });

  const { data, error } = await db
    .from("mockups")
    .select("*")
    .eq("design_product_id", Number(designProductId))
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mockups: data ?? [] });
}

// PATCH /api/mockups — set one mockup as the featured image for its design_product
// Body: { id, design_product_id }
export async function PATCH(req: NextRequest) {
  const { id, design_product_id } = await req.json();
  if (!id || !design_product_id) {
    return NextResponse.json({ error: "id and design_product_id required" }, { status: 400 });
  }

  await db.from("mockups").update({ is_featured: false }).eq("design_product_id", design_product_id);
  const { error } = await db.from("mockups").update({ is_featured: true }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/mockups?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await db.from("mockups").delete().eq("id", Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
