"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Grid3X3, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface CatalogProduct {
  id: number;
  name: string;
  image: string;
  type: string;
  main_category_id?: number;
  variant_count?: number;
}

const CATEGORIES = [
  { id: "", label: "All Products", keywords: [] as string[] },
  { id: "tshirts",  label: "T-Shirts",           keywords: ["t-shirt", " tee", "unisex shirt"] },
  { id: "hoodies",  label: "Hoodies & Sweatshirts", keywords: ["hoodie", "sweatshirt", "crewneck", "pullover"] },
  { id: "mugs",     label: "Mugs",               keywords: ["mug"] },
  { id: "posters",  label: "Posters & Prints",   keywords: ["poster", "art print", "canvas", "wall art"] },
  { id: "hats",     label: "Hats & Caps",        keywords: ["hat", " cap", "beanie", "snapback"] },
  { id: "stickers", label: "Stickers",            keywords: ["sticker"] },
  { id: "bags",     label: "Bags",               keywords: ["tote", "bag", "backpack"] },
  { id: "phone",    label: "Phone Cases",        keywords: ["phone", "case", "iphone"] },
];

const LIMIT = 100; // fetch more so client-side filtering has full data

const s: Record<string, React.CSSProperties> = {
  page:  { padding: "24px" },
  input: { padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" },
  btn:   { display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none" },
};

export default function CatalogPage() {
  const [allProducts, setAllProducts]   = useState<CatalogProduct[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [categoryId, setCategoryId]     = useState("");
  const [offset, setOffset]             = useState(0);

  // Load all products once
  const load = useCallback(async () => {
    setLoading(true);
    // Fetch multiple pages to get a broad set of products
    const res  = await fetch(`/api/catalog?limit=${LIMIT}&offset=0`);
    const data = await res.json();
    setAllProducts(data.products ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Client-side filtering
  const activeCat = CATEGORIES.find((c) => c.id === categoryId);
  const filtered = allProducts.filter((p) => {
    const nameLower = p.name.toLowerCase();
    const matchesCat =
      !activeCat?.keywords.length ||
      activeCat.keywords.some((kw) => nameLower.includes(kw));
    const matchesSearch = !search || nameLower.includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const PAGE_SIZE = 24;
  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const paginated   = filtered.slice(offset, offset + PAGE_SIZE);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
        <div style={{ width: 36, height: 36, borderRadius: "10px", background: "#6366f120", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Grid3X3 size={18} color="#6366f1" />
        </div>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Printful Catalog</h1>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>Browse all available blank products</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "0 0 260px" }}>
          <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input style={{ ...s.input, paddingLeft: "36px", width: "100%" }} placeholder="Search products…" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} />
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategoryId(cat.id); setOffset(0); }}
              style={{ ...s.btn, padding: "5px 12px", fontSize: "12px", background: categoryId === cat.id ? "#6366f1" : "var(--bg-secondary)", color: categoryId === cat.id ? "#fff" : "var(--text-secondary)", border: `1px solid ${categoryId === cat.id ? "#6366f1" : "var(--border)"}` }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px", color: "var(--text-muted)" }}>
          <Loader2 size={22} className="animate-spin" /><span style={{ marginLeft: 10 }}>Loading catalog…</span>
        </div>
      ) : (
        <>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>{filtered.length} products{activeCat?.id ? ` in "${activeCat.label}"` : ""}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
            {paginated.map((p) => (
              <div key={p.id} style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ position: "relative", aspectRatio: "1", background: "#f5f5f5" }}>
                  <Image src={p.image} alt={p.name} fill style={{ objectFit: "cover" }} unoptimized />
                  <span style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                    ID: {p.id}
                  </span>
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: "0 0 3px", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.name}</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>{p.type}{p.variant_count ? ` · ${p.variant_count} variants` : ""}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "24px" }}>
              <button
                style={{ ...s.btn, background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Page {currentPage} of {totalPages}</span>
              <button
                style={{ ...s.btn, background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                disabled={offset + PAGE_SIZE >= filtered.length}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
