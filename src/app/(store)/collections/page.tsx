import Link from "next/link";
import Image from "next/image";
import { getStoreProducts } from "@/lib/products";
import { productSlug } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Curated Collections — Retirement, Gifts, Floral & More | Veliova",
  description: "Explore Veliova curated collections, grouped by real product themes — Retirement Gifts, Healthcare & Therapy, Floral Designs, and more. Artist-designed print-on-demand products shipped across the USA.",
  keywords: ["retirement gift shirts", "healthcare gift shirts", "floral graphic tees", "curated apparel collections", "gift sets USA"],
  alternates: { canonical: "https://veliova.com/collections" },
  openGraph: {
    title: "Curated Collections — Retirement, Gifts, Floral & More | Veliova",
    description: "Explore Veliova’s curated collections, grouped by real product themes. Free shipping on orders $50+.",
    url: "https://veliova.com/collections",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Curated Collections | Veliova",
    description: "Curated collections grouped by real product themes. Shipped across the USA.",
  },
};

interface CollectionProduct {
  id: string;
  name: string;
  image: string;
  href: string;
}

interface Collection {
  key: string;
  label: string;
  searchTerm: string;
  products: CollectionProduct[];
}

// ── Real collections, built from what's actually in the catalog ──
// Printful's own generic collection taxonomy (Streetwear, Halloween, Made in
// EU, ...) doesn't reflect what this store actually sells. Instead, products
// are grouped by real recurring themes detected from their own titles —
// checked most-specific-first so e.g. an "Occupational Therapy" tee doesn't
// fall into the generic "Floral" bucket just because it also has flowers on it.
const THEME_BUCKETS: { key: string; label: string; searchTerm: string; test: RegExp }[] = [
  { key: "fishing", label: "Fishing", searchTerm: "fishing", test: /fishing|angler/i },
  { key: "faith", label: "Faith & Scripture", searchTerm: "faith", test: /christ|faith|scripture|\bcross\b/i },
  { key: "outdoors", label: "Nature & Outdoors", searchTerm: "mountain", test: /sasquatch|national park|mountain/i },
  { key: "teacher", label: "Teacher Gifts", searchTerm: "teach", test: /teach|mentor/i },
  { key: "healthcare", label: "Healthcare & Therapy", searchTerm: "technician", test: /behavior technician|\brbt\b|occupational therapy|\bot\b design/i },
  { key: "retirement", label: "Retirement Gifts", searchTerm: "retire", test: /retir/i },
  { key: "floral", label: "Floral Designs", searchTerm: "floral", test: /floral|bouquet|flower/i },
  { key: "basics", label: "Everyday Basics", searchTerm: "plain", test: /\bblank\b|plain white|minimal|yellow dot/i },
];
const DEFAULT_BUCKET = { key: "novelty", label: "Novelty & Gifts", searchTerm: "" };

// Buckets smaller than this look sparse as a standalone collection tile —
// fold them into the general Novelty & Gifts bucket instead.
const MIN_COLLECTION_SIZE = 2;

interface AdminCollectionDef {
  id: string;
  label: string;
  /** Product name must contain at least one of these (case-insensitive) to match. */
  keywords: string[];
}

/** Collections defined in Dashboard → Collections, if any have been saved. */
async function getAdminCollectionDefs(): Promise<AdminCollectionDef[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("collections_settings").select("collections").eq("id", 1).single();
    const defs = (data?.collections ?? []) as AdminCollectionDef[];
    return defs.filter((d) => d.label && d.keywords?.length > 0);
  } catch {
    return [];
  }
}

