import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/designs — list all designs
export async function GET() {
  const { data, error } = await db
    .from("designs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ designs: data ?? [] });
}

// POST /api/designs — create/update design metadata
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { error } = body.id
    ? await db.from("designs").update({ ...body, updated_at: new Date().toISOString() }).eq("id", body.id)
    : await db.from("designs").insert({ ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/designs?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Also delete from Supabase Storage
  const { data: design } = await db.from("designs").select("storage_path").eq("id", id).single();
  if (design?.storage_path) {
    await db.storage.from("designs").remove([design.storage_path]);
  }

  const { error } = await db.from("designs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
