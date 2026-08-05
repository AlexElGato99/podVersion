import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface StoredRow { id: string; data: Record<string, unknown> | null }

export async function GET() {
  const { data, error } = await supabaseAdmin.from("seo_settings").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Flatten { id, data: {...} } back into { id, ...fields } — the shape the
  // dashboard already expects (this table stores each row's arbitrary field
  // set under a jsonb `data` column rather than as fixed SQL columns, same
  // pattern as app_settings/hero_settings).
  const settings = ((data ?? []) as StoredRow[]).map((row) => ({ id: row.id, ...(row.data ?? {}) }));
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body ?? {};
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabaseAdmin
    .from("seo_settings")
    .upsert({ id, data: fields, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