async function getCollections(): Promise<Collection[]> {
  let products: Awaited<ReturnType<typeof getStoreProducts>> = [];
  try {
    products = await getStoreProducts();
  } catch {
    return [];
  }

  const adminDefs = await getAdminCollectionDefs();

  // Admin-defined collections (Dashboard → Collections) take over entirely
  // when any are saved; otherwise fall back to the built-in theme buckets.
  // Either way, PRODUCT-to-collection assignment stays automatic (by
  // keyword match against the product's own name) so collections keep
  // updating themselves as the catalog changes — admins only edit the
  // collection definitions, not per-product tagging.
  const defs: { key: string; label: string; searchTerm: string; matches: (name: string) => boolean }[] =
    adminDefs.length > 0
      ? adminDefs.map((d) => ({
          key: d.id,
          label: d.label,
          searchTerm: d.keywords[0] ?? "",
          matches: (name: string) => d.keywords.some((k) => name.toLowerCase().includes(k.toLowerCase())),
        }))
      : THEME_BUCKETS.map((b) => ({ key: b.key, label: b.label, searchTerm: b.searchTerm, matches: (name: string) => b.test.test(name) }));

  const buckets = new Map<string, Collection>();
  for (const p of products) {
    const match = defs.find((d) => d.matches(p.name));
    const { key, label, searchTerm } = match ?? DEFAULT_BUCKET;
    if (!buckets.has(key)) buckets.set(key, { key, label, searchTerm, products: [] });
    buckets.get(key)!.products.push({
      id: String(p.id),
      name: p.name,
      image: p.best_image || p.thumbnail_url,
      href: `/shop/${productSlug(p.name, p.id)}`,
    });
  }

  // Fold undersized buckets into the default Novelty bucket rather than
  // showing 1-product "collections".
  const novelty = buckets.get(DEFAULT_BUCKET.key) ?? { ...DEFAULT_BUCKET, products: [] };
  for (const [key, col] of buckets) {
    if (key !== DEFAULT_BUCKET.key && col.products.length < MIN_COLLECTION_SIZE) {
      novelty.products.push(...col.products);
      buckets.delete(key);
    }
  }
  if (novelty.products.length > 0) buckets.set(DEFAULT_BUCKET.key, novelty);

  return Array.from(buckets.values()).sort((a, b) => b.products.length - a.products.length);
}

export default async function CollectionsPage() {
  const collections = await getCollections();
  const featured = collections.slice(0, 2);
  const rest = collections.slice(2);

  return (
    <div className="pt-20 sm:pt-32 pb-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="py-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">Veliova</p>
          <h1 className="text-4xl font-extrabold text-zinc-900 sm:text-5xl">Collections</h1>
          <p className="mt-3 max-w-lg mx-auto text-zinc-500 text-base">
            Real groups of products from our own catalog — not generic categories.
          </p>
        </div>

        {/* Featured — 2 large hero cards, 2x2 photo mosaic of real products */}
        {featured.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-5">
            {featured.map((col) => {
              const tiles = col.products.slice(0, 4);
              return (
                <Link
                  key={col.key}
                  href={col.searchTerm ? `/shop?q=${encodeURIComponent(col.searchTerm)}` : "/shop"}
                  className="group relative overflow-hidden rounded-3xl bg-zinc-100 aspect-[4/3] flex items-end"
                >
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
                    {tiles.map((p, i) => (
                      <div key={p.id} className={`relative overflow-hidden ${tiles.length === 1 ? "col-span-2 row-span-2" : ""} ${tiles.length === 3 && i === 0 ? "row-span-2" : ""}`}>
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className="relative z-10 p-6">
                    <h2 className="text-xl font-bold text-white">{col.label}</h2>
                    <span className="mt-1.5 inline-flex items-center text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                      Shop now →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Rest — standard grid, one representative real product photo each */}
        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {rest.map((col) => {
              const cover = col.products[0];
              return (
                <Link
                  key={col.key}
                  href={col.searchTerm ? `/shop?q=${encodeURIComponent(col.searchTerm)}` : "/shop"}
                  className="group flex flex-col gap-2.5"
                >
                  <div className="relative w-full aspect-square overflow-hidden rounded-2xl bg-zinc-100 border border-zinc-200 group-hover:border-brand-300 group-hover:shadow-md transition-all duration-200">
                    {cover && (
                      <Image
                        src={cover.image}
                        alt={col.label}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium text-zinc-700 group-hover:text-brand-600 leading-tight transition-colors">
                    {col.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {collections.length === 0 && (
          <div className="py-24 text-center text-zinc-400">No collections found.</div>
        )}

      </div>
    </div>
  );
}
