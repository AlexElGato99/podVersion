import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/pricing-rules — list all rules (global + per-product overrides)
export async function GET() {
  const { data, error } = await db
    .from("pricing_rules")
    .select("*")
    .order("scope", { ascending: true })
    .order("catalog_product_id", { ascending: true, nullsFirst: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data ?? [] });
}

// POST /api/pricing-rules — upsert a rule
// Body: { scope: "global" | "product", catalog_product_id?, mode, value, catalog_product_name? }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { scope, catalog_product_id, catalog_product_name, mode, value } = body;

  if (scope !== "global" && scope !== "product") {
    return NextResponse.json({ error: "scope must be 'global' or 'product'" }, { status: 400 });
  }
  if (scope === "product" && !catalog_product_id) {
    return NextResponse.json({ error: "catalog_product_id required for product-scope rules" }, { status: 400 });
  }
  if (!["fixed", "markup", "percentage", "margin"].includes(mode)) {
    return NextResponse.json({ error: "invalid mode" }, { status: 400 });
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return NextResponse.json({ error: "value must be a number" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data: existing } = await db
    .from("pricing_rules")
    .select("id")
    .eq("scope", scope)
    .eq(scope === "global" ? "scope" : "catalog_product_id", scope === "global" ? "global" : catalog_product_id)
    .maybeSingle();

  if (existing) {
    const { error } = await db
      .from("pricing_rules")
      .update({ mode, value, catalog_product_name: catalog_product_name ?? null, updated_at: now })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: existing.id });
  }

  const { data: inserted, error } = await db
    .from("pricing_rules")
    .insert({
      scope,
      catalog_product_id: scope === "product" ? catalog_product_id : null,
      catalog_product_name: catalog_product_name ?? null,
      mode,
      value,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: inserted?.id });
}

// DELETE /api/pricing-rules?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await db.from("pricing_rules").delete().eq("id", Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
