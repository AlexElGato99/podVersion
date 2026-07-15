"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  Package,
  Save,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  Tag,
  FileText,
  Star,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  Trash2,
  ImageOff,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
interface PrintfulProduct {
  id: number;
  name: string;
  thumbnail_url: string;
  best_image: string;
  starting_price: string;
}

interface PrintfulColor {
  name: string;
  hex: string;
  hex2?: string | null;
  mockupUrl?: string | null;   // design preview (only some colors)
  shirtUrl?: string | null;    // catalog blank shirt in this color (all colors)
}

interface ProductSetting {
  id: number;                    // printful product id
  custom_name?: string;
  custom_description?: string;
  specs: string[];               // bullet-point list shown on product page
  custom_mockup_url?: string;
  primary_color?: string;        // hex e.g. #ea580c
  badge?: string;                // Bestseller | New | Popular | Sale | ""
  is_featured?: boolean;
  is_hidden?: boolean;
  updated_at?: string;
}

const BADGE_OPTIONS = ["", "Bestseller", "New", "Popular", "Sale", "Limited"] as const;

const SPEC_DEFAULTS = [
  "100% ring-spun cotton — soft, breathable & pre-shrunk",
  "Direct-to-garment (DTG) print — vibrant, fade-resistant colors",
  "Unisex relaxed fit — true to size",
  "Machine wash cold inside-out, tumble dry low, no bleach",
  "Printed & fulfilled by Printful — ships within 3–5 business days",
];

