import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

/** GET /api/admin/product-overrides — return all saved overrides */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("product_overrides")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    // Table may not exist yet — return empty array gracefully
    if (error.code === "42P01") return NextResponse.json({ overrides: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ overrides: data ?? [] });
}

/** PUT /api/admin/product-overrides — upsert overrides for one or more products */
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    product_id: string;
    source: "printful" | "printify";
    custom_title?: string | null;
    featured_image?: string | null;
    featured_color?: string | null;
    is_hidden?: boolean;
  };

  if (!body.product_id || !body.source) {
    return NextResponse.json({ error: "product_id and source are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("product_overrides")
    .upsert(
      {
        product_id: String(body.product_id),
        source: body.source,
        custom_title: body.custom_title ?? null,
        featured_image: body.featured_image ?? null,
        featured_color: body.featured_color ?? null,
        is_hidden: body.is_hidden ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ override: data });
}
