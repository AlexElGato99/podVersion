import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Revalidate the store pages that show product listings
  revalidatePath("/", "page");
  revalidatePath("/shop", "page");
  revalidatePath("/shop/[id]", "page");
  revalidatePath("/collections", "page");

  // Also bust any fetch cache tags if used
  // (revalidateTag requires a profile in Next.js 15 — skip if not applicable)

  return NextResponse.json({ ok: true, revalidated: ["/", "/shop", "/shop/[id]", "/collections"] });
}
