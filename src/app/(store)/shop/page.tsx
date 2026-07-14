import { Suspense } from "react";
import { getProducts } from "@/lib/printful";
import { createClient } from "@/lib/supabase/server";
import ShopClient from "./ShopClient";

export const metadata = {
  title: "Shop Custom Graphic Tees, Hoodies & Gifts",
  description: "Browse PrintDrop's full catalog of custom print-on-demand products — graphic tees, hoodies, mugs, posters, stickers & more. Free shipping on orders $50+.",
  openGraph: {
    title: "Shop Custom Graphic Tees, Hoodies & Gifts | PrintDrop",
    description: "Browse PrintDrop's full catalog of custom print-on-demand products — graphic tees, hoodies, mugs, posters, stickers & more. Free shipping on orders $50+.",
  },
};

async function ShopWrapper() {
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  let categories: string[] = [];
  try {
    products = await getProducts();
  } catch {
    // empty
  }
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("category_settings").select("categories").eq("id", 1).single();
    if (data?.categories?.length) {
      categories = (data.categories as { name: string }[]).map((c) => c.name);
    }
  } catch {
    // empty
  }
  return <ShopClient products={products} categoryOptions={categories} />;
}

export default function ShopPage() {
  return (
    <div className="pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-10">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">All Products</h1>
          <p className="mt-2 text-zinc-500">Discover our full collection of premium print-on-demand products.</p>
        </div>
        <Suspense fallback={
          <div className="flex gap-8">
            <div className="w-60 shrink-0 h-96 rounded-2xl bg-zinc-100 animate-pulse" />
            <div className="flex-1 grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-zinc-100 animate-pulse" />
              ))}
            </div>
          </div>
        }>
          <ShopWrapper />
        </Suspense>
      </div>
    </div>
  );
}