"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  Package, Loader2, RefreshCcw, Search, X, Check, Pencil,
  Eye, EyeOff, Star, ChevronDown, AlertTriangle, Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────── */
interface StoreProduct {
  id: string | number;
  name: string;
  thumbnail_url: string;
  best_image: string;
  starting_price: string | null;
  variants: number;
  catalog_type_name: string | null;
  _source: "printful" | "printify";
  all_images?: Array<{ src: string; variant_ids: number[] }>;
  // colors from variants (for Printify) 
  colors?: string[];
}

interface ProductOverride {
  product_id: string;
  source: "printful" | "printify";
  custom_title: string | null;
  featured_image: string | null;
  featured_color: string | null;
  is_hidden: boolean;
}

/* ─── Sub-components ─────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--card-shadow)" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}1a`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        <Icon size={16} strokeWidth={1.75} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Product Edit Modal ─────────────────────────────────── */
function EditModal({
  product,
  override,
  onSave,
  onClose,
}: {
  product: StoreProduct;
  override: ProductOverride | null;
  onSave: (data: Partial<ProductOverride>) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(override?.custom_title ?? "");
  const [featuredImage, setFeaturedImage] = useState(override?.featured_image ?? product.best_image ?? product.thumbnail_url ?? "");
  const [featuredColor, setFeaturedColor] = useState(override?.featured_color ?? "");
  const [isHidden, setIsHidden] = useState(override?.is_hidden ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build image list from product
  const images: string[] = useMemo(() => {
    if (product.all_images && product.all_images.length > 0) {
      return [...new Set(product.all_images.map((i) => i.src))];
    }
    const imgs = new Set<string>();
    if (product.best_image) imgs.add(product.best_image);
    if (product.thumbnail_url) imgs.add(product.thumbnail_url);
    return [...imgs];
  }, [product]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        custom_title: title.trim() || null,
        featured_image: featuredImage || null,
        featured_color: featuredColor.trim() || null,
        is_hidden: isHidden,
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 16, border: "1px solid var(--border)", width: "100%", maxWidth: 640, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Edit Product</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>{product.name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Custom Title */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Custom Title <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(leave blank to use original)</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={product.name}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Featured Color */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Featured Color <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(auto-selected on product page)</span>
            </label>
            {product.colors && product.colors.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  onClick={() => setFeaturedColor("")}
                  style={{ padding: "5px 12px", borderRadius: 20, border: `2px solid ${!featuredColor ? "#ea580c" : "var(--border)"}`, background: !featuredColor ? "#fff7ed" : "var(--bg-secondary)", color: !featuredColor ? "#ea580c" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Default
                </button>
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFeaturedColor(c)}
                    style={{ padding: "5px 12px", borderRadius: 20, border: `2px solid ${featuredColor === c ? "#ea580c" : "var(--border)"}`, background: featuredColor === c ? "#fff7ed" : "var(--bg-secondary)", color: featuredColor === c ? "#ea580c" : "var(--text-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            ) : (
              <input
                value={featuredColor}
                onChange={(e) => setFeaturedColor(e.target.value)}
                placeholder="e.g. Black, Navy, White"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            )}
          </div>

          {/* Featured / Main Mockup */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>
              Featured Mockup <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(shown on homepage cards & product page hero)</span>
            </label>
            {images.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13 }}>
                <ImageIcon size={14} /> No images available
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {images.map((src, i) => {
                  const isSelected = featuredImage === src;
                  return (
                    <button
                      key={i}
                      onClick={() => setFeaturedImage(src)}
                      title={`Select mockup ${i + 1}`}
                      style={{ position: "relative", width: 88, height: 88, borderRadius: 10, overflow: "hidden", border: `3px solid ${isSelected ? "#ea580c" : "var(--border)"}`, cursor: "pointer", background: "var(--bg-secondary)", padding: 0, flexShrink: 0, transition: "border-color 0.15s" }}
                    >
                      <Image src={src} alt={`Mockup ${i + 1}`} fill style={{ objectFit: "cover" }} unoptimized sizes="88px" />
                      {isSelected && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(234,88,12,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ background: "#ea580c", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Check size={13} color="#fff" strokeWidth={3} />
                          </div>
                        </div>
                      )}
                      {i === 0 && !isSelected && (
                        <div style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(0,0,0,0.55)", borderRadius: 4, padding: "1px 5px", fontSize: 9, color: "#fff", fontWeight: 600 }}>
                          Default
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Visibility */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Hide from store</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Product won&apos;t appear on homepage or shop page</div>
            </div>
            <button
              onClick={() => setIsHidden(!isHidden)}
              style={{ width: 42, height: 24, borderRadius: 12, border: "none", background: isHidden ? "#ea580c" : "var(--border)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
            >
              <span style={{ position: "absolute", top: 3, left: isHidden ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </button>
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px" }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 8, border: "none", background: saving ? "var(--text-muted)" : "#ea580c", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer" }}
            >
              {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

export default function ProductsPage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [overrides, setOverrides] = useState<Map<string, ProductOverride>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "printful" | "printify">("all");
  const [editTarget, setEditTarget] = useState<StoreProduct | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMsg = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const loadOverrides = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/product-overrides");
      const json = await res.json();
      if (res.ok) {
        const map = new Map<string, ProductOverride>();
        for (const o of json.overrides ?? []) map.set(o.product_id, o);
        setOverrides(map);
      }
    } catch {
      // non-fatal
    }
  }, []);

  const loadProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/products");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load products");

      // api/products returns an array of CommonProduct
      const raw: StoreProduct[] = (json.products ?? json ?? []).map((p: StoreProduct) => ({
        ...p,
        id: String(p.id),
      }));

      setProducts(raw);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadProducts(), loadOverrides()]);
  }, [loadProducts, loadOverrides]);

  const handleSave = useCallback(async (product: StoreProduct, data: Partial<ProductOverride>) => {
    const res = await fetch("/api/admin/product-overrides", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: String(product.id),
        source: product._source,
        ...data,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to save");
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(String(product.id), json.override);
      return next;
    });
    showMsg("success", `"${product.name}" updated successfully.`);
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const override = overrides.get(String(p.id));
      const title = override?.custom_title ?? p.name;
      const matchesSearch = !search || title.toLowerCase().includes(search.toLowerCase());
      const matchesSource = sourceFilter === "all" || p._source === sourceFilter;
      return matchesSearch && matchesSource;
    });
  }, [products, overrides, search, sourceFilter]);

  const stats = useMemo(() => ({
    total: products.length,
    printful: products.filter((p) => p._source === "printful").length,
    printify: products.filter((p) => p._source === "printify").length,
    hidden: [...overrides.values()].filter((o) => o.is_hidden).length,
    customized: [...overrides.values()].filter((o) => o.custom_title || o.featured_image || o.featured_color).length,
  }), [products, overrides]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Products</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Manage titles, featured mockups, and colors for your store products.
          </p>
        </div>
        <button
          onClick={() => loadProducts(true)}
          disabled={refreshing}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: refreshing ? "wait" : "pointer" }}
        >
          <RefreshCcw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        <StatCard icon={Package} label="Total Products" value={stats.total} color="#ea580c" />
        <StatCard icon={Package} label="Printful" value={stats.printful} color="#6366f1" />
        <StatCard icon={Package} label="Printify" value={stats.printify} color="#0d9488" />
        <StatCard icon={EyeOff} label="Hidden" value={stats.hidden} color="#94a3b8" />
        <StatCard icon={Star} label="Customized" value={stats.customized} color="#f59e0b" />
      </div>

      {/* Filters */}
      <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", boxShadow: "var(--card-shadow)" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            style={{ width: "100%", paddingLeft: 32, paddingRight: search ? 32 : 12, paddingTop: 8, paddingBottom: 8, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}>
              <X size={13} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "printful", "printify"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${sourceFilter === s ? "#ea580c" : "var(--border)"}`, background: sourceFilter === s ? "#fff7ed" : "var(--bg-secondary)", color: sourceFilter === s ? "#ea580c" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, background: msg.type === "success" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msg.type === "success" ? "#bbf7d0" : "#fecaca"}`, color: msg.type === "success" ? "#16a34a" : "#dc2626" }}>
          {msg.type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
          {msg.text}
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 10, color: "var(--text-muted)" }}>
          <Loader2 size={20} className="animate-spin" /> Loading products…
        </div>
      ) : error ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13 }}>
          <AlertTriangle size={14} /> {error}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)", fontSize: 14 }}>
          {search ? "No products match your search." : "No products found. Make sure your POD provider is connected in Settings."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {filtered.map((product) => {
            const override = overrides.get(String(product.id));
            const displayTitle = override?.custom_title ?? product.name;
            const displayImage = override?.featured_image ?? product.best_image ?? product.thumbnail_url;
            const isHidden = override?.is_hidden ?? false;
            const isCustomized = !!(override?.custom_title || override?.featured_image || override?.featured_color);

            return (
              <div
                key={String(product.id)}
                style={{ background: "var(--bg-primary)", border: `1px solid ${isHidden ? "var(--border)" : "var(--border)"}`, borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-shadow)", opacity: isHidden ? 0.55 : 1, transition: "opacity 0.2s", display: "flex", flexDirection: "column" }}
              >
                {/* Image */}
                <div style={{ position: "relative", aspectRatio: "1", background: "var(--bg-tertiary)" }}>
                  {displayImage ? (
                    <Image
                      src={displayImage}
                      alt={displayTitle}
                      fill
                      style={{ objectFit: "cover" }}
                      unoptimized
                      sizes="260px"
                    />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                      <ImageIcon size={32} />
                    </div>
                  )}
                  {/* Badges */}
                  <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4 }}>
                    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: product._source === "printify" ? "#0d9488" : "#6366f1", color: "#fff", textTransform: "uppercase" }}>
                      {product._source}
                    </span>
                    {isCustomized && (
                      <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "#f59e0b", color: "#fff" }}>
                        Edited
                      </span>
                    )}
                    {isHidden && (
                      <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "#64748b", color: "#fff" }}>
                        Hidden
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {displayTitle}
                    {override?.custom_title && (
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400, marginLeft: 6 }}>(custom)</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {product.catalog_type_name && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{product.catalog_type_name}</span>
                    )}
                    {product.starting_price && (
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>from ${product.starting_price}</span>
                    )}
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{product.variants} variants</span>
                  </div>
                  {override?.featured_color && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Featured color: <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{override.featured_color}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ marginTop: "auto", paddingTop: 10, display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setEditTarget(product)}
                      style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: "none", background: "#ea580c", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await handleSave(product, { ...override, is_hidden: !isHidden });
                        } catch {
                          showMsg("error", "Failed to update visibility");
                        }
                      }}
                      title={isHidden ? "Show product" : "Hide product"}
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}
                    >
                      {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <EditModal
          product={editTarget}
          override={overrides.get(String(editTarget.id)) ?? null}
          onSave={(data) => handleSave(editTarget, data)}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
