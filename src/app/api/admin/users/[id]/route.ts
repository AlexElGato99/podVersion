import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Returns the authenticated user only if they hold the 'admin' role, else null. */
async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}

/** Update a user's role and/or ban status. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { role, banned } = body as { role?: string; banned?: boolean };

  if (role !== undefined && !["customer", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Prevent an admin from locking themselves out.
  if (id === admin.id && (role === "customer" || banned === true)) {
    return NextResponse.json(
      { error: "You can't remove your own admin access or ban your own account." },
      { status: 400 }
    );
  }

  try {
    if (role !== undefined) {
      const { error } = await supabaseAdmin.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
    }

    if (banned !== undefined) {
      // "876000h" (100 years) effectively bans indefinitely; "none" lifts any ban.
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: banned ? "876000h" : "none",
      });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/users/:id] Failed to update user", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

/** Permanently delete a user (auth account + profile row via cascade). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/users/:id] Failed to delete user", err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
