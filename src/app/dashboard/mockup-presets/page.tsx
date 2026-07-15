"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  Palette, Plus, Trash2, Save, Loader2, Search, Check, X,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle2,
  RefreshCw, Edit3, Package,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CatalogProduct {
  id: number;
  name: string;
  image: string;
  type: string;
  type_name?: string;
}

interface VariantColor {
  color: string;
  color_code: string;
  color_code2?: string;
  image?: string;
  sizes: { id: number; size: string; in_stock: boolean }[];
}

interface PresetProduct {
  catalog_product_id: number;
  catalog_product_name: string;
  catalog_product_image: string;
  selected_variant_ids: number[];
  placement: string;
  default_price: string;
}

interface MockupPreset {
  id: string;
  name: string;
  description: string;
  products: PresetProduct[];
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "t-shirt", label: "T-Shirts" },
  { key: "hoodie", label: "Hoodies" },
  { key: "sweatshirt", label: "Sweatshirts" },
  { key: "long sleeve", label: "Long Sleeve" },
  { key: "tank", label: "Tank Tops" },
  { key: "mug", label: "Mugs" },
  { key: "poster", label: "Posters" },
  { key: "hat", label: "Hats" },
  { key: "sticker", label: "Stickers" },
  { key: "tote", label: "Tote Bags" },
];

const PAGE_SIZE = 20;

