import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/mockup-presets — list all presets
export async function GET() {
  const { data, error } = await db
    .from("mockup_presets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ presets: data ?? [] });
}

// POST /api/mockup-presets — create or update a preset
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, name, description, products } = body;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  if (id) {
    const { error } = await db
      .from("mockup_presets")
      .update({ name, description: description ?? "", products: products ?? [], updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { data, error } = await db
    .from("mockup_presets")
    .insert({ name, description: description ?? "", products: products ?? [] })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

// DELETE /api/mockup-presets?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await db.from("mockup_presets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
