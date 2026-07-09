import { Suspense } from "react";
import { SlidersHorizontal, Search, Grid3X3, List } from "lucide-react";
import { getProducts } from "@/lib/printful";
import ProductCard from "@/components/ui/ProductCard";

export const metadata = {
  title: "Shop",
  description: "Browse our full catalog of premium print-on-demand products.",
};

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Popular", value: "popular" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
];

async function ProductGrid() {
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    products = await getProducts();
  } catch {
    // fallback to empty
  }

  if (products.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
          <Search className="h-8 w-8 text-zinc-600" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-300 mb-2">No products found</h3>
        <p className="text-sm text-zinc-500">
          Connect your Printful API key to see your products here.
        </p>
      </div>
    );
  }

  return (
    <>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          name={product.name}
          price={0}
          imageUrl={product.thumbnail_url}
        />
      ))}
    </>
  );
}

export default function ShopPage() {
  return (
    <div className="pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="py-10">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-100">
            All Products
          </h1>
          <p className="mt-2 text-zinc-500">
            Discover our full collection of premium print-on-demand products.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar filters */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="card p-5 sticky top-24">
              <div className="flex items-center gap-2 mb-5">
                <SlidersHorizontal className="h-4 w-4 text-brand-400" />
                <h2 className="font-semibold text-zinc-100">Filters</h2>
              </div>

              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      className="input pl-9"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-3">
                    Category
                  </label>
                  <div className="space-y-2">
                    {["All", "T-Shirts", "Hoodies", "Mugs", "Posters", "Hats", "Accessories"].map(
                      (cat) => (
                        <label
                          key={cat}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 accent-brand-500"
                          />
                          <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
                            {cat}
                          </span>
                        </label>
                      )
                    )}
                  </div>
                </div>

                {/* Price range */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-3">
                    Price Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="input text-center"
                    />
                    <span className="text-zinc-600">–</span>
                    <input
                      type="number"
                      placeholder="Max"
                      className="input text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-zinc-500">Showing all products</p>
              <div className="flex items-center gap-3">
                <select className="input w-auto text-sm py-1.5">
                  {sortOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <button className="btn-ghost p-2">
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button className="btn-ghost p-2">
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              <Suspense
                fallback={Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="card aspect-square animate-pulse bg-zinc-800/40"
                  />
                ))}
              >
                <ProductGrid />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