const s: Record<string, React.CSSProperties> = {
  page:  { padding: "24px", display: "flex", gap: "20px", height: "calc(100vh - 64px)", overflow: "hidden" },
  card:  { background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "10px" },
  input: { width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" },
  label: { display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  btn:   { display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none" },
};

export default function MockupPresetsPage() {
  // Preset list
  const [presets, setPresets]         = useState<MockupPreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [editingPreset, setEditingPreset]   = useState<Partial<MockupPreset> | null>(null); // null = list view

  // Catalog browser (inside editor)
  const [catalog, setCatalog]         = useState<CatalogProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catSearch, setCatSearch]     = useState("");
  const [catCategory, setCatCategory] = useState("");
  const [catOffset, setCatOffset]     = useState(0);

  // Variant picker modal
  const [pickerProduct, setPickerProduct]   = useState<CatalogProduct | null>(null);
  const [pickerColors, setPickerColors]     = useState<VariantColor[]>([]);
  const [pickerLoading, setPickerLoading]   = useState(false);
  const [pickerActiveColor, setPickerActiveColor] = useState<string | null>(null);
  const [pickerIds, setPickerIds]           = useState<Set<number>>(new Set());
  const [pickerPlacement, setPickerPlacement] = useState("front");
  const [pickerPrice, setPickerPrice]       = useState("24.99");

  // Save state
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [savedOk, setSavedOk]         = useState(false);

  // ── Load presets ──
  const loadPresets = useCallback(async () => {
    setLoadingPresets(true);
    const res  = await fetch("/api/mockup-presets");
    const data = await res.json();
    setPresets(data.presets ?? []);
    setLoadingPresets(false);
  }, []);

  useEffect(() => { loadPresets(); }, [loadPresets]);

  // ── Load catalog when editor opens ──
  useEffect(() => {
    if (editingPreset !== null && catalog.length === 0) {
      setLoadingCatalog(true);
      fetch("/api/catalog").then((r) => r.json()).then((d) => {
        setCatalog(d.products ?? []);
        setLoadingCatalog(false);
      });
    }
  }, [editingPreset, catalog.length]);

  // ── Create new preset ──
  function createNew() {
    setEditingPreset({ name: "", description: "", products: [] });
    setSavedOk(false);
    setSaveError(null);
  }

  // ── Edit existing preset ──
  function editPreset(preset: MockupPreset) {
    setEditingPreset({ ...preset, products: preset.products ? [...preset.products] : [] });
    setSavedOk(false);
    setSaveError(null);
  }

  // ── Delete preset ──
  async function deletePreset(id: string) {
    if (!confirm("Delete this preset?")) return;
    await fetch(`/api/mockup-presets?id=${id}`, { method: "DELETE" });
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }

  // ── Save preset ──
  async function savePreset() {
    if (!editingPreset || !editingPreset.name?.trim()) return;
    setSaving(true);
    setSaveError(null);
    const res = await fetch("/api/mockup-presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingPreset.id,
        name: editingPreset.name,
        description: editingPreset.description ?? "",
        products: editingPreset.products ?? [],
      }),
    });
    const data = await res.json();
    if (!res.ok) { setSaveError(data.error); setSaving(false); return; }
    setSaving(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 3000);
    await loadPresets();
    // Update id if newly created
    if (!editingPreset.id && data.id) {
      setEditingPreset((prev) => prev ? { ...prev, id: data.id } : prev);
    }
  }

  // ── Remove a product from the preset ──
  function removeProduct(catalogProductId: number) {
    setEditingPreset((prev) => prev ? { ...prev, products: (prev.products ?? []).filter((p) => p.catalog_product_id !== catalogProductId) } : prev);
  }

  // ── Open variant picker for a catalog product ──
  async function openPicker(product: CatalogProduct) {
    const existing = (editingPreset?.products ?? []).find((p) => p.catalog_product_id === product.id);
    setPickerProduct(product);
    setPickerPlacement(existing?.placement ?? "front");
    setPickerPrice(existing?.default_price ?? "24.99");
    setPickerIds(new Set(existing?.selected_variant_ids ?? []));
    setPickerColors([]);
    setPickerLoading(true);
    setPickerActiveColor(null);
    const res  = await fetch(`/api/catalog/variants?product_id=${product.id}`);
    const data = await res.json();
    const cols: VariantColor[] = data.colors ?? [];
    setPickerColors(cols);
    setPickerActiveColor(cols[0]?.color ?? null);
    if (!existing || existing.selected_variant_ids.length === 0) {
      setPickerIds(new Set(cols.flatMap((c) => c.sizes.filter((s) => s.in_stock).map((s) => s.id))));
    }
    setPickerLoading(false);
  }

  // ── Save picker selection into the preset ──
  function confirmPicker() {
    if (!pickerProduct) return;
    const entry: PresetProduct = {
      catalog_product_id: pickerProduct.id,
      catalog_product_name: pickerProduct.name,
      catalog_product_image: pickerProduct.image,
      selected_variant_ids: Array.from(pickerIds),
      placement: pickerPlacement,
      default_price: pickerPrice,
    };
    setEditingPreset((prev) => {
      if (!prev) return prev;
      const products = [...(prev.products ?? [])];
      const idx = products.findIndex((p) => p.catalog_product_id === pickerProduct.id);
      if (idx >= 0) products[idx] = entry;
      else products.push(entry);
      return { ...prev, products };
    });
    setPickerProduct(null);
  }

  function togglePickerColor(c: VariantColor) {
    const ids = c.sizes.map((sv) => sv.id);
    const allSel = ids.every((id) => pickerIds.has(id));
    setPickerIds((prev) => { const next = new Set(prev); if (allSel) ids.forEach((id) => next.delete(id)); else ids.forEach((id) => next.add(id)); return next; });
  }

  function togglePickerSize(id: number, inStock: boolean) {
    if (!inStock) return;
    setPickerIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  // ── Filtered catalog ──
  const filtered   = catalog.filter((p) => { const t = (p.name + " " + (p.type_name ?? "")).toLowerCase(); return (!catCategory || t.includes(catCategory)) && (!catSearch || t.includes(catSearch.toLowerCase())); });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice(catOffset, catOffset + PAGE_SIZE);
  const activeColorData = pickerColors.find((c) => c.color === pickerActiveColor);

  // ── LIST VIEW ────────────────────────────────────────────────────────────
  if (editingPreset === null) {
    return (
      <div style={{ padding: "24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "10px", background: "#ea580c22", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Palette size={18} color="#ea580c" />
            </div>
            <div>
              <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Mockup Presets</h1>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                Named product+color configurations — select one when publishing a design
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{ ...s.btn, background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", padding: "7px 12px" }} onClick={loadPresets}>
              <RefreshCw size={13} />
            </button>
            <button style={{ ...s.btn, background: "#ea580c", color: "#fff" }} onClick={createNew}>
              <Plus size={14} /> New Preset
            </button>
          </div>
        </div>

        {loadingPresets ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px", color: "var(--text-muted)", gap: "10px" }}>
            <Loader2 size={20} className="animate-spin" /> Loading…
          </div>
        ) : presets.length === 0 ? (
          <div style={{ ...s.card, padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
            <Palette size={36} style={{ opacity: 0.25, margin: "0 auto 14px" }} />
            <p style={{ fontWeight: 600, fontSize: "15px", margin: "0 0 6px" }}>No presets yet</p>
            <p style={{ fontSize: "13px", margin: "0 0 20px", lineHeight: 1.6, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
              Create a preset to define which products and colors to use for a specific type of design.
              For example: <strong>Dark Products</strong> (black, navy, charcoal) for white designs,
              and <strong>Light Products</strong> (white, cream, light grey) for dark designs.
            </p>
            <button style={{ ...s.btn, background: "#ea580c", color: "#fff", margin: "0 auto" }} onClick={createNew}>
              <Plus size={14} /> Create First Preset
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
            {presets.map((preset) => (
              <div key={preset.id} style={{ ...s.card, padding: "18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{preset.name}</h3>
                    {preset.description && <p style={{ margin: "3px 0 0", fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>{preset.description}</p>}
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button style={{ ...s.btn, padding: "5px 10px", background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontSize: "12px" }} onClick={() => editPreset(preset)}>
                      <Edit3 size={12} /> Edit
                    </button>
                    <button style={{ ...s.btn, padding: "5px 8px", background: "#ef444415", color: "#ef4444", border: "1px solid #ef444430", fontSize: "12px" }} onClick={() => deletePreset(preset.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <Package size={11} color="var(--text-muted)" />
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{(preset.products ?? []).length} product{(preset.products ?? []).length !== 1 ? "s" : ""}</span>
                  {(preset.products ?? []).slice(0, 4).map((p) => (
                    <div key={p.catalog_product_id} title={p.catalog_product_name} style={{ width: 28, height: 28, borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
                      <Image src={p.catalog_product_image} alt={p.catalog_product_name} width={28} height={28} style={{ objectFit: "cover" }} unoptimized />
                    </div>
                  ))}
                  {(preset.products ?? []).length > 4 && (
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>+{(preset.products ?? []).length - 4} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── EDITOR VIEW ──────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {/* LEFT: catalog browser */}
      <div style={{ width: 310, flexShrink: 0, display: "flex", flexDirection: "column", gap: "10px", overflow: "hidden" }}>
        <button style={{ ...s.btn, padding: "5px 10px", background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontSize: "12px", alignSelf: "flex-start" }} onClick={() => setEditingPreset(null)}>
          <ChevronLeft size={13} /> Back to presets
        </button>

        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input style={{ ...s.input, paddingLeft: 32, fontSize: "12px" }} placeholder="Search catalog…" value={catSearch} onChange={(e) => { setCatSearch(e.target.value); setCatOffset(0); }} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {CATEGORIES.map((cat) => (
            <button key={cat.key} onClick={() => { setCatCategory(cat.key); setCatOffset(0); }} style={{ ...s.btn, padding: "3px 9px", fontSize: "11px", background: catCategory === cat.key ? "#ea580c" : "var(--bg-secondary)", color: catCategory === cat.key ? "#fff" : "var(--text-secondary)", border: `1px solid ${catCategory === cat.key ? "#ea580c" : "var(--border)"}` }}>
              {cat.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
          {loadingCatalog ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", color: "var(--text-muted)" }}>
              <Loader2 size={16} className="animate-spin" /><span style={{ marginLeft: 8, fontSize: "12px" }}>Loading catalog…</span>
            </div>
          ) : paginated.map((p) => {
            const inPreset = (editingPreset?.products ?? []).some((ep) => ep.catalog_product_id === p.id);
            return (
              <div key={p.id} onClick={() => openPicker(p)} style={{ ...s.card, padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "9px", border: `1px solid ${inPreset ? "#0d9488" : "var(--border)"}`, background: inPreset ? "#0d948808" : "var(--bg-primary)" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Image src={p.image} alt={p.name} width={38} height={38} style={{ borderRadius: "6px", objectFit: "cover" }} unoptimized />
                  {inPreset && (
                    <div style={{ position: "absolute", top: -4, right: -4, width: 13, height: 13, background: "#0d9488", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg-primary)" }}>
                      <Check size={7} color="#fff" />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)", margin: 0 }}>ID {p.id}</p>
                </div>
                {inPreset && <CheckCircle2 size={13} color="#0d9488" style={{ flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>

        {!loadingCatalog && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <button style={{ ...s.btn, padding: "5px 10px", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)" }} disabled={catOffset === 0} onClick={() => setCatOffset((o) => Math.max(0, o - PAGE_SIZE))}><ChevronLeft size={13} /></button>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{Math.floor(catOffset / PAGE_SIZE) + 1}/{totalPages}</span>
            <button style={{ ...s.btn, padding: "5px 10px", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)" }} disabled={catOffset + PAGE_SIZE >= filtered.length} onClick={() => setCatOffset((o) => o + PAGE_SIZE)}><ChevronRight size={13} /></button>
          </div>
        )}
      </div>

      {/* RIGHT: preset editor */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Preset name + description */}
        <div style={{ ...s.card, padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 30, height: 30, borderRadius: "8px", background: "#ea580c22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Palette size={15} color="#ea580c" />
            </div>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
              {editingPreset.id ? "Edit Preset" : "New Preset"}
            </h2>
            <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
              {saveError && <span style={{ fontSize: "12px", color: "#ef4444" }}>{saveError}</span>}
              <button
                style={{ ...s.btn, background: savedOk ? "#0d9488" : "#ea580c", color: "#fff", fontSize: "12px", minWidth: 120, justifyContent: "center" }}
                onClick={savePreset}
                disabled={saving || !editingPreset.name?.trim()}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : savedOk ? <CheckCircle2 size={13} /> : <Save size={13} />}
                {savedOk ? "Saved!" : saving ? "Saving…" : "Save Preset"}
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
            <div>
              <label style={s.label}>Preset Name *</label>
              <input style={s.input} placeholder='e.g. "Dark Products"' value={editingPreset.name ?? ""} onChange={(e) => setEditingPreset((prev) => prev ? { ...prev, name: e.target.value } : prev)} />
            </div>
            <div>
              <label style={s.label}>Description</label>
              <input style={s.input} placeholder='e.g. "Use for white or light-colored designs"' value={editingPreset.description ?? ""} onChange={(e) => setEditingPreset((prev) => prev ? { ...prev, description: e.target.value } : prev)} />
            </div>
          </div>
        </div>

        {/* Instructions */}
        {(editingPreset.products ?? []).length === 0 ? (
          <div style={{ ...s.card, padding: "36px", textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--border)" }}>
            <Palette size={32} style={{ opacity: 0.2, margin: "0 auto 12px" }} />
            <p style={{ fontWeight: 600, fontSize: "14px", margin: "0 0 6px" }}>No products added yet</p>
            <p style={{ fontSize: "12px", lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>
              Click any product in the left panel to configure which colors and sizes to include in this preset.
            </p>
          </div>
        ) : (
          <div style={{ ...s.card, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Package size={14} color="#ea580c" />
              <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                {(editingPreset.products ?? []).length} product{(editingPreset.products ?? []).length !== 1 ? "s" : ""} in this preset
              </h3>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "auto" }}>Click a product on the left to edit its selection</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {(editingPreset.products ?? []).map((p) => (
                <div key={p.catalog_product_id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <Image src={p.catalog_product_image} alt={p.catalog_product_name} width={36} height={36} style={{ borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} unoptimized />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.catalog_product_name}</p>
                    <p style={{ margin: 0, fontSize: "10px", color: "var(--text-muted)" }}>
                      {p.selected_variant_ids.length} variants · {p.placement} · ${p.default_price}
                    </p>
                  </div>
                  <button style={{ ...s.btn, padding: "4px 8px", background: "var(--bg-primary)", color: "#ea580c", border: "1px solid var(--border)", fontSize: "11px" }} onClick={() => { const cp = catalog.find((c) => c.id === p.catalog_product_id); if (cp) openPicker(cp); }}>
                    <Edit3 size={11} />
                  </button>
                  <button style={{ ...s.btn, padding: "4px 8px", background: "#ef444415", color: "#ef4444", border: "1px solid #ef444430", fontSize: "11px" }} onClick={() => removeProduct(p.catalog_product_id)}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Variant Picker Modal ── */}
      {pickerProduct && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setPickerProduct(null)}>
          <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "14px", width: "100%", maxWidth: "820px", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px" }}>
              <Image src={pickerProduct.image} alt={pickerProduct.name} width={40} height={40} style={{ borderRadius: "8px", objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }} unoptimized />
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{pickerProduct.name}</h3>
                <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>Select which colors/sizes to include · {pickerIds.size} selected</p>
              </div>
              {/* Settings bar */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label style={{ ...s.label, margin: 0, fontSize: "10px", whiteSpace: "nowrap" }}>Placement</label>
                  <select value={pickerPlacement} onChange={(e) => setPickerPlacement(e.target.value)} style={{ ...s.input, width: 130, padding: "4px 8px", fontSize: "12px" }}>
                    <option value="front">Front</option>
                    <option value="back">Back</option>
                    <option value="left">Left Sleeve</option>
                    <option value="right">Right Sleeve</option>
                    <option value="label_outside">Outside Label</option>
                    <option value="neck_inner">Inside Neck</option>
                    <option value="default">Default</option>
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label style={{ ...s.label, margin: 0, fontSize: "10px", whiteSpace: "nowrap" }}>Price ($)</label>
                  <input type="number" min="0" step="0.01" value={pickerPrice} onChange={(e) => setPickerPrice(e.target.value)} style={{ ...s.input, width: 80, padding: "4px 8px", fontSize: "12px" }} />
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button style={{ ...s.btn, padding: "4px 9px", fontSize: "11px", background: "#0d948810", color: "#0d9488", border: "1px solid #0d948830" }} onClick={() => setPickerIds(new Set(pickerColors.flatMap((c) => c.sizes.map((sv) => sv.id))))}>All</button>
                  <button style={{ ...s.btn, padding: "4px 9px", fontSize: "11px", background: "var(--bg-secondary)", color: "var(--text-muted)", border: "1px solid var(--border)" }} onClick={() => setPickerIds(new Set())}><X size={11} /></button>
                </div>
                <button style={{ ...s.btn, background: "#ea580c", color: "#fff", fontSize: "12px" }} onClick={confirmPicker}>
                  <Check size={13} /> Confirm
                </button>
                <button style={{ ...s.btn, padding: "6px 8px", background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }} onClick={() => setPickerProduct(null)}><X size={13} /></button>
              </div>
            </div>

            {/* Modal body: color list + sizes */}
            {pickerLoading ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: "10px" }}>
                <Loader2 size={18} className="animate-spin" /><span style={{ fontSize: "13px" }}>Loading variants…</span>
              </div>
            ) : (
              <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
                {/* Color list */}
                <div style={{ width: 190, borderRight: "1px solid var(--border)", overflowY: "auto", padding: "8px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", margin: "0 0 6px 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{pickerColors.length} colors</p>
                  {pickerColors.map((c) => {
                    const allSel  = c.sizes.every((sv) => pickerIds.has(sv.id));
                    const someSel = c.sizes.some((sv) => pickerIds.has(sv.id));
                    const isAct   = pickerActiveColor === c.color;
                    const selCount = c.sizes.filter((sv) => pickerIds.has(sv.id)).length;
                    return (
                      <div key={c.color} onClick={() => setPickerActiveColor(c.color)} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "5px 6px", borderRadius: "6px", cursor: "pointer", marginBottom: "2px", background: isAct ? "var(--bg-secondary)" : "transparent", border: `1px solid ${isAct ? "var(--border)" : "transparent"}` }}>
                        <div style={{ position: "relative", width: 16, height: 16, borderRadius: "50%", border: "1px solid #0002", flexShrink: 0, overflow: "hidden" }}>
                          <div style={{ position: "absolute", inset: 0, background: c.color_code }} />
                          {c.color_code2 && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", background: c.color_code2 }} />}
                        </div>
                        <span style={{ flex: 1, fontSize: "11px", color: "var(--text-primary)", fontWeight: isAct ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.color}</span>
                        <span style={{ fontSize: "9px", color: allSel ? "#0d9488" : someSel ? "#f59e0b" : "var(--text-muted)", whiteSpace: "nowrap" }}>{selCount}/{c.sizes.length}</span>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${allSel ? "#0d9488" : someSel ? "#f59e0b" : "var(--border)"}`, background: allSel ? "#0d9488" : someSel ? "#f59e0b" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); togglePickerColor(c); }}>
                          {(allSel || someSel) && <Check size={6} color="#fff" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Sizes */}
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                  {activeColorData ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ position: "relative", width: 36, height: 36, borderRadius: "50%", border: "2px solid var(--border)", overflow: "hidden", flexShrink: 0 }}>
                          <div style={{ position: "absolute", inset: 0, background: activeColorData.color_code }} />
                          {activeColorData.color_code2 && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", background: activeColorData.color_code2 }} />}
                        </div>
                        {activeColorData.image && <Image src={activeColorData.image} alt={activeColorData.color} width={52} height={52} style={{ borderRadius: "6px", objectFit: "cover", border: "1px solid var(--border)" }} unoptimized />}
                        <div>
                          <p style={{ fontWeight: 700, color: "var(--text-primary)", margin: 0, fontSize: "14px" }}>{activeColorData.color}</p>
                          <p style={{ color: "var(--text-muted)", margin: "2px 0 0", fontSize: "11px" }}>
                            {activeColorData.sizes.filter((sv) => sv.in_stock).length}/{activeColorData.sizes.length} in stock
                          </p>
                        </div>
                        <button style={{ ...s.btn, marginLeft: "auto", fontSize: "12px", padding: "5px 12px", background: activeColorData.sizes.every((sv) => pickerIds.has(sv.id)) ? "#0d948820" : "var(--bg-secondary)", color: activeColorData.sizes.every((sv) => pickerIds.has(sv.id)) ? "#0d9488" : "var(--text-secondary)", border: "1px solid var(--border)" }} onClick={() => togglePickerColor(activeColorData)}>
                          {activeColorData.sizes.every((sv) => pickerIds.has(sv.id)) ? "Deselect all" : "Select all sizes"}
                        </button>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {activeColorData.sizes.map((sv) => {
                          const sel = pickerIds.has(sv.id);
                          return (
                            <button key={sv.id} onClick={() => togglePickerSize(sv.id, sv.in_stock)} title={sv.in_stock ? `Variant ID: ${sv.id}` : "Out of stock"} style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: sv.in_stock ? "pointer" : "not-allowed", border: `2px solid ${sel ? "#ea580c" : "var(--border)"}`, background: sel ? "#ea580c15" : sv.in_stock ? "var(--bg-secondary)" : "var(--bg-tertiary)", color: sel ? "#ea580c" : sv.in_stock ? "var(--text-primary)" : "var(--text-muted)", opacity: sv.in_stock ? 1 : 0.4, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", minWidth: 52 }}>
                              <span>{sv.size}</span>
                              <span style={{ fontSize: "9px", fontWeight: 400, opacity: 0.6 }}>{!sv.in_stock ? "OOS" : sel ? `✓` : sv.id}</span>
                            </button>
                          );
                        })}
                      </div>
                      {activeColorData.sizes.some((sv) => !sv.in_stock) && (
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <AlertCircle size={12} /> OOS = Out of stock
                        </p>
                      )}
                    </>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Select a color on the left.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
