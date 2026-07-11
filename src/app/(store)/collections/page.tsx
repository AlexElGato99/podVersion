import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Collections",
  description: "Browse our curated product collections.",
};

const collections = [
  {
    name: "Summer Vibes",
    description: "Bright, bold designs for the sunny season.",
    href: "/shop?collection=summer",
    gradient: "from-amber-500 to-orange-600",
    count: 24,
  },
  {
    name: "Minimalist Series",
    description: "Clean lines, understated elegance.",
    href: "/shop?collection=minimal",
    gradient: "from-zinc-600 to-zinc-700",
    count: 18,
  },
  {
    name: "Urban Street",
    description: "City-inspired graphics and streetwear.",
    href: "/shop?collection=urban",
    gradient: "from-brand-600 to-accent-600",
    count: 31,
  },
  {
    name: "Nature & Outdoors",
    description: "Inspired by the beauty of the natural world.",
    href: "/shop?collection=nature",
    gradient: "from-green-600 to-emerald-700",
    count: 15,
  },
  {
    name: "Abstract Art",
    description: "Bold colors and expressive abstract designs.",
    href: "/shop?collection=abstract",
    gradient: "from-pink-600 to-rose-700",
    count: 22,
  },
  {
    name: "Retro & Vintage",
    description: "Classic styles with a nostalgic twist.",
    href: "/shop?collection=retro",
    gradient: "from-yellow-600 to-amber-700",
    count: 19,
  },
];

export default function CollectionsPage() {
  return (
    <div className="pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-12 text-center">
          <h1 className="section-title">Collections</h1>
          <p className="mt-4 max-w-xl mx-auto text-zinc-500">
            Curated groups of products with a common theme or aesthetic.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <Link
              key={col.name}
              href={col.href}
              className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <div
                className={`h-48 bg-gradient-to-br ${col.gradient} opacity-80 group-hover:opacity-100 transition-opacity`}
              />
              <div className="p-6">
                <h2 className="text-lg font-bold text-zinc-900 group-hover:text-brand-500 transition-colors">
                  {col.name}
                </h2>
                <p className="mt-1.5 text-sm text-zinc-500">{col.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="badge bg-zinc-100 text-zinc-500 border border-zinc-300">
                    {col.count} products
                  </span>
                  <span className="flex items-center gap-1 text-sm font-medium text-brand-600 group-hover:gap-2 transition-all">
                    Shop now
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