/* ─── Helpers ────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page:    { padding: "24px" },
  card:    { background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "12px" },
  header:  { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" },
  input:   { width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" },
  label:   { display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  btn:     { display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none", transition: "opacity 0.15s" },
  btnPrimary: { background: "#ea580c", color: "#fff" },
  btnGhost:   { background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)" },
  tag:    { display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: 600 },
};

/* ─── Main Component ─────────────────────────────────────── */
export default function ProductsAdminPage() {
  const [products, setProducts]           = useState<PrintfulProduct[]>([]);
  const [settings, setSettings]           = useState<Record<number, ProductSetting>>({});
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState<number | null>(null);
  const [search, setSearch]               = useState("");
  const [expandedId, setExpandedId]       = useState<number | null>(null);
  const [savedIds, setSavedIds]           = useState<Set<number>>(new Set());
  const [productColors, setProductColors] = useState<Record<number, PrintfulColor[]>>({});
  const [loadingColors, setLoadingColors] = useState<Set<number>>(new Set());

  /* ── Fetch products from Printful API ── */
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/product-settings"),
      ]);
      const pData = await pRes.json();
      const sData = await sRes.json();

      setProducts(pData.products ?? []);

      // Build settings map keyed by product id
      const map: Record<number, ProductSetting> = {};
      for (const row of sData.settings ?? []) {
        map[row.id] = {
          ...row,
          specs: Array.isArray(row.specs) ? row.specs : (typeof row.specs === "string" ? JSON.parse(row.specs || "[]") : SPEC_DEFAULTS),
        };
      }
      setSettings(map);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  /* ── Load colors for a specific product from Printful variants ── */
  async function loadProductColors(productId: number) {
    if (productColors[productId] || loadingColors.has(productId)) return;
    setLoadingColors((prev) => new Set(prev).add(productId));
    try {
      const res = await fetch(`/api/product-colors?id=${productId}`);
      const data = await res.json();
      setProductColors((prev) => ({ ...prev, [productId]: data.colors ?? [] }));
    } catch {
      setProductColors((prev) => ({ ...prev, [productId]: [] }));
    } finally {
      setLoadingColors((prev) => { const n = new Set(prev); n.delete(productId); return n; });
    }
  }

  /* ── Get or create setting for a product ── */
  function getSetting(productId: number): ProductSetting {
    return settings[productId] ?? {
      id: productId,
      specs: [...SPEC_DEFAULTS],
      badge: "",
      is_featured: false,
      is_hidden: false,
    };
  }

  function updateSetting(productId: number, patch: Partial<ProductSetting>) {
    setSettings((prev) => ({
      ...prev,
      [productId]: { ...getSetting(productId), ...patch },
    }));
  }

  /* ── Save a single product's settings ── */
  async function saveSetting(productId: number) {
    setSaving(productId);
    try {
      const setting = getSetting(productId);
      await fetch("/api/product-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...setting, id: productId }),
      });
      setSavedIds((prev) => new Set(prev).add(productId));
      setTimeout(() => setSavedIds((prev) => { const n = new Set(prev); n.delete(productId); return n; }), 2500);
    } finally {
      setSaving(null);
    }
  }

  /* ── Spec bullet helpers ── */
  function addSpec(productId: number) {
    const setting = getSetting(productId);
    updateSetting(productId, { specs: [...setting.specs, ""] });
  }
  function updateSpec(productId: number, idx: number, value: string) {
    const setting = getSetting(productId);
    const next = [...setting.specs];
    next[idx] = value;
    updateSetting(productId, { specs: next });
  }
  function removeSpec(productId: number, idx: number) {
    const setting = getSetting(productId);
    updateSetting(productId, { specs: setting.specs.filter((_, i) => i !== idx) });
  }
  function resetSpecs(productId: number) {
    updateSetting(productId, { specs: [...SPEC_DEFAULTS] });
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 36, height: 36, borderRadius: "10px", background: "#ea580c22", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Package size={18} color="#ea580c" />
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Products</h1>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>Manage listings, specs, badges &amp; visibility</p>
          </div>
        </div>
        <button style={{ ...s.btn, ...s.btnGhost }} onClick={loadProducts}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "20px" }}>
        <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          style={{ ...s.input, paddingLeft: "36px" }}
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px", color: "var(--text-muted)" }}>
          <Loader2 size={22} className="animate-spin" />
          <span style={{ marginLeft: "10px" }}>Loading products from Printful…</span>
        </div>
      )}

      {/* Product list */}
      {!loading && filtered.map((product) => {
        const setting = getSetting(product.id);
        const isExpanded = expandedId === product.id;
        const isSaving = saving === product.id;
        const isSaved = savedIds.has(product.id);

        return (
          <div key={product.id} style={s.card}>
            {/* Product row header */}
            <div
              style={{ display: "flex", alignItems: "center", gap: "14px", cursor: "pointer" }}
              onClick={() => {
                const next = isExpanded ? null : product.id;
                setExpandedId(next);
                if (next) loadProductColors(next);
              }}
            >
              {/* Thumbnail */}
              <div style={{ width: 52, height: 52, borderRadius: "10px", overflow: "hidden", flexShrink: 0, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
                {product.thumbnail_url ? (
                  <Image
                    src={setting.custom_mockup_url || product.thumbnail_url}
                    alt={product.name}
                    width={52}
                    height={52}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                    unoptimized
                  />
                ) : (
                  <ImageOff size={20} color="var(--text-muted)" />
                )}
              </div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: 0, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {setting.custom_name || product.name}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>ID #{product.id}</span>
                  {product.starting_price && (
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>${parseFloat(product.starting_price).toFixed(2)}</span>
                  )}
                  {setting.badge && (
                    <span style={{ ...s.tag, background: setting.badge === "Bestseller" ? "#ea580c22" : setting.badge === "New" ? "#0d948822" : setting.badge === "Popular" ? "#3b82f622" : setting.badge === "Sale" ? "#ef444422" : "#6b728022", color: setting.badge === "Bestseller" ? "#ea580c" : setting.badge === "New" ? "#0d9488" : setting.badge === "Popular" ? "#3b82f6" : setting.badge === "Sale" ? "#ef4444" : "#6b7280" }}>
                      <Tag size={10} />
                      {setting.badge}
                    </span>
                  )}
                  {setting.is_featured && (
                    <span style={{ ...s.tag, background: "#fbbf2422", color: "#d97706" }}>
                      <Star size={10} />
                      Featured
                    </span>
                  )}
                  {setting.is_hidden && (
                    <span style={{ ...s.tag, background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
                      <EyeOff size={10} />
                      Hidden
                    </span>
                  )}
                </div>
              </div>

              {/* Expand toggle */}
              <div style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {/* Expanded edit panel */}
            {isExpanded && (
              <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>

                {/* Row 1: Name + Badge + Primary Color */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 140px", gap: "16px" }}>
                  <div>
                    <label style={s.label}>Custom Product Name</label>
                    <input
                      style={s.input}
                      placeholder={product.name}
                      value={setting.custom_name ?? ""}
                      onChange={(e) => updateSetting(product.id, { custom_name: e.target.value })}
                    />
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Leave blank to use Printful name</p>
                  </div>
                  <div>
                    <label style={s.label}>Badge</label>
                    <select
                      style={{ ...s.input }}
                      value={setting.badge ?? ""}
                      onChange={(e) => updateSetting(product.id, { badge: e.target.value })}
                    >
                      {BADGE_OPTIONS.map((b) => (
                        <option key={b} value={b}>{b || "— None —"}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Primary Color (from Printful)</label>
                    <div>
                    {loadingColors.has(product.id) ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "12px" }}>
                        <Loader2 size={13} className="animate-spin" /> Loading colors…
                      </div>
                    ) : (productColors[product.id] ?? []).length === 0 ? (
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>No colors found for this product</p>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                        {(productColors[product.id] ?? []).map((c) => {
                          const isSelected = setting.primary_color === c.hex;
                          const bg = c.hex2
                            ? `linear-gradient(135deg, ${c.hex} 50%, ${c.hex2} 50%)`
                            : c.hex;
                          return (
                            <button
                              key={c.name}
                              title={c.name}
                              onClick={() => {
                                const colorData = (productColors[product.id] ?? []).find(x => x.hex === c.hex);
                                // Use design mockup if available, otherwise use catalog shirt photo in this color
                                const imageUrl = colorData?.mockupUrl || colorData?.shirtUrl || null;
                                updateSetting(product.id, {
                                  primary_color: c.hex,
                                  ...(imageUrl ? { custom_mockup_url: imageUrl } : {}),
                                });
                              }}
                              style={{
                                width: 32, height: 32, borderRadius: "50%",
                                background: bg,
                                border: isSelected ? "3px solid #ea580c" : "2px solid var(--border)",
                                outline: isSelected ? "2px solid #ea580c44" : "none",
                                cursor: "pointer",
                                transform: isSelected ? "scale(1.2)" : "scale(1)",
                                transition: "all 0.15s",
                                flexShrink: 0,
                              }}
                              aria-label={c.name}
                              aria-pressed={isSelected}
                            ></button>
                          );
                        })}
                      </div>
                    )}
                    </div>
                    {setting.primary_color && (() => {
                      const sel = (productColors[product.id] ?? []).find(c => c.hex === setting.primary_color);
                      const previewImg = setting.custom_mockup_url || sel?.mockupUrl || sel?.shirtUrl;
                      return (
                        <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "12px" }}>
                          {previewImg && (
                            <Image
                              src={previewImg}
                              alt={sel?.name ?? ""}
                              width={56}
                              height={56}
                              style={{ borderRadius: "8px", objectFit: "cover", border: "1px solid var(--border)" }}
                              unoptimized
                            />
                          )}
                          <p style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: setting.primary_color, border: "1px solid var(--border)" }} />
                            {sel?.name ?? setting.primary_color}
                            {previewImg ? " — image ready" : " — no image available for this color"}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Row 2: Custom Mockup URL */}
                <div>
                  <label style={s.label}>Custom Mockup Image URL</label>
                  <input
                    style={s.input}
                    placeholder="https://... (overrides Printful thumbnail)"
                    value={setting.custom_mockup_url ?? ""}
                    onChange={(e) => updateSetting(product.id, { custom_mockup_url: e.target.value })}
                  />
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Paste a direct image URL to use instead of the Printful mockup</p>
                </div>

                {/* Row 3: Description */}
                <div>
                  <label style={s.label}>
                    <FileText size={11} style={{ display: "inline", marginRight: "4px" }} />
                    Product Description
                  </label>
                  <textarea
                    style={{ ...s.input, minHeight: "90px", resize: "vertical" }}
                    placeholder="Write a custom product description for SEO and the product page…"
                    value={setting.custom_description ?? ""}
                    onChange={(e) => updateSetting(product.id, { custom_description: e.target.value })}
                  />
                </div>

                {/* Row 4: Spec Bullets */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <label style={{ ...s.label, marginBottom: 0 }}>Spec Bullet Points (shown on product page)</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button style={{ ...s.btn, ...s.btnGhost, padding: "5px 10px", fontSize: "12px" }} onClick={() => resetSpecs(product.id)}>
                        <RefreshCw size={12} />
                        Reset defaults
                      </button>
                      <button style={{ ...s.btn, ...s.btnPrimary, padding: "5px 10px", fontSize: "12px" }} onClick={() => addSpec(product.id)}>
                        <Plus size={12} />
                        Add bullet
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {setting.specs.map((spec, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "#0d9488", fontSize: "16px", flexShrink: 0 }}>✓</span>
                        <input
                          style={{ ...s.input, flex: 1 }}
                          value={spec}
                          placeholder={`Spec bullet ${idx + 1}…`}
                          onChange={(e) => updateSpec(product.id, idx, e.target.value)}
                        />
                        <button
                          style={{ ...s.btn, ...s.btnGhost, padding: "6px 8px", color: "#ef4444", border: "1px solid #ef444433" }}
                          onClick={() => removeSpec(product.id, idx)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Row 5: Toggles */}
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                  {[
                    { key: "is_featured", icon: Star, label: "Featured on Homepage", color: "#d97706" },
                    { key: "is_hidden",   icon: EyeOff, label: "Hide from Store", color: "#6b7280" },
                  ].map(({ key, icon: Icon, label, color }) => {
                    const val = !!setting[key as keyof ProductSetting];
                    return (
                      <button
                        key={key}
                        style={{ ...s.btn, background: val ? color + "18" : "var(--bg-tertiary)", color: val ? color : "var(--text-secondary)", border: `1px solid ${val ? color + "44" : "var(--border)"}` }}
                        onClick={() => updateSetting(product.id, { [key]: !val })}
                      >
                        <Icon size={13} />
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Save button */}
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                  <button
                    style={{ ...s.btn, ...(isSaved ? { background: "#0d9488", color: "#fff" } : s.btnPrimary), minWidth: "120px", justifyContent: "center" }}
                    onClick={() => saveSetting(product.id)}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {isSaved ? "Saved!" : isSaving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
          <Package size={32} style={{ margin: "0 auto 12px" }} />
          <p>No products found</p>
        </div>
      )}
    </div>
  );
}
