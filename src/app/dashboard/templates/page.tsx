"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  LayoutTemplate, Search, Loader2, Save, Trash2, RefreshCw,
  Check, X, ChevronLeft, ChevronRight, AlertCircle, Palette,
  CheckCircle2, Settings, Eye, ImageOff, Play,
} from "lucide-react";

interface CatalogProduct {
  id: number;
  name: string;
  image: string;
  type: string;
  type_name?: string;
  variant_count?: number;
}

interface VariantColor {
  color: string;
  color_code: string;
  color_code2?: string;
  image?: string;
  sizes: { id: number; size: string; in_stock: boolean }[];
}

interface Template {
  catalog_product_id: number;
  catalog_product_name: string;
  catalog_product_image?: string;
  selected_variant_ids: number[];
  placement: string;
  thumbnail_placement: string;
  default_price: string;
  notes: string;
  updated_at?: string;
}

const CATEGORIES = [
  { key: "",            label: "All" },
  { key: "t-shirt",     label: "T-Shirts" },
  { key: "hoodie",      label: "Hoodies" },
  { key: "sweatshirt",  label: "Sweatshirts" },
  { key: "long sleeve", label: "Long Sleeve" },
  { key: "tank",        label: "Tank Tops" },
  { key: "mug",         label: "Mugs" },
  { key: "tumbler",     label: "Tumblers" },
  { key: "poster",      label: "Posters" },
  { key: "canvas",      label: "Canvas" },
  { key: "hat",         label: "Hats & Caps" },
  { key: "beanie",      label: "Beanies" },
  { key: "sticker",     label: "Stickers" },
  { key: "tote",        label: "Tote Bags" },
  { key: "phone",       label: "Phone Cases" },
  { key: "pillow",      label: "Pillows" },
  { key: "blanket",     label: "Blankets" },
  { key: "kid",         label: "Kids & Baby" },
  { key: "sock",        label: "Socks" },
];

const PAGE_SIZE = 24;

