import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Heart, ChevronLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "My Wishlist",
  description: "Products you saved to your wishlist.",
  robots: { index: false },
};

type WishlistItem = {
  product_id: string;
  product_name: string;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  source: "printful" | "printify" | null;
  added_at: string;
};

async function removeWishlistItem(formData: FormData) {
  "use server";
  const productId = String(formData.get("product_id") ?? "");
  if (!productId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("wishlist_items")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);
}

export default async function WishlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data, error } = await supabase
    .from("wishlist_items")
    .select("product_id, product_name, image_url, price, currency, source, added_at")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  const items: WishlistItem[] = error?.code === "42P01" ? [] : ((data ?? []) as WishlistItem[]);

  return (
    <div className="pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link href="/account" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 mb-6">
          <ChevronLeft className="h-4 w-4" />
          Back to Account
        </Link>

        <h1 className="text-2xl font-bold text-zinc-900 mb-8">My Wishlist</h1>

        {items.length === 0 ? (
          <div className="card p-10 text-center">
            <Heart className="mx-auto h-10 w-10 text-zinc-300 mb-4" />
            <p className="text-zinc-500 mb-6">Your wishlist is empty.</p>
            <Link href="/shop" className="btn-primary">Browse products</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.product_id} className="card p-4 flex items-center gap-4">
                <Link href={`/shop/${item.product_id}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                  <Image
                    src={item.image_url || "/placeholder-product.jpg"}
                    alt={item.product_name}
                    fill
                    sizes="64px"
                    className="object-cover"
                    unoptimized
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link href={`/shop/${item.product_id}`} className="font-semibold text-zinc-900 hover:text-brand-600 transition-colors line-clamp-1">
                    {item.product_name}
                  </Link>
                  <p className="text-xs text-zinc-500 mt-1">
                    Added {new Date(item.added_at).toLocaleDateString()}
                    {item.source ? ` · ${item.source}` : ""}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-900">
                    {item.price != null ? formatPrice(item.price, item.currency || "USD") : "-"}
                  </p>
                  <form action={removeWishlistItem}>
                    <input type="hidden" name="product_id" value={item.product_id} />
                    <button
                      type="submit"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
