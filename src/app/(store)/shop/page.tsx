import { Suspense } from "react";
import { getProducts, getProductImageForColor } from "@/lib/printful";
import { createClient } from "@/lib/supabase/server";
import ShopClient from "./ShopClient";

export const metadata = {
  title: "Shop Custom Graphic Tees, Hoodies & Gifts | PrintDrop",
  description: "Browse PrintDrop’s full catalog of artist-designed graphic tees, hoodies, mugs, posters, stickers & more. Printed on demand, shipped across the USA. Free shipping on orders $50+.",
  keywords: ["custom graphic tees", "buy graphic tees online", "print on demand shop", "custom hoodies USA", "unique gifts online", "artist designed shirts"],
  alternates: { canonical: "https://printdrop.com/shop" },
  openGraph: {
    title: "Shop Custom Graphic Tees, Hoodies & Gifts | PrintDrop",
    description: "Artist-designed graphic tees, hoodies, mugs & more. Printed on demand and shipped across the USA. Free shipping on orders $50+.",
    url: "https://printdrop.com/shop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop Custom Graphic Tees, Hoodies & Gifts | PrintDrop",
    description: "Artist-designed graphic tees, hoodies, mugs & more. Free US shipping on orders $50+.",
  },
};

async function ShopWrapper() {
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  let categories: string[] = [];
  let productSettingsMap: Record<number, { custom_mockup_url?: string; primary_color?: string; badge?: string; is_hidden?: boolean }> = {};
  try {
    products = await getProducts();
  } catch {
    // empty
  }
  try {
    const supabase = await createClient();
    const [catData, settingsData] = await Promise.all([
      supabase.from("category_settings").select("categories").eq("id", 1).single(),
      supabase.from("product_settings").select("id,custom_mockup_url,primary_color,badge,is_hidden"),
    ]);
    if (catData.data?.categories?.length) {
      categories = (catData.data.categories as { name: string }[]).map((c) => c.name);
    }
    for (const row of settingsData.data ?? []) {
      productSettingsMap[row.id] = row;
    }
  } catch {
    // empty
  }

  // For products that have a primary_color but no custom_mockup_url, resolve the shirt image
  const resolvedImages = await Promise.all(
    products.map(async (p) => {
      const setting = productSettingsMap[p.id];
      if (setting?.custom_mockup_url) return setting.custom_mockup_url;
      if (setting?.primary_color) {
        const img = await getProductImageForColor(p.id, setting.primary_color);
        if (img) return img;
      }
      return null;
    })
  );

  // Apply custom_mockup_url and filter hidden products
  const enrichedProducts = products
    .filter((p) => !productSettingsMap[p.id]?.is_hidden)
    .map((p, i) => ({
      ...p,
      thumbnail_url: resolvedImages[i] || p.thumbnail_url,
      best_image:    resolvedImages[i] || p.best_image,
      badge:         productSettingsMap[p.id]?.badge ?? undefined,
    }));

  return <ShopClient products={enrichedProducts} categoryOptions={categories} />;
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