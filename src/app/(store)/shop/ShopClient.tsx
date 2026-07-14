"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, Search, Grid3X3, LayoutList, X } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";

interface Product {
  id: number;
  name: string;
  thumbnail_url: string;
  starting_price: string | null;
  best_image: string;
}

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Name A–Z", value: "name_asc" },
];

// Derive a simple category from the product name
function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("hoodie") || n.includes("sweatshirt")) return "Hoodies";
  if (n.includes("t-shirt") || n.includes("tee") || n.includes("shirt")) return "T-Shirts";
  if (n.includes("mug") || n.includes("cup")) return "Mugs";
  if (n.includes("poster") || n.includes("print") || n.includes("art")) return "Posters";
  if (n.includes("hat") || n.includes("cap") || n.includes("beanie")) return "Hats";
  if (n.includes("bag") || n.includes("tote") || n.includes("backpack")) return "Bags";
  if (n.includes("sticker")) return "Stickers";
  if (n.includes("phone") || n.includes("case")) return "Phone Cases";
  return "Other";
}

export default function ShopClient({ products, categoryOptions = [] }: { products: Product[]; categoryOptions?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Read filters from URL
  const query     = searchParams.get("q") ?? "";
  const category  = searchParams.get("category") ?? "";
  const sort      = searchParams.get("sort") ?? "newest";
  const minPrice  = Number(searchParams.get("min") ?? 0);
  const maxPrice  = Number(searchParams.get("max") ?? 9999);

  // Derive unique categories — prefer admin-configured list, fall back to inference from products
  const categories = useMemo(() => {
    if (categoryOptions.length > 0) return ["All", ...categoryOptions];
    const set = new Set(products.map((p) => inferCategory(p.name)));
    return ["All", ...Array.from(set).sort()];
  }, [products, categoryOptions]);

  // Update a single URL param without losing others
  const setParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "" || value === "0" || value === "9999") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const clearAll = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...products];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    if (category && category !== "All") {
      list = list.filter((p) => inferCategory(p.name) === category);
    }

    if (minPrice > 0 || maxPrice < 9999) {
      list = list.filter((p) => {
        const price = p.starting_price ? parseFloat(p.starting_price) : 0;
        return price >= minPrice && price <= maxPrice;
      });
    }

    switch (sort) {
      case "price_asc":
        list.sort((a, b) => parseFloat(a.starting_price ?? "0") - parseFloat(b.starting_price ?? "0"));
        break;
      case "price_desc":
        list.sort((a, b) => parseFloat(b.starting_price ?? "0") - parseFloat(a.starting_price ?? "0"));
        break;
      case "name_asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // newest = original order from Printful (most recently added first)
        break;
    }

    return list;
  }, [products, query, category, sort, minPrice, maxPrice]);

  const hasActiveFilters = query || (category && category !== "All") || minPrice > 0 || maxPrice < 9999;

  const gridClass = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4",
  }[gridCols];

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Mobile filter toggle */}
      <div className="lg:hidden flex items-center justify-between mb-2">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:border-zinc-400 transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-brand-600" />}
        </button>
        <p className="text-sm text-zinc-500">{filtered.length} products</p>
      </div>

      {/* Sidebar */}
      <aside className={`w-full lg:w-60 shrink-0 ${sidebarOpen ? "block" : "hidden lg:block"}`}>
        <div className="sticky top-24 rounded-2xl border border-zinc-200 bg-white p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-brand-600" />
              <span className="font-semibold text-zinc-900 text-sm">Filters</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearAll}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>

          {/* Search */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setParam("q", e.target.value)}
                placeholder="Search products..."
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition"
              />
              {query && (
                <button onClick={() => setParam("q", "")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
                </button>
              )}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Category</label>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setParam("category", cat === "All" ? "" : cat)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    (category || "All") === cat
                      ? "bg-brand-50 text-brand-700 font-medium"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Price Range</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={minPrice || ""}
                onChange={(e) => setParam("min", e.target.value || "0")}
                placeholder="Min"
                className="w-full px-3 py-2 text-sm text-center rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition"
              />
              <span className="text-zinc-400 text-sm">–</span>
              <input
                type="number"
                min={0}
                value={maxPrice < 9999 ? maxPrice : ""}
                onChange={(e) => setParam("max", e.target.value || "9999")}
                placeholder="Max"
                className="w-full px-3 py-2 text-sm text-center rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition"
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-zinc-500 hidden lg:block">
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
            {hasActiveFilters && " found"}
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <select
              value={sort}
              onChange={(e) => setParam("sort", e.target.value)}
              className="px-3 py-1.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="hidden sm:flex items-center gap-1 border border-zinc-200 rounded-xl p-1">
              {([2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setGridCols(n)}
                  className={`p-1.5 rounded-lg transition-colors ${gridCols === n ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-600"}`}
                >
                  {n === 2 ? <LayoutList className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {query && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium border border-brand-200">
                Search: {query}
                <button onClick={() => setParam("q", "")}><X className="h-3 w-3" /></button>
              </span>
            )}
            {category && category !== "All" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium border border-brand-200">
                {category}
                <button onClick={() => setParam("category", "")}><X className="h-3 w-3" /></button>
              </span>
            )}
            {(minPrice > 0 || maxPrice < 9999) && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium border border-brand-200">
                ${minPrice} – {maxPrice < 9999 ? `$${maxPrice}` : "∞"}
                <button onClick={() => { setParam("min", "0"); setParam("max", "9999"); }}><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className={`grid gap-4 ${gridClass}`}>
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.starting_price ? parseFloat(product.starting_price) : 0}
                imageUrl={product.best_image || product.thumbnail_url}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-700 mb-2">No products found</h3>
            <p className="text-sm text-zinc-500 mb-4">Try adjusting your filters or search term.</p>
            <button
              onClick={clearAll}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
