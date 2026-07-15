import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("homepage_sections")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sections: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (Array.isArray(body)) {
    // Bulk upsert (save all sections at once)
    const { error } = await supabaseAdmin
      .from("homepage_sections")
      .upsert(body.map((s) => ({ ...s, updated_at: new Date().toISOString() })), { onConflict: "key" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Single upsert
    const { error } = await supabaseAdmin
      .from("homepage_sections")
      .upsert({ ...body, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
