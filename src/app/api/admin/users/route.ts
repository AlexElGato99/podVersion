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

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned: boolean;
  order_count: number;
}

/**
 * List all users, merging Supabase Auth account data (email confirmation,
 * last sign-in, ban status) with our public.profiles table (role, name) and
 * a quick order count per user — everything the admin needs in one call.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const perPage = Math.min(Number(searchParams.get("perPage") ?? 200), 1000);

  try {
    // Supabase Admin API paginates at 1000/page max — loop until exhausted or cap reached.
    const authUsers: Array<{
      id: string;
      email?: string;
      created_at: string;
      last_sign_in_at?: string | null;
      email_confirmed_at?: string | null;
      banned_until?: string | null;
    }> = [];
    let page = 1;
    for (;;) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      authUsers.push(...data.users);
      if (data.users.length < 1000 || authUsers.length >= perPage) break;
      page += 1;
    }

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, avatar_url, role, created_at");
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const { data: orders } = await supabaseAdmin.from("orders").select("user_id");
    const orderCounts = new Map<string, number>();
    for (const o of orders ?? []) {
      if (!o.user_id) continue;
      orderCounts.set(o.user_id, (orderCounts.get(o.user_id) ?? 0) + 1);
    }

    const rows: AdminUserRow[] = authUsers.map((u) => {
      const profile = profileMap.get(u.id);
      const banned = !!u.banned_until && new Date(u.banned_until).getTime() > Date.now();
      return {
        id: u.id,
        email: profile?.email ?? u.email ?? "",
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        role: profile?.role ?? "customer",
        created_at: profile?.created_at ?? u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        banned,
        order_count: orderCounts.get(u.id) ?? 0,
      };
    });

    rows.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());

    return NextResponse.json({ users: rows, currentUserId: admin.id });
  } catch (err) {
    console.error("[api/admin/users] Failed to list users", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

/**
 * Create a new user account from the admin dashboard. Creates the Supabase
 * Auth user (email + password), which triggers the existing
 * `handle_new_user` DB trigger to insert a matching `profiles` row. If an
 * `admin` role was requested, the profile is then updated accordingly.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string; password?: string; full_name?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const fullName = body.full_name?.trim() || null;
  const role = body.role === "admin" ? "admin" : "customer";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });
    if (error) {
      const status = error.status === 422 || /already/i.test(error.message) ? 409 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    const newUserId = data.user?.id;
    if (newUserId && role === "admin") {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", newUserId);
      if (profileError) {
        console.error("[api/admin/users] Failed to set role on new user", profileError);
      }
    }

    return NextResponse.json({ ok: true, id: newUserId });
  } catch (err) {
    console.error("[api/admin/users] Failed to create user", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
