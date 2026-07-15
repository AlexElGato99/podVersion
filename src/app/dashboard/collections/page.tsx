"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  FolderOpen, Plus, Trash2, Search, Loader2, Save,
  ChevronDown, ChevronUp, Check, RefreshCw, X, PackageCheck,
  Palette, Settings2, AlertCircle,
} from "lucide-react";

interface CatalogProduct {
  id: number;
  name: string;
  image: string;
  type: string;
}

interface VariantColor {
  color: string;
  color_code: string;
  color_code2?: string;
  image?: string;
  sizes: { id: number; size: string; in_stock: boolean }[];
}

interface CollectionProduct {
  catalog_product_id: number;
  catalog_product_name: string;
  catalog_product_image?: string;
  placement?: string;
  default_price?: string;
  is_enabled?: boolean;
  selected_variant_ids?: number[];
}

interface Collection {
  id?: string;
  name: string;
  description?: string;
  collection_products?: CollectionProduct[];
}

const s: Record<string, React.CSSProperties> = {
  page:  { padding: "24px" },
  card:  { background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "12px" },
  input: { width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" },
  label: { display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  btn:   { display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none" },
};

function VariantPicker({
  product,
  onSave,
  onClose,
}: {
  product: CollectionProduct;
  onSave: (ids: number[], placement: string, price: string) => void;
  onClose: () => void;
}) {
  const [colors, setColors]             = useState<VariantColor[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [selectedIds, setSelectedIds]   = useState<Set<number>>(new Set(product.selected_variant_ids ?? []));
  const [activeColor, setActiveColor]   = useState<string | null>(null);
  const [placement, setPlacement]       = useState(product.placement ?? "front");
  const [price, setPrice]               = useState(product.default_price ?? "24.99");

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`/api/catalog/variants?product_id=${product.catalog_product_id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setColors(data.colors ?? []);
        if ((product.selected_variant_ids ?? []).length === 0) {
          const allInStock = (data.colors as VariantColor[]).flatMap((c) => c.sizes.filter((sv) => sv.in_stock).map((sv) => sv.id));
          setSelectedIds(new Set(allInStock));
        }
        setActiveColor(data.colors?.[0]?.color ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load variants");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleColor(c: VariantColor) {
    const ids = c.sizes.map((sv) => sv.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) { ids.forEach((id) => next.delete(id)); }
      else { ids.forEach((id) => next.add(id)); }
      return next;
    });
  }

  function toggleSize(id: number) {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  const activeColorData = colors.find((c) => c.color === activeColor);
  const totalSelected   = selectedIds.size;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ background: "var(--bg-primary)", borderRadius: "16px", width: "100%", maxWidth: "820px", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Palette size={18} color="#0d9488" />
            <div>
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>{product.catalog_product_name}</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Select colors, sizes, placement and price</p>
            </div>
          </div>
          <button style={{ ...s.btn, padding: "5px 8px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }} onClick={onClose}><X size={14} /></button>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px", color: "var(--text-muted)" }}>
            <Loader2 size={20} className="animate-spin" /><span style={{ marginLeft: 10 }}>Loading variants from Printful…</span>
          </div>
        ) : error ? (
          <div style={{ padding: "24px", color: "#ef4444", display: "flex", gap: 8, alignItems: "center" }}><AlertCircle size={16} />{error}</div>
        ) : (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Settings row */}
            <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={{ ...s.label, margin: 0 }}>Placement</label>
                <select value={placement} onChange={(e) => setPlacement(e.target.value)} style={{ ...s.input, width: 140, padding: "6px 10px" }}>
                  <option value="front">Front</option>
                  <option value="back">Back</option>
                  <option value="left">Left sleeve</option>
                  <option value="right">Right sleeve</option>
                  <option value="label_outside">Outside label</option>
                  <option value="default">Default</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={{ ...s.label, margin: 0 }}>Price ($)</label>
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} style={{ ...s.input, width: 100, padding: "6px 10px" }} />
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{totalSelected} variants selected</span>
                <button style={{ ...s.btn, padding: "4px 10px", fontSize: "11px", background: "#0d948810", color: "#0d9488", border: "1px solid #0d948830" }} onClick={() => setSelectedIds(new Set(colors.flatMap((c) => c.sizes.map((sv) => sv.id))))}>All</button>
                <button style={{ ...s.btn, padding: "4px 10px", fontSize: "11px", background: "var(--bg-tertiary)", color: "var(--text-muted)", border: "1px solid var(--border)" }} onClick={() => setSelectedIds(new Set())}>None</button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
              {/* Color list */}
              <div style={{ width: 220, borderRight: "1px solid var(--border)", overflowY: "auto", padding: "10px" }}>
                {colors.map((c) => {
                  const allSel  = c.sizes.every((sv) => selectedIds.has(sv.id));
                  const someSel = c.sizes.some((sv) => selectedIds.has(sv.id));
                  const isAct   = activeColor === c.color;
                  return (
                    <div key={c.color} onClick={() => setActiveColor(c.color)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 10px", borderRadius: "8px", cursor: "pointer", marginBottom: "2px", background: isAct ? "var(--bg-secondary)" : "transparent", border: `1px solid ${isAct ? "var(--border)" : "transparent"}` }}>
                      <div style={{ position: "relative", width: 22, height: 22, borderRadius: "50%", border: "2px solid var(--border)", flexShrink: 0, overflow: "hidden" }}>
                        <div style={{ position: "absolute", inset: 0, background: c.color_code }} />
                        {c.color_code2 && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", background: c.color_code2 }} />}
                      </div>
                      <span style={{ flex: 1, fontSize: "12px", color: "var(--text-primary)", fontWeight: isAct ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.color}</span>
                      <div
                        style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${allSel ? "#0d9488" : someSel ? "#0d948870" : "var(--border)"}`, background: allSel ? "#0d9488" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClick={(e) => { e.stopPropagation(); toggleColor(c); }}
                      >
                        {allSel && <Check size={8} color="#fff" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sizes for active color */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                {activeColorData ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                      <div style={{ position: "relative", width: 40, height: 40, borderRadius: "50%", border: "2px solid var(--border)", overflow: "hidden", flexShrink: 0 }}>
                        <div style={{ position: "absolute", inset: 0, background: activeColorData.color_code }} />
                        {activeColorData.color_code2 && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", background: activeColorData.color_code2 }} />}
                      </div>
                      {activeColorData.image && <Image src={activeColorData.image} alt={activeColorData.color} width={60} height={60} style={{ borderRadius: "8px", objectFit: "cover" }} unoptimized />}
                      <div>
                        <p style={{ fontWeight: 700, color: "var(--text-primary)", margin: 0, fontSize: "14px" }}>{activeColorData.color}</p>
                        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "12px" }}>{activeColorData.color_code}{activeColorData.color_code2 ? ` / ${activeColorData.color_code2}` : ""}</p>
                      </div>
                      <button style={{ ...s.btn, marginLeft: "auto", padding: "5px 12px", fontSize: "12px", background: activeColorData.sizes.every((sv) => selectedIds.has(sv.id)) ? "#0d948820" : "var(--bg-secondary)", color: activeColorData.sizes.every((sv) => selectedIds.has(sv.id)) ? "#0d9488" : "var(--text-secondary)", border: "1px solid var(--border)" }} onClick={() => toggleColor(activeColorData)}>
                        {activeColorData.sizes.every((sv) => selectedIds.has(sv.id)) ? "Deselect all sizes" : "Select all sizes"}
                      </button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                      {activeColorData.sizes.map((sv) => {
                        const selected = selectedIds.has(sv.id);
                        return (
                          <button key={sv.id} onClick={() => toggleSize(sv.id)} style={{ padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: sv.in_stock ? "pointer" : "not-allowed", border: `2px solid ${selected ? "#0d9488" : "var(--border)"}`, background: selected ? "#0d948820" : "var(--bg-secondary)", color: selected ? "#0d9488" : sv.in_stock ? "var(--text-primary)" : "var(--text-muted)", opacity: sv.in_stock ? 1 : 0.45, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }} title={sv.in_stock ? undefined : "Out of stock"}>
                            {sv.size}
                            <span style={{ fontSize: "9px", fontWeight: 400 }}>{sv.in_stock ? (selected ? "✓" : "") : "OOS"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : <p style={{ color: "var(--text-muted)" }}>Select a color.</p>}
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{totalSelected > 0 ? `${totalSelected} variants will be published` : "No variants selected — all available will be used"}</span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={{ ...s.btn, background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }} onClick={onClose}>Cancel</button>
            <button style={{ ...s.btn, background: "#0d9488", color: "#fff" }} onClick={() => onSave(Array.from(selectedIds), placement, price)} disabled={loading}><Check size={14} /> Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  const [collections, setCollections]               = useState<Collection[]>([]);
  const [loading, setLoading]                       = useState(true);
  const [expandedId, setExpandedId]                 = useState<string | null>(null);
  const [saving, setSaving]                         = useState<string | null>(null);
  const [savedIds, setSavedIds]                     = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen]                 = useState<string | null>(null);
  const [catalog, setCatalog]                       = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading]         = useState(false);
  const [catalogSearch, setCatalogSearch]           = useState("");
  const [variantPickerProduct, setVariantPickerProduct] = useState<{ collId: string; product: CollectionProduct } | null>(null);
  const [creating, setCreating]                     = useState(false);
  const [newName, setNewName]                       = useState("");
  const [newDesc, setNewDesc]                       = useState("");
  const [search, setSearch]                         = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/collections");
    const data = await res.json();
    setCollections(data.collections ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadCatalog() {
    if (catalog.length > 0) return;
    setCatalogLoading(true);
    const res  = await fetch("/api/catalog?limit=100&offset=0");
    const data = await res.json();
    setCatalog(data.products ?? []);
    setCatalogLoading(false);
  }

  function updateCollection(id: string, patch: Partial<Collection>) {
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function toggleProduct(collectionId: string, catProduct: CatalogProduct) {
    setCollections((prev) => prev.map((c) => {
      if (c.id !== collectionId) return c;
      const existing = (c.collection_products ?? []).find((p) => p.catalog_product_id === catProduct.id);
      const products = existing
        ? (c.collection_products ?? []).filter((p) => p.catalog_product_id !== catProduct.id)
        : [...(c.collection_products ?? []), { catalog_product_id: catProduct.id, catalog_product_name: catProduct.name, catalog_product_image: catProduct.image, placement: "front", default_price: "24.99", is_enabled: true, selected_variant_ids: [] }];
      return { ...c, collection_products: products };
    }));
  }

  function applyVariants(collId: string, productId: number, ids: number[], placement: string, price: string) {
    setCollections((prev) => prev.map((c) => {
      if (c.id !== collId) return c;
      return { ...c, collection_products: (c.collection_products ?? []).map((p) => p.catalog_product_id === productId ? { ...p, selected_variant_ids: ids, placement, default_price: price } : p) };
    }));
    setVariantPickerProduct(null);
  }

  async function saveCollection(id: string) {
    setSaving(id);
    const coll = collections.find((c) => c.id === id);
    if (!coll) return;
    await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: coll.id, name: coll.name, description: coll.description, products: coll.collection_products ?? [] }) });
    setSaving(null);
    setSavedIds((prev) => new Set(prev).add(id));
    setTimeout(() => setSavedIds((prev) => { const n = new Set(prev); n.delete(id); return n; }), 2500);
  }

  async function createCollection() {
    if (!newName.trim()) return;
    const res  = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), products: [] }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Failed to create"); return; }
    setCreating(false); setNewName(""); setNewDesc("");
    await load();
    if (data.id) setExpandedId(data.id);
  }

  async function deleteCollection(id: string) {
    if (!confirm("Delete this collection?")) return;
    await fetch(`/api/collections?id=${id}`, { method: "DELETE" });
    load();
  }

  const filteredCollections = collections.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredCatalog     = catalog.filter((p) => p.name.toLowerCase().includes(catalogSearch.toLowerCase()));

  return (
    <div style={s.page}>
      {variantPickerProduct && (
        <VariantPicker
          product={variantPickerProduct.product}
          onClose={() => setVariantPickerProduct(null)}
          onSave={(ids, placement, price) => applyVariants(variantPickerProduct.collId, variantPickerProduct.product.catalog_product_id, ids, placement, price)}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 36, height: 36, borderRadius: "10px", background: "#0d948822", display: "flex", alignItems: "center", justifyContent: "center" }}><FolderOpen size={18} color="#0d9488" /></div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Collections</h1>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>Group products — pick exact colors, sizes &amp; placement per product</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{ ...s.btn, background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)" }} onClick={load}><RefreshCw size={13} /></button>
          <button style={{ ...s.btn, background: "#0d9488", color: "#fff" }} onClick={() => setCreating(true)}><Plus size={14} /> New Collection</button>
        </div>
      </div>

      {creating && (
        <div style={{ ...s.card, border: "1px solid #0d948840", background: "#0d948808" }}>
          <h3 style={{ fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px", fontSize: "14px" }}>New Collection</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div><label style={s.label}>Name *</label><input style={s.input} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Everything, Summer 2025" autoFocus /></div>
            <div><label style={s.label}>Description</label><input style={s.input} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional" /></div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{ ...s.btn, background: "#0d9488", color: "#fff" }} onClick={createCollection}><Check size={13} /> Create</button>
            <button style={{ ...s.btn, background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }} onClick={() => setCreating(false)}><X size={13} /> Cancel</button>
          </div>
        </div>
      )}

      <div style={{ position: "relative", marginBottom: "16px" }}>
        <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input style={{ ...s.input, paddingLeft: "36px" }} placeholder="Search collections…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px", color: "var(--text-muted)" }}><Loader2 size={22} className="animate-spin" /><span style={{ marginLeft: 10 }}>Loading…</span></div>}

      {!loading && filteredCollections.map((coll) => {
        const isExpanded   = expandedId === coll.id;
        const isSaving     = saving === coll.id;
        const isSaved      = savedIds.has(coll.id!);
        const productCount = (coll.collection_products ?? []).length;
        const enabledCount = (coll.collection_products ?? []).filter((p) => p.is_enabled !== false).length;

        return (
          <div key={coll.id} style={s.card}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : coll.id!)}>
              <div style={{ width: 38, height: 38, borderRadius: "10px", background: "#0d948815", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FolderOpen size={18} color="#0d9488" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, color: "var(--text-primary)", margin: 0, fontSize: "14px" }}>{coll.name}</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>{productCount} products · {enabledCount} enabled{coll.description ? ` · ${coll.description}` : ""}</p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button style={{ ...s.btn, padding: "5px 8px", background: "#ef444415", color: "#ef4444", border: "1px solid #ef444430" }} onClick={(e) => { e.stopPropagation(); deleteCollection(coll.id!); }}><Trash2 size={13} /></button>
                {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
              </div>
            </div>

            {isExpanded && (
              <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <div><label style={s.label}>Name</label><input style={s.input} value={coll.name} onChange={(e) => updateCollection(coll.id!, { name: e.target.value })} /></div>
                  <div><label style={s.label}>Description</label><input style={s.input} value={coll.description ?? ""} onChange={(e) => updateCollection(coll.id!, { description: e.target.value })} placeholder="Optional" /></div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <label style={{ ...s.label, marginBottom: 0 }}>Products ({enabledCount} enabled)</label>
                    <button style={{ ...s.btn, padding: "5px 12px", fontSize: "12px", background: "#0d948815", color: "#0d9488", border: "1px solid #0d948830" }} onClick={() => { setPickerOpen(pickerOpen === coll.id ? null : coll.id!); loadCatalog(); }}><Plus size={12} /> Add Products</button>
                  </div>

                  {(coll.collection_products ?? []).length === 0 ? (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", padding: "16px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "8px" }}>No products yet. Click &quot;Add Products&quot; to browse the Printful catalog.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {(coll.collection_products ?? []).map((cp) => {
                        const variantCount = (cp.selected_variant_ids ?? []).length;
                        return (
                          <div key={cp.catalog_product_id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border)", flexWrap: "wrap" }}>
                            {cp.catalog_product_image && <Image src={cp.catalog_product_image} alt={cp.catalog_product_name} width={36} height={36} style={{ borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} unoptimized />}
                            <span style={{ flex: 1, fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, minWidth: 120 }}>{cp.catalog_product_name}</span>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--bg-primary)", padding: "2px 8px", borderRadius: "99px", border: "1px solid var(--border)", whiteSpace: "nowrap" }}>{variantCount > 0 ? `${variantCount} variants` : "All variants"}</span>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--bg-primary)", padding: "2px 8px", borderRadius: "99px", border: "1px solid var(--border)" }}>${cp.default_price ?? "24.99"}</span>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--bg-primary)", padding: "2px 8px", borderRadius: "99px", border: "1px solid var(--border)" }}>{cp.placement ?? "front"}</span>
                            <button style={{ ...s.btn, padding: "5px 10px", fontSize: "11px", background: "#6366f110", color: "#6366f1", border: "1px solid #6366f130" }} onClick={() => setVariantPickerProduct({ collId: coll.id!, product: cp })}><Palette size={12} /> Colors &amp; Sizes</button>
                            <button style={{ ...s.btn, padding: "4px 8px", background: cp.is_enabled !== false ? "#0d948820" : "var(--bg-tertiary)", color: cp.is_enabled !== false ? "#0d9488" : "var(--text-muted)", border: "1px solid var(--border)", fontSize: "11px" }} onClick={() => updateCollection(coll.id!, { collection_products: (coll.collection_products ?? []).map((p) => p.catalog_product_id === cp.catalog_product_id ? { ...p, is_enabled: !p.is_enabled } : p) })}>{cp.is_enabled !== false ? <><Check size={11} /> On</> : <><X size={11} /> Off</>}</button>
                            <button style={{ ...s.btn, padding: "4px 8px", background: "#ef444415", color: "#ef4444", border: "1px solid #ef444430" }} onClick={() => toggleProduct(coll.id!, { id: cp.catalog_product_id, name: cp.catalog_product_name, image: cp.catalog_product_image ?? "", type: "" })}><X size={12} /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {pickerOpen === coll.id && (
                  <div style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "16px", marginBottom: "16px", background: "var(--bg-secondary)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                      <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>Browse Printful Catalog</span>
                      <button style={{ ...s.btn, padding: "4px 8px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }} onClick={() => setPickerOpen(null)}><X size={13} /></button>
                    </div>
                    <input style={{ ...s.input, marginBottom: "12px" }} placeholder="Search catalog…" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} />
                    {catalogLoading ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", color: "var(--text-muted)" }}><Loader2 size={16} className="animate-spin" /><span style={{ marginLeft: 8 }}>Loading…</span></div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px", maxHeight: "360px", overflowY: "auto" }}>
                        {filteredCatalog.map((cp) => {
                          const added = (coll.collection_products ?? []).some((p) => p.catalog_product_id === cp.id);
                          return (
                            <button key={cp.id} onClick={() => toggleProduct(coll.id!, cp)} style={{ padding: "10px", borderRadius: "8px", border: `2px solid ${added ? "#0d9488" : "var(--border)"}`, background: added ? "#0d948810" : "var(--bg-primary)", cursor: "pointer", textAlign: "left" }}>
                              <Image src={cp.image} alt={cp.name} width={60} height={60} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "6px", marginBottom: "6px" }} unoptimized />
                              <p style={{ fontSize: "11px", fontWeight: 600, color: added ? "#0d9488" : "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{cp.name}</p>
                              {added && <span style={{ fontSize: "10px", color: "#0d9488", marginTop: "3px", display: "block" }}>✓ Added — click Colors &amp; Sizes</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {(coll.collection_products ?? []).length > 0 && (
                  <div style={{ padding: "10px 14px", background: "#6366f108", border: "1px solid #6366f120", borderRadius: "8px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6366f1" }}>
                    <Settings2 size={13} /> Click <strong style={{ marginLeft: 2, marginRight: 2 }}>Colors &amp; Sizes</strong> on any product to choose exact variants, placement and price before publishing.
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                  <button style={{ ...s.btn, background: isSaved ? "#0d9488" : "#ea580c", color: "#fff", minWidth: 130, justifyContent: "center" }} onClick={() => saveCollection(coll.id!)} disabled={isSaving}>
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : isSaved ? <PackageCheck size={14} /> : <Save size={14} />}
                    {isSaved ? "Saved!" : isSaving ? "Saving…" : "Save Collection"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!loading && collections.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
          <FolderOpen size={32} style={{ margin: "0 auto 12px" }} />
          <p>No collections yet. Create your first collection above.</p>
        </div>
      )}
    </div>
  );
}