const s: Record<string, React.CSSProperties> = {
  page:  { padding: "24px", display: "flex", gap: "20px", height: "calc(100vh - 64px)", overflow: "hidden" },
  input: { width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" },
  label: { display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  btn:   { display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none" },
  card:  { background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "10px" },
};

export default function TemplatesPage() {
  const [catalog, setCatalog]               = useState<CatalogProduct[]>([]);
  const [templates, setTemplates]           = useState<Map<number, Template>>(new Map());
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [search, setSearch]                 = useState("");
  const [category, setCategory]             = useState("");
  const [offset, setOffset]                 = useState(0);

  const [selected, setSelected]             = useState<CatalogProduct | null>(null);
  const [colors, setColors]                 = useState<VariantColor[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [variantError, setVariantError]     = useState<string | null>(null);
  const [activeColor, setActiveColor]       = useState<string | null>(null);

  const [selectedIds, setSelectedIds]       = useState<Set<number>>(new Set());
  const [placement, setPlacement]           = useState("front");
  const [price, setPrice]                   = useState("24.99");
  const [notes, setNotes]                   = useState("");
  const [thumbnailPlacement, setThumbnailPlacement] = useState("front");
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);

  // Mockup preview tester
  const [testDesignUrl, setTestDesignUrl]   = useState("");
  const [mockupPreviews, setMockupPreviews] = useState<{ placement: string; url: string }[]>([]);
  const [generatingMockup, setGeneratingMockup] = useState(false);
  const [mockupError, setMockupError]       = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoadingCatalog(true);
    const [catRes, tplRes] = await Promise.all([fetch("/api/catalog"), fetch("/api/templates")]);
    const [catData, tplData] = await Promise.all([catRes.json(), tplRes.json()]);
    setCatalog(catData.products ?? []);
    const map = new Map<number, Template>();
    for (const t of (tplData.templates ?? [])) map.set(t.catalog_product_id, t);
    setTemplates(map);
    setLoadingCatalog(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function openEditor(product: CatalogProduct) {
    setSelected(product);
    setLoadingVariants(true);
    setVariantError(null);
    setColors([]);
    const tpl = templates.get(product.id);
    setSelectedIds(new Set(tpl?.selected_variant_ids ?? []));
    setPlacement(tpl?.placement ?? "front");
    setThumbnailPlacement(tpl?.thumbnail_placement ?? "front");
    setPrice(tpl?.default_price ?? "24.99");
    setNotes(tpl?.notes ?? "");
    setMockupPreviews([]);
    setMockupError(null);
    setTestDesignUrl("");
    setSaved(false);
    try {
      const res  = await fetch(`/api/catalog/variants?product_id=${product.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const cols: VariantColor[] = data.colors ?? [];
      setColors(cols);
      setActiveColor(cols[0]?.color ?? null);
      if (!tpl || tpl.selected_variant_ids.length === 0) {
        setSelectedIds(new Set(cols.flatMap((c) => c.sizes.filter((sv) => sv.in_stock).map((sv) => sv.id))));
      }
    } catch (e) {
      setVariantError(e instanceof Error ? e.message : "Failed to load variants");
    } finally {
      setLoadingVariants(false);
    }
  }

  async function saveTemplate() {
    if (!selected) return;
    setSaving(true);
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        catalog_product_id: selected.id,
        catalog_product_name: selected.name,
        catalog_product_image: selected.image,
        selected_variant_ids: Array.from(selectedIds),
        placement, thumbnail_placement: thumbnailPlacement, default_price: price, notes,
      }),
    });
    setTemplates((prev) => {
      const next = new Map(prev);
      next.set(selected.id, { catalog_product_id: selected.id, catalog_product_name: selected.name, catalog_product_image: selected.image, selected_variant_ids: Array.from(selectedIds), placement, thumbnail_placement: thumbnailPlacement, default_price: price, notes, updated_at: new Date().toISOString() });
      return next;
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function deleteTemplate() {
    if (!selected || !confirm("Remove this template?")) return;
    await fetch(`/api/templates?catalog_product_id=${selected.id}`, { method: "DELETE" });
    setTemplates((prev) => { const next = new Map(prev); next.delete(selected.id); return next; });
    setSelectedIds(new Set()); setSaved(false);
  }

  async function generateMockup() {
    if (!selected || !testDesignUrl.trim()) return;
    setGeneratingMockup(true);
    setMockupError(null);
    setMockupPreviews([]);
    try {
      const res = await fetch("/api/catalog/mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selected.id,
          design_url: testDesignUrl.trim(),
          placement: thumbnailPlacement,
          variant_ids: Array.from(selectedIds).slice(0, 5),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMockupPreviews(data.mockups ?? []);
    } catch (e) {
      setMockupError(e instanceof Error ? e.message : "Mockup generation failed");
    } finally {
      setGeneratingMockup(false);
    }
  }

  function toggleColor(c: VariantColor) {
    const ids = c.sizes.map((sv) => sv.id);
    const allSel = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => { const next = new Set(prev); if (allSel) ids.forEach((id) => next.delete(id)); else ids.forEach((id) => next.add(id)); return next; });
  }

  function toggleSize(id: number) {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  const filtered    = catalog.filter((p) => { const text = (p.name + " " + (p.type_name ?? "")).toLowerCase(); return (!category || text.includes(category)) && (!search || text.includes(search.toLowerCase())); });
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const paginated   = filtered.slice(offset, offset + PAGE_SIZE);
  const activeColorData = colors.find((c) => c.color === activeColor);

  return (
    <div style={s.page}>
      {/* LEFT: catalog browser */}
      <div style={{ width: 330, flexShrink: 0, display: "flex", flexDirection: "column", gap: "10px", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "8px", background: "#ea580c22", display: "flex", alignItems: "center", justifyContent: "center" }}><LayoutTemplate size={16} color="#ea580c" /></div>
            <div>
              <h1 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Product Templates</h1>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>{templates.size} configured · {filtered.length} shown</p>
            </div>
          </div>
          <button style={{ ...s.btn, padding: "5px 8px", background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }} onClick={loadAll}><RefreshCw size={13} /></button>
        </div>

        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input style={{ ...s.input, paddingLeft: "32px", fontSize: "12px" }} placeholder="Search products…" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {CATEGORIES.map((cat) => (
            <button key={cat.key} onClick={() => { setCategory(cat.key); setOffset(0); }} style={{ ...s.btn, padding: "3px 9px", fontSize: "11px", background: category === cat.key ? "#ea580c" : "var(--bg-secondary)", color: category === cat.key ? "#fff" : "var(--text-secondary)", border: `1px solid ${category === cat.key ? "#ea580c" : "var(--border)"}` }}>
              {cat.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
          {loadingCatalog ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", color: "var(--text-muted)" }}>
              <Loader2 size={18} className="animate-spin" /><span style={{ marginLeft: 8, fontSize: "12px" }}>Loading catalog…</span>
            </div>
          ) : paginated.map((p) => {
            const hasTpl  = templates.has(p.id);
            const isAct   = selected?.id === p.id;
            const tpl     = templates.get(p.id);
            return (
              <div key={p.id} onClick={() => openEditor(p)} style={{ ...s.card, padding: "9px 11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "9px", border: `1px solid ${isAct ? "#ea580c" : "var(--border)"}`, background: isAct ? "#ea580c08" : "var(--bg-primary)" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Image src={p.image} alt={p.name} width={40} height={40} style={{ borderRadius: "6px", objectFit: "cover" }} unoptimized />
                  {hasTpl && (
                    <div style={{ position: "absolute", top: -4, right: -4, width: 13, height: 13, background: "#0d9488", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg-primary)" }}>
                      <Check size={7} color="#fff" />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)", margin: 0 }}>
                    ID {p.id}
                    {hasTpl && tpl && <span style={{ color: "#0d9488", marginLeft: 5 }}>· {tpl.selected_variant_ids.length} variants · ${tpl.default_price}</span>}
                  </p>
                </div>
                {hasTpl ? <CheckCircle2 size={13} color="#0d9488" style={{ flexShrink: 0 }} /> : <Settings size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>

        {!loadingCatalog && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <button style={{ ...s.btn, padding: "5px 10px", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)" }} disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}><ChevronLeft size={13} /></button>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{currentPage}/{totalPages}</span>
            <button style={{ ...s.btn, padding: "5px 10px", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)" }} disabled={offset + PAGE_SIZE >= filtered.length} onClick={() => setOffset((o) => o + PAGE_SIZE)}><ChevronRight size={13} /></button>
          </div>
        )}
      </div>

      {/* RIGHT: editor */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {!selected ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: "12px", border: "1px dashed var(--border)", borderRadius: "12px" }}>
            <LayoutTemplate size={40} style={{ opacity: 0.25 }} />
            <p style={{ fontWeight: 600, fontSize: "14px", margin: 0 }}>Select a product to configure its template</p>
            <p style={{ fontSize: "12px", margin: 0, maxWidth: 340, textAlign: "center", lineHeight: 1.6 }}>Templates set the default colors, sizes, print placement and retail price for each product. They are applied automatically when publishing designs.</p>
          </div>
        ) : (
          <div style={{ ...s.card, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px" }}>
              <Image src={selected.image} alt={selected.name} width={46} height={46} style={{ borderRadius: "8px", objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} unoptimized />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.name}</h2>
                <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>
                  Printful ID {selected.id} · {selected.type_name ?? selected.type}
                  {selected.variant_count ? ` · ${selected.variant_count} total variants` : ""}
                  {templates.has(selected.id) && <span style={{ color: "#0d9488", marginLeft: 6 }}>· Template saved</span>}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {templates.has(selected.id) && (
                  <button style={{ ...s.btn, padding: "6px 10px", fontSize: "12px", background: "#ef444415", color: "#ef4444", border: "1px solid #ef444430" }} onClick={deleteTemplate}>
                    <Trash2 size={13} /> Remove
                  </button>
                )}
                <button style={{ ...s.btn, background: saved ? "#0d9488" : "#ea580c", color: "#fff", fontSize: "12px", minWidth: 115, justifyContent: "center" }} onClick={saveTemplate} disabled={saving || loadingVariants}>
                  {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
                  {saved ? "Saved!" : saving ? "Saving…" : "Save Template"}
                </button>
              </div>
            </div>

            {/* Settings bar */}
            <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", background: "var(--bg-secondary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={{ ...s.label, margin: 0, whiteSpace: "nowrap" }}>Print Placement</label>
                <select value={placement} onChange={(e) => setPlacement(e.target.value)} style={{ ...s.input, width: 155, padding: "5px 10px", fontSize: "12px" }}>
                  <option value="front">Front</option>
                  <option value="back">Back</option>
                  <option value="left">Left Sleeve</option>
                  <option value="right">Right Sleeve</option>
                  <option value="label_outside">Outside Label</option>
                  <option value="neck_inner">Inside Neck</option>
                  <option value="default">Default</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={{ ...s.label, margin: 0, whiteSpace: "nowrap" }}>Thumbnail View</label>
                <select value={thumbnailPlacement} onChange={(e) => setThumbnailPlacement(e.target.value)} style={{ ...s.input, width: 155, padding: "5px 10px", fontSize: "12px" }}>
                  <option value="front">Front</option>
                  <option value="back">Back</option>
                  <option value="left">Left Sleeve</option>
                  <option value="right">Right Sleeve</option>
                  <option value="label_outside">Outside Label</option>
                  <option value="neck_inner">Inside Neck</option>
                  <option value="default">Default</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={{ ...s.label, margin: 0, whiteSpace: "nowrap" }}>Retail Price ($)</label>
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} style={{ ...s.input, width: 90, padding: "5px 10px", fontSize: "12px" }} />
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", minWidth: 180 }}>
                <label style={{ ...s.label, margin: 0, whiteSpace: "nowrap" }}>Notes</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes…" style={{ ...s.input, fontSize: "12px" }} />
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{selectedIds.size} selected</span>
                <button style={{ ...s.btn, padding: "4px 9px", fontSize: "11px", background: "#0d948810", color: "#0d9488", border: "1px solid #0d948830" }} onClick={() => setSelectedIds(new Set(colors.flatMap((c) => c.sizes.map((sv) => sv.id))))}>All</button>
                <button style={{ ...s.btn, padding: "4px 9px", fontSize: "11px", background: "var(--bg-primary)", color: "var(--text-muted)", border: "1px solid var(--border)" }} onClick={() => setSelectedIds(new Set())}><X size={11} /></button>
              </div>
            </div>

            {/* Body */}
            {loadingVariants ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: "10px" }}>
                <Loader2 size={20} className="animate-spin" /><span style={{ fontSize: "13px" }}>Loading variants from Printful…</span>
              </div>
            ) : variantError ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", gap: "8px" }}>
                <AlertCircle size={16} /><span style={{ fontSize: "13px" }}>{variantError}</span>
              </div>
            ) : (
              <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
                {/* Color list */}
                <div style={{ width: 200, borderRight: "1px solid var(--border)", overflowY: "auto", padding: "8px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", margin: "0 0 6px 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{colors.length} colors</p>
                  {colors.map((c) => {
                    const allSel  = c.sizes.every((sv) => selectedIds.has(sv.id));
                    const someSel = c.sizes.some((sv) => selectedIds.has(sv.id));
                    const isAct   = activeColor === c.color;
                    const selCount = c.sizes.filter((sv) => selectedIds.has(sv.id)).length;
                    return (
                      <div key={c.color} onClick={() => setActiveColor(c.color)} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "6px 7px", borderRadius: "7px", cursor: "pointer", marginBottom: "2px", background: isAct ? "var(--bg-secondary)" : "transparent", border: `1px solid ${isAct ? "var(--border)" : "transparent"}` }}>
                        <div style={{ position: "relative", width: 18, height: 18, borderRadius: "50%", border: "1px solid #0002", flexShrink: 0, overflow: "hidden" }}>
                          <div style={{ position: "absolute", inset: 0, background: c.color_code }} />
                          {c.color_code2 && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", background: c.color_code2 }} />}
                        </div>
                        <span style={{ flex: 1, fontSize: "11px", color: "var(--text-primary)", fontWeight: isAct ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.color}</span>
                        <span style={{ fontSize: "9px", color: allSel ? "#0d9488" : someSel ? "#f59e0b" : "var(--text-muted)", whiteSpace: "nowrap" }}>{selCount}/{c.sizes.length}</span>
                        <div style={{ width: 13, height: 13, borderRadius: "50%", border: `2px solid ${allSel ? "#0d9488" : someSel ? "#f59e0b" : "var(--border)"}`, background: allSel ? "#0d9488" : someSel ? "#f59e0b" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); toggleColor(c); }}>
                          {(allSel || someSel) && <Check size={7} color="#fff" />}
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
                        <div style={{ position: "relative", width: 42, height: 42, borderRadius: "50%", border: "2px solid var(--border)", overflow: "hidden", flexShrink: 0 }}>
                          <div style={{ position: "absolute", inset: 0, background: activeColorData.color_code }} />
                          {activeColorData.color_code2 && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", background: activeColorData.color_code2 }} />}
                        </div>
                        {activeColorData.image && <Image src={activeColorData.image} alt={activeColorData.color} width={60} height={60} style={{ borderRadius: "8px", objectFit: "cover", border: "1px solid var(--border)" }} unoptimized />}
                        <div>
                          <p style={{ fontWeight: 700, color: "var(--text-primary)", margin: 0, fontSize: "14px" }}>{activeColorData.color}</p>
                          <p style={{ color: "var(--text-muted)", margin: "2px 0 0", fontSize: "11px" }}>
                            {activeColorData.color_code}{activeColorData.color_code2 ? ` / ${activeColorData.color_code2}` : ""}
                            {" · "}{activeColorData.sizes.filter(sv => sv.in_stock).length}/{activeColorData.sizes.length} in stock
                          </p>
                        </div>
                        <button style={{ ...s.btn, marginLeft: "auto", fontSize: "12px", padding: "5px 12px", background: activeColorData.sizes.every(sv => selectedIds.has(sv.id)) ? "#0d948820" : "var(--bg-secondary)", color: activeColorData.sizes.every(sv => selectedIds.has(sv.id)) ? "#0d9488" : "var(--text-secondary)", border: "1px solid var(--border)" }} onClick={() => toggleColor(activeColorData)}>
                          <Palette size={12} />
                          {activeColorData.sizes.every(sv => selectedIds.has(sv.id)) ? "Deselect color" : "Select all sizes"}
                        </button>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {activeColorData.sizes.map((sv) => {
                          const sel = selectedIds.has(sv.id);
                          return (
                            <button key={sv.id} onClick={() => sv.in_stock && toggleSize(sv.id)} title={sv.in_stock ? `Variant ID: ${sv.id}` : "Out of stock"} style={{ padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: sv.in_stock ? "pointer" : "not-allowed", border: `2px solid ${sel ? "#ea580c" : "var(--border)"}`, background: sel ? "#ea580c15" : sv.in_stock ? "var(--bg-secondary)" : "var(--bg-tertiary)", color: sel ? "#ea580c" : sv.in_stock ? "var(--text-primary)" : "var(--text-muted)", opacity: sv.in_stock ? 1 : 0.4, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", minWidth: 60 }}>
                              <span>{sv.size}</span>
                              <span style={{ fontSize: "9px", fontWeight: 400, opacity: 0.7 }}>{!sv.in_stock ? "OOS" : sel ? `✓ ${sv.id}` : sv.id}</span>
                            </button>
                          );
                        })}
                      </div>

                      {activeColorData.sizes.some(sv => !sv.in_stock) && (
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <AlertCircle size={12} /> OOS = Out of stock. These variants cannot be published.
                        </p>
                      )}

                      {/* Mockup preview tester */}
                      <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border)" }}>
                        <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
                          <Eye size={13} style={{ verticalAlign: "middle", marginRight: 5 }} />
                          Mockup Preview Tester
                        </p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 10px", lineHeight: 1.5 }}>
                          Paste a design URL below to generate a sample mockup and see exactly how it will look on this product with your thumbnail view setting.
                        </p>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                          <input
                            value={testDesignUrl}
                            onChange={(e) => setTestDesignUrl(e.target.value)}
                            placeholder="https://… (direct image URL)"
                            style={{ ...s.input, flex: 1, fontSize: "12px" }}
                          />
                          <button
                            style={{ ...s.btn, background: "#ea580c", color: "#fff", fontSize: "12px", whiteSpace: "nowrap", minWidth: 130, justifyContent: "center", opacity: !testDesignUrl.trim() || generatingMockup ? 0.6 : 1 }}
                            disabled={!testDesignUrl.trim() || generatingMockup}
                            onClick={generateMockup}
                          >
                            {generatingMockup ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                            {generatingMockup ? "Generating…" : "Generate Preview"}
                          </button>
                        </div>
                        {mockupError && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#ef4444", fontSize: "12px", marginBottom: "10px" }}>
                            <AlertCircle size={13} /> {mockupError}
                          </div>
                        )}
                        {mockupPreviews.length > 0 && (
                          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                            {mockupPreviews.map((m, i) => (
                              <div key={i} style={{ textAlign: "center" }}>
                                <div style={{ ...s.card, overflow: "hidden", width: 160, height: 160 }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={m.url} alt={m.placement} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                                <p style={{ fontSize: "10px", color: "var(--text-muted)", margin: "4px 0 0", textTransform: "capitalize" }}>{m.placement}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {mockupPreviews.length === 0 && !generatingMockup && !mockupError && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", border: "1px dashed var(--border)", borderRadius: "8px", color: "var(--text-muted)", gap: "8px" }}>
                            <ImageOff size={16} /><span style={{ fontSize: "12px" }}>Mockup preview will appear here</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Select a color on the left.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
