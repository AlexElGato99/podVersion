import Link from "next/link";
import Image from "next/image";
import { getCatalogCategories } from "@/lib/printful";

export const metadata = {
  title: "Curated Collections — Streetwear, Sportswear, Gifts & More | Veliova",
  description: "Explore Veliova curated collections: Bestsellers, New Arrivals, Streetwear, Sportswear, Eco-friendly & Gift sets. Artist-designed print-on-demand products shipped across the USA.",
  keywords: ["curated apparel collections", "streetwear graphic tees", "sportswear print on demand", "eco friendly shirts", "gift sets USA", "bestseller graphic tees"],
  alternates: { canonical: "https://veliova.com/collections" },
  openGraph: {
    title: "Curated Collections — Streetwear, Sportswear, Gifts & More | Veliova",
    description: "Explore Veliova’s curated collections of custom apparel and gifts. Bestsellers, new arrivals, streetwear & more. Free shipping on orders $50+.",
    url: "https://veliova.com/collections",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Curated Collections | Veliova",
    description: "Bestsellers, Streetwear, Sportswear, Eco-friendly & Gift collections. Artist-designed, shipped across the USA.",
  },
};

interface PrintfulCategory {
  id: number;
  parent_id: number;
  title: string;
  image_url: string;
}

const FEATURED_IDS = [188, 123, 117, 119, 120, 122, 305, 155, 287, 303, 121, 213];

async function getCollections(): Promise<PrintfulCategory[]> {
  try {
    const all = (await getCatalogCategories()) as PrintfulCategory[];
    const collectionCats = all.filter((c) => c.parent_id === 116);
    return [
      ...FEATURED_IDS.map((id) => collectionCats.find((c) => c.id === id)).filter((c): c is PrintfulCategory => !!c),
      ...collectionCats.filter((c) => !FEATURED_IDS.includes(c.id)).sort((a, b) => a.title.localeCompare(b.title)),
    ];
  } catch {
    return [];
  }
}

export default async function CollectionsPage() {
  const collections = await getCollections();
  const featured = collections.slice(0, 2);
  const rest = collections.slice(2);

  return (
    <div className="pt-24 pb-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="py-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">Veliova</p>
          <h1 className="text-4xl font-extrabold text-zinc-900 sm:text-5xl">Collections</h1>
          <p className="mt-3 max-w-lg mx-auto text-zinc-500 text-base">
            Curated groups of products — from streetwear to eco-friendly, gifts to seasonal drops.
          </p>
        </div>

        {/* Featured — 2 large hero cards */}
        {featured.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-5">
            {featured.map((col) => (
              <Link
                key={col.id}
                href={`/shop?collection=${encodeURIComponent(col.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`}
                className="group relative overflow-hidden rounded-3xl bg-zinc-100 aspect-[4/3] flex items-end"
              >
                <Image
                  src={col.image_url}
                  alt={col.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="relative z-10 p-6">
                  <h2 className="text-xl font-bold text-white">{col.title}</h2>
                  <span className="mt-1.5 inline-flex items-center text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                    Shop now →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Rest — standard grid */}
        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {rest.map((col) => (
              <Link
                key={col.id}
                href={`/shop?collection=${encodeURIComponent(col.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`}
                className="group flex flex-col gap-2.5"
              >
                <div className="relative w-full aspect-square overflow-hidden rounded-2xl bg-zinc-100 border border-zinc-200 group-hover:border-brand-300 group-hover:shadow-md transition-all duration-200">
                  <Image
                    src={col.image_url}
                    alt={col.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                </div>
                <span className="text-sm font-medium text-zinc-700 group-hover:text-brand-600 leading-tight transition-colors">
                  {col.title}
                </span>
              </Link>
            ))}
          </div>
        )}

        {collections.length === 0 && (
          <div className="py-24 text-center text-zinc-400">No collections found.</div>
        )}

      </div>
    </div>
  );
}