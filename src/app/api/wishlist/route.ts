import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type WishlistItem = {
  user_id: string;
  product_id: string;
  product_name: string;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  source: "printful" | "printify" | null;
  added_at: string;
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const productId = req.nextUrl.searchParams.get("product_id");

  const query = supabase
    .from("wishlist_items")
    .select("product_id, product_name, image_url, price, currency, source, added_at")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  const { data, error } = productId ? await query.eq("product_id", productId) : await query;

  if (error) {
    // Table may not exist yet.
    if (error.code === "42P01") {
      if (productId) return NextResponse.json({ liked: false, item: null });
      return NextResponse.json({ items: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (productId) {
    const item = (data?.[0] ?? null) as Omit<WishlistItem, "user_id"> | null;
    return NextResponse.json({ liked: !!item, item });
  }

  return NextResponse.json({ items: (data ?? []) as Omit<WishlistItem, "user_id">[] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    product_id?: string;
    product_name?: string;
    image_url?: string | null;
    price?: number | null;
    currency?: string | null;
    source?: "printful" | "printify" | null;
  };

  if (!body.product_id || !body.product_name) {
    return NextResponse.json({ error: "product_id and product_name are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("wishlist_items")
    .upsert(
      {
        user_id: user.id,
        product_id: String(body.product_id),
        product_name: body.product_name,
        image_url: body.image_url ?? null,
        price: body.price ?? null,
        currency: body.currency ?? "USD",
        source: body.source ?? null,
        added_at: new Date().toISOString(),
      },
      { onConflict: "user_id,product_id" }
    )
    .select("product_id, product_name, image_url, price, currency, source, added_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { product_id?: string };
  if (!body.product_id) {
    return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", String(body.product_id));

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ ok: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
