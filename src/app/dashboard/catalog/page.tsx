"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Grid3X3, Search, Loader2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

interface CatalogProduct {
  id: number;
  name: string;
  image: string;
  type: string;
  type_name?: string;
  main_category_id?: number;
  variant_count?: number;
}

const CATEGORIES = [
  { key: "",           label: "All" },
  { key: "t-shirt",    label: "T-Shirts" },
  { key: "hoodie",     label: "Hoodies" },
  { key: "sweatshirt", label: "Sweatshirts" },
  { key: "long sleeve",label: "Long Sleeve" },
  { key: "tank",       label: "Tank Tops" },
  { key: "polo",       label: "Polo" },
  { key: "mug",        label: "Mugs" },
  { key: "tumbler",    label: "Tumblers" },
  { key: "poster",     label: "Posters" },
  { key: "canvas",     label: "Canvas" },
  { key: "hat",        label: "Hats & Caps" },
  { key: "beanie",     label: "Beanies" },
  { key: "sticker",    label: "Stickers" },
  { key: "tote",       label: "Tote Bags" },
  { key: "backpack",   label: "Backpacks" },
  { key: "phone",      label: "Phone Cases" },
  { key: "pillow",     label: "Pillows" },
  { key: "blanket",    label: "Blankets" },
  { key: "legging",    label: "Leggings" },
  { key: "sock",       label: "Socks" },
  { key: "kid",        label: "Kids & Baby" },
  { key: "apron",      label: "Aprons" },
  { key: "notebook",   label: "Notebooks" },
];

const PAGE_SIZE = 30;

const s: Record<string, React.CSSProperties> = {
  page:  { padding: "24px" },
  input: { padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" },
  btn:   { display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "none" },
};

export default function CatalogPage() {
  const [allProducts, setAllProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [category, setCategory]       = useState("");
  const [offset, setOffset]           = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/catalog");
      const data = await res.json();
      setAllProducts(data.products ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Client-side filter + paginate
  const filtered = allProducts.filter((p) => {
    const text = (p.name + " " + (p.type_name ?? "") + " " + (p.type ?? "")).toLowerCase();
    const matchesCat    = !category || text.includes(category);
    const matchesSearch = !search   || text.includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const paginated   = filtered.slice(offset, offset + PAGE_SIZE);

  function changeCategory(key: string) {
    setCategory(key);
    setOffset(0);
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 36, height: 36, borderRadius: "10px", background: "#6366f120", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Grid3X3 size={18} color="#6366f1" />
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Printful Catalog</h1>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
              {loading ? "Loading all printable products…" : `${allProducts.length} printable products available`}
            </p>
          </div>
        </div>
        <button style={{ ...s.btn, background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", padding: "7px 12px" }} onClick={load}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "16px" }}>
        <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          style={{ ...s.input, paddingLeft: "36px", width: "100%" }}
          placeholder="Search by product name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
        />
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "20px" }}>
        {CATEGORIES.map((cat) => {
          const count = cat.key
            ? allProducts.filter((p) => (p.name + " " + (p.type_name ?? "")).toLowerCase().includes(cat.key)).length
            : allProducts.length;
          const active = category === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => changeCategory(cat.key)}
              style={{
                ...s.btn,
                background: active ? "#6366f1" : "var(--bg-secondary)",
                color: active ? "#fff" : "var(--text-secondary)",
                border: `1px solid ${active ? "#6366f1" : "var(--border)"}`,
              }}
            >
              {cat.label}
              {!loading && <span style={{ fontSize: "10px", opacity: 0.75, marginLeft: 2 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px", color: "var(--text-muted)", gap: "14px" }}>
          <Loader2 size={28} className="animate-spin" />
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Fetching all Printful products…</p>
            <p style={{ margin: "4px 0 0", fontSize: "12px" }}>This may take a moment — we paginate through the full catalog</p>
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
            Showing {paginated.length} of {filtered.length} products
            {category ? ` in "${CATEGORIES.find(c => c.key === category)?.label}"` : ""}
            {search ? ` matching "${search}"` : ""}
            {" "}· Page {currentPage}/{totalPages}
          </p>

          {paginated.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
              <Grid3X3 size={28} style={{ margin: "0 auto 12px" }} />
              <p>No products match your filters.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: "14px" }}>
              {paginated.map((p) => (
                <div key={p.id} style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
                  <div style={{ position: "relative", aspectRatio: "1", background: "#f5f5f5" }}>
                    <Image src={p.image} alt={p.name} fill style={{ objectFit: "cover" }} unoptimized />
                    <span style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                      ID {p.id}
                    </span>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: "0 0 3px", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.name}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
                      {p.type_name ?? p.type}
                      {p.variant_count ? ` · ${p.variant_count} variants` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "28px" }}>
              <button
                style={{ ...s.btn, background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", padding: "8px 16px" }}
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                <ChevronLeft size={14} /> Prev
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i : Math.max(0, Math.min(currentPage - 4, totalPages - 7)) + i;
                const pg = p + 1;
                return (
                  <button
                    key={pg}
                    onClick={() => setOffset(p * PAGE_SIZE)}
                    style={{ ...s.btn, padding: "7px 11px", background: currentPage === pg ? "#6366f1" : "var(--bg-secondary)", color: currentPage === pg ? "#fff" : "var(--text-secondary)", border: `1px solid ${currentPage === pg ? "#6366f1" : "var(--border)"}` }}
                  >
                    {pg}
                  </button>
                );
              })}

              <button
                style={{ ...s.btn, background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", padding: "8px 16px" }}
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
