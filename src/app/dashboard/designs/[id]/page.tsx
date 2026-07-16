"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Search, Check, X, ChevronDown, ChevronUp,
  AlignCenter, Maximize2, Save, Rocket, RefreshCw, Palette, Images, Sparkles,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
interface Design {
  id: string; name: string; url: string; description?: string; tags?: string;
}

interface CatalogProduct {
  id: number; name: string; image: string; type: string; type_name?: string;
}

interface ProductConfig {
  id?: string;
  design_id: string;
  catalog_product_id: number;
  catalog_product_name?: string;
  catalog_product_image?: string;
  is_enabled: boolean;
  placement: string;
  position_data: PositionData | null;
  selected_variant_ids: number[];
  default_price: string;
  status: "draft" | "published" | "needs_update";
  printful_sync_product_id?: number | null;
  published_at?: string | null;
  selected_mockup_url?: string | null;
}

interface PositionData {
  width_pct: number;
  left_pct: number;
  top_pct: number;
}

interface VariantColor {
  color: string;
  color_code: string;
  color_code2?: string | null;
  image?: string;
  in_stock: boolean;
  sizes: { id: number; size: string; in_stock: boolean }[];
}

interface PlacementInfo {
  placement: string; height: number; width: number; orientation: string;
}

/* ─── Constants ──────────────────────────────────────────── */
const AREA_W = 220;
const AREA_H = 293; // ~3:4
const PRINT_W = 1800;
const PRINT_H = 2400;
// Approximate on-garment print zone as a fraction of the preview canvas —
// used purely to visually place the design over the real product photo.
const GUIDE = { left: 0.27, top: 0.16, width: 0.46, height: 0.62 };

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "t-shirt", label: "T-Shirts" },
  { key: "hoodie", label: "Hoodies" },
  { key: "sweatshirt", label: "Sweatshirts" },
  { key: "long sleeve", label: "Long Sleeve" },
  { key: "tank", label: "Tanks" },
  { key: "mug", label: "Mugs" },
  { key: "poster", label: "Posters" },
  { key: "canvas", label: "Canvas" },
  { key: "tote", label: "Totes" },
  { key: "hat", label: "Hats" },
  { key: "phone", label: "Phone Cases" },
  { key: "sticker", label: "Stickers" },
  { key: "pillow", label: "Pillows" },
  { key: "blanket", label: "Blankets" },
  { key: "sock", label: "Socks" },
];

/* ─── Styles ─────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  btn: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "none", transition: "opacity 0.15s" },
  btnPrimary: { background: "#ea580c", color: "#fff" },
  btnGhost: { background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)" },
  btnTeal: { background: "#0d948818", color: "#0d9488", border: "1px solid #0d948840" },
  input: { width: "100%", padding: "7px 10px", borderRadius: "7px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "12px", outline: "none" },
  label: { display: "block", fontSize: "10px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
};

/* ─── Component ──────────────────────────────────────────── */
export default function DesignWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: designId } = use(params);
  const router = useRouter();

  const [design, setDesign]               = useState<Design | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [configs, setConfigs]             = useState<Record<number, ProductConfig>>({});
  const [loadingPage, setLoadingPage]     = useState(true);
  const [search, setSearch]               = useState("");
  const [category, setCategory]           = useState("");
  const [expanded, setExpanded]           = useState<number | null>(null);

  // Per-product variant data (lazy loaded)
  const [variantData, setVariantData]     = useState<Record<number, { colors: VariantColor[]; placements: PlacementInfo[]; loading: boolean }>>({});

  // Publishing state
  const [publishing, setPublishing]       = useState<Set<number>>(new Set());
  const [publishLog, setPublishLog]       = useState<Record<number, { ok: boolean; msg: string }>>({});

  // Bulk publish
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [bulkProgress, setBulkProgress]   = useState(0);
  const [bulkTotal, setBulkTotal]         = useState(0);

  // Mockup generation state (per product)
  const [mockups, setMockups] = useState<Record<number, { list: { url: string; placement: string }[]; generating: boolean; error: string | null }>>({});

  // Drag-to-reposition refs (per expanded product)
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, left: 0, top: 0 });

  /* ── Load page data ── */
  const loadAll = useCallback(async () => {
    setLoadingPage(true);
    try {
      const [designRes, catalogRes, configsRes] = await Promise.all([
        fetch(`/api/designs`),
        fetch(`/api/catalog`),
        fetch(`/api/design-products?design_id=${designId}`),
      ]);
      const [dData, cData, cfData] = await Promise.all([
        designRes.json(), catalogRes.json(), configsRes.json(),
      ]);

      const foundDesign = (dData.designs ?? []).find((d: Design) => d.id === designId) ?? null;
      setDesign(foundDesign);
      setCatalogProducts(cData.products ?? []);

      const map: Record<number, ProductConfig> = {};
      for (const item of cfData.items ?? []) {
        map[item.catalog_product_id] = item;
      }
      setConfigs(map);
    } finally {
      setLoadingPage(false);
    }
  }, [designId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── Get or build a default config ── */
  function getConfig(pid: number, product: CatalogProduct): ProductConfig {
    return configs[pid] ?? {
      design_id: designId,
      catalog_product_id: pid,
      catalog_product_name: product.name,
      catalog_product_image: product.image,
      is_enabled: false,
      placement: "front",
      position_data: null,
      selected_variant_ids: [],
      default_price: "24.99",
      status: "draft",
    };
  }

  /* ── Patch a config key and save to DB ── */
  async function patchConfig(pid: number, product: CatalogProduct, patch: Partial<ProductConfig>) {
    const current = getConfig(pid, product);
    const updated = { ...current, ...patch };
    setConfigs(prev => ({ ...prev, [pid]: updated }));
    await fetch("/api/design-products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        design_id: designId,
        catalog_product_id: pid,
        catalog_product_name: updated.catalog_product_name ?? product.name,
        catalog_product_image: updated.catalog_product_image ?? product.image,
        is_enabled: updated.is_enabled,
        placement: updated.placement,
        position_data: updated.position_data,
        selected_variant_ids: updated.selected_variant_ids,
        default_price: updated.default_price,
      }),
    });
  }

  /* ── Load variants for a product ── */
  async function loadVariants(pid: number) {
    if (variantData[pid] || variantData[pid]?.loading) return;
    setVariantData(prev => ({ ...prev, [pid]: { colors: [], placements: [], loading: true } }));
    try {
      const res  = await fetch(`/api/catalog/variants?product_id=${pid}`);
      const data = await res.json();
      setVariantData(prev => ({ ...prev, [pid]: { colors: data.colors ?? [], placements: data.placements ?? [], loading: false } }));
    } catch {
      setVariantData(prev => ({ ...prev, [pid]: { colors: [], placements: [], loading: false } }));
    }
  }

  /* ── Toggle expand ── */
  function toggleExpand(pid: number, product: CatalogProduct) {
    if (expanded === pid) { setExpanded(null); return; }
    setExpanded(pid);
    loadVariants(pid);
    // Ensure a config row exists when expanded
    const cfg = configs[pid];
    if (!cfg) {
      patchConfig(pid, product, {});
    }
  }

  /* ── Position editor drag ── */
  function onMouseDown(e: React.MouseEvent, pid: number, product: CatalogProduct) {
    dragging.current = true;
    const pos = getConfig(pid, product).position_data ?? { width_pct: 0.8, left_pct: 0.1, top_pct: 0.05 };
    dragStart.current = { mx: e.clientX, my: e.clientY, left: pos.left_pct, top: pos.top_pct };
    e.preventDefault();
  }
  function onMouseMove(e: React.MouseEvent, pid: number, product: CatalogProduct) {
    if (!dragging.current) return;
    const pos = getConfig(pid, product).position_data ?? { width_pct: 0.8, left_pct: 0.1, top_pct: 0.05 };
    // Convert screen pixel delta into a fraction of the print-area guide box
    // so dragging feels 1:1 with the composited mockup preview.
    const guideWpx = GUIDE.width  * AREA_W;
    const guideHpx = GUIDE.height * AREA_H;
    const dx = (e.clientX - dragStart.current.mx) / guideWpx;
    const dy = (e.clientY - dragStart.current.my) / guideHpx;
    const newLeft = Math.max(0, Math.min(1 - pos.width_pct, dragStart.current.left + dx));
    const newTop  = Math.max(0, Math.min(0.95, dragStart.current.top + dy));
    setConfigs(prev => ({
      ...prev,
      [pid]: { ...getConfig(pid, product), position_data: { ...pos, left_pct: newLeft, top_pct: newTop } },
    }));
  }
  function onMouseUp(pid: number, product: CatalogProduct) {
    if (!dragging.current) return;
    dragging.current = false;
    const pos = getConfig(pid, product).position_data;
    if (pos) patchConfig(pid, product, { position_data: pos });
  }

  /* ── Center design ── */
  function centerPosition(pid: number, product: CatalogProduct, imgAspect: number) {
    const pos = getConfig(pid, product).position_data ?? { width_pct: 0.8, left_pct: 0.1, top_pct: 0.05 };
    const h = pos.width_pct / imgAspect * (AREA_W / AREA_H);
    const newPos = { ...pos, left_pct: (1 - pos.width_pct) / 2, top_pct: (1 - h) / 2 };
    patchConfig(pid, product, { position_data: newPos });
  }

  /* ── Select/deselect a color (all its variant IDs) ── */
  function toggleColor(pid: number, product: CatalogProduct, color: VariantColor) {
    const cfg = getConfig(pid, product);
    const colorIds = color.sizes.map(s => s.id);
    const current  = new Set(cfg.selected_variant_ids);
    const allSelected = colorIds.every(id => current.has(id));
    if (allSelected) {
      colorIds.forEach(id => current.delete(id));
    } else {
      colorIds.forEach(id => current.add(id));
    }
    patchConfig(pid, product, { selected_variant_ids: Array.from(current) });
  }

  /* ── Select all / none colors ── */
  function selectAllColors(pid: number, product: CatalogProduct, colors: VariantColor[]) {
    const all = colors.flatMap(c => c.sizes.map(s => s.id));
    patchConfig(pid, product, { selected_variant_ids: all });
  }
  function selectNoColors(pid: number, product: CatalogProduct) {
    patchConfig(pid, product, { selected_variant_ids: [] });
  }

  /* ── Generate mockups for a product ── */
  async function generateMockups(pid: number, product: CatalogProduct) {
    const cfg = getConfig(pid, product);
    setMockups(prev => ({ ...prev, [pid]: { list: [], generating: true, error: null } }));
    try {
      // Ensure variant data (and valid placements) are loaded
      let vd = variantData[pid];
      if (!vd || vd.loading || vd.colors.length === 0) {
        const res  = await fetch(`/api/catalog/variants?product_id=${pid}`);
        const data = await res.json();
        vd = { colors: data.colors ?? [], placements: data.placements ?? [], loading: false };
        setVariantData(prev => ({ ...prev, [pid]: vd }));
      }

      // Pick the best placement: use saved placement if it's in the valid list, else first valid one
      const validPlacements = vd.placements.map(p => p.placement);
      const placement = validPlacements.includes(cfg.placement)
        ? cfg.placement
        : (validPlacements[0] ?? "front");

      const res = await fetch("/api/catalog/mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: pid,
          design_url: design!.url,
          design_id: designId,
          placement,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMockups(prev => ({ ...prev, [pid]: { list: data.mockups ?? [], generating: false, error: null } }));
    } catch (e) {
      setMockups(prev => ({ ...prev, [pid]: { list: [], generating: false, error: e instanceof Error ? e.message : "Generation failed" } }));
    }
  }

  /* ── Select a mockup as the display image for this product ── */
  function selectMockup(pid: number, product: CatalogProduct, url: string) {
    patchConfig(pid, product, { selected_mockup_url: url });
  }

  /* ── Publish single product ── */
  async function publishProduct(pid: number, product: CatalogProduct) {
    setPublishing(prev => new Set(prev).add(pid));
    setPublishLog(prev => ({ ...prev, [pid]: { ok: false, msg: "Publishing…" } }));
    try {
      const res  = await fetch("/api/design-products/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design_id: designId, catalog_product_id: pid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      setConfigs(prev => ({
        ...prev,
        [pid]: { ...getConfig(pid, product), status: "published", printful_sync_product_id: data.printful_product_id },
      }));
      setPublishLog(prev => ({ ...prev, [pid]: { ok: true, msg: "Published!" } }));
    } catch (e) {
      setPublishLog(prev => ({ ...prev, [pid]: { ok: false, msg: e instanceof Error ? e.message : "Failed" } }));
    } finally {
      setPublishing(prev => { const n = new Set(prev); n.delete(pid); return n; });
    }
  }

  /* ── Bulk publish all enabled products ── */
  async function publishAll() {
    const enabled = filtered.filter(p => getConfig(p.id, p).is_enabled);
    if (enabled.length === 0) return;
    setBulkPublishing(true);
    setBulkTotal(enabled.length);
    setBulkProgress(0);
    for (const p of enabled) {
      await publishProduct(p.id, p);
      setBulkProgress(prev => prev + 1);
    }
    setBulkPublishing(false);
  }

  /* ── Filter products ── */
  const filtered = catalogProducts.filter(p => {
    const text = (p.name + " " + (p.type_name ?? "") + " " + (p.type ?? "")).toLowerCase();
    const matchesCat    = !category || text.includes(category);
    const matchesSearch = !search   || text.includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const enabledCount   = Object.values(configs).filter(c => c.is_enabled).length;
  const publishedCount = Object.values(configs).filter(c => c.status === "published").length;

  /* ─── Render ─────────────────────────────────────────── */
  if (loadingPage) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: "10px", color: "var(--text-muted)" }}>
        <Loader2 size={22} className="animate-spin" />
        <span>Loading design workspace…</span>
      </div>
    );
  }

  if (!design) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
        <p>Design not found.</p>
        <button style={{ ...s.btn, ...s.btnGhost, marginTop: "12px" }} onClick={() => router.push("/dashboard/designs")}>
          <ArrowLeft size={13} /> Back to Designs
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "24px" }}>
        <button style={{ ...s.btn, ...s.btnGhost, padding: "7px 10px", marginTop: "2px", flexShrink: 0 }} onClick={() => router.push("/dashboard/designs")}>
          <ArrowLeft size={14} />
        </button>
        <div style={{ width: 64, height: 64, borderRadius: "10px", overflow: "hidden", flexShrink: 0, border: "1px solid var(--border)", background: "#f4f4f4" }}>
          <Image src={design.url} alt={design.name} width={64} height={64} style={{ objectFit: "contain", width: "100%", height: "100%" }} unoptimized />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>{design.name}</h1>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}><strong style={{ color: enabledCount > 0 ? "#0d9488" : "var(--text-secondary)" }}>{enabledCount}</strong> enabled</span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}><strong style={{ color: publishedCount > 0 ? "#ea580c" : "var(--text-secondary)" }}>{publishedCount}</strong> published</span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{catalogProducts.length} catalog products</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          {bulkPublishing ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#ea580c", padding: "7px 14px" }}>
              <Loader2 size={13} className="animate-spin" />
              {bulkProgress}/{bulkTotal} publishing…
            </div>
          ) : (
            <button
              style={{ ...s.btn, ...s.btnPrimary, opacity: enabledCount === 0 ? 0.5 : 1 }}
              onClick={publishAll}
              disabled={enabledCount === 0}
            >
              <Rocket size={13} /> Publish All Enabled ({enabledCount})
            </button>
          )}
        </div>
      </div>

      {/* ── Category Tabs + Search ── */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flex: 1 }}>
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              style={{ ...s.btn, padding: "5px 12px", background: category === c.key ? "#ea580c" : "var(--bg-secondary)", color: category === c.key ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border)", fontSize: "11px" }}
              onClick={() => setCategory(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div style={{ position: "relative", width: 220 }}>
          <Search size={13} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input style={{ ...s.input, paddingLeft: "30px" }} placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
        {filtered.length} products — toggle <strong>Enable</strong> on each to include it in your store, then configure position &amp; colors.
      </p>

      {/* ── Product Grid ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.map(product => {
          const cfg       = getConfig(product.id, product);
          const isExpanded = expanded === product.id;
          const vd        = variantData[product.id];
          const isPub     = publishing.has(product.id);
          const log       = publishLog[product.id];
          const pos       = cfg.position_data ?? { width_pct: 0.8, left_pct: 0.1, top_pct: 0.05 };

          return (
            <div
              key={product.id}
              style={{ background: "var(--bg-primary)", border: `1px solid ${cfg.is_enabled ? "#0d948844" : "var(--border)"}`, borderRadius: "12px", overflow: "hidden", transition: "border-color 0.2s" }}
            >
              {/* ── Row Header ── */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px" }}>
                {/* Product image */}
                <div style={{ width: 52, height: 52, borderRadius: "8px", overflow: "hidden", flexShrink: 0, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
                  <Image src={product.image} alt={product.name} width={52} height={52} style={{ objectFit: "cover", width: "100%", height: "100%" }} unoptimized />
                </div>

                {/* Name + status */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: 0, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {product.name}
                  </p>
                  <div style={{ display: "flex", gap: "8px", marginTop: "3px", alignItems: "center" }}>
                    <StatusBadge status={cfg.status} />
                    {cfg.selected_variant_ids.length > 0 && (
                      <span style={{ fontSize: "10px", color: "#0d9488" }}>{cfg.selected_variant_ids.length} variants</span>
                    )}
                    {log && (
                      <span style={{ fontSize: "10px", color: log.ok ? "#0d9488" : "#ef4444" }}>{log.msg}</span>
                    )}
                  </div>
                </div>

                {/* Enable toggle */}
                <label style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", flexShrink: 0 }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: cfg.is_enabled ? "#0d9488" : "var(--text-muted)" }}>
                    {cfg.is_enabled ? "Enabled" : "Disabled"}
                  </span>
                  <div
                    onClick={() => patchConfig(product.id, product, { is_enabled: !cfg.is_enabled })}
                    style={{
                      width: 40, height: 22, borderRadius: "99px",
                      background: cfg.is_enabled ? "#0d9488" : "var(--bg-tertiary)",
                      border: "1px solid var(--border)",
                      position: "relative", cursor: "pointer", transition: "background 0.2s",
                    }}
                  >
                    <div style={{
                      position: "absolute", top: 2,
                      left: cfg.is_enabled ? 20 : 2,
                      width: 16, height: 16, borderRadius: "50%",
                      background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      transition: "left 0.2s",
                    }} />
                  </div>
                </label>

                {/* Publish button */}
                {cfg.is_enabled && (
                  <button
                    style={{ ...s.btn, ...(cfg.status === "published" ? s.btnTeal : s.btnPrimary), fontSize: "11px", padding: "5px 12px", flexShrink: 0, minWidth: 90, justifyContent: "center" }}
                    onClick={e => { e.stopPropagation(); publishProduct(product.id, product); }}
                    disabled={isPub}
                  >
                    {isPub
                      ? <><Loader2 size={11} className="animate-spin" /> Publishing…</>
                      : cfg.status === "published"
                        ? <><RefreshCw size={11} /> Update</>
                        : <><Rocket size={11} /> Publish</>
                    }
                  </button>
                )}

                {/* Expand toggle */}
                <button
                  style={{ ...s.btn, ...s.btnGhost, padding: "5px 10px", fontSize: "11px", flexShrink: 0 }}
                  onClick={() => toggleExpand(product.id, product)}
                >
                  {isExpanded ? <><ChevronUp size={13} /> Less</> : <><ChevronDown size={13} /> Configure</>}
                </button>
              </div>

              {/* ── Settings Panel ── */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "20px", display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>

                  {/* LEFT: Position Editor */}
                  <div style={{ flexShrink: 0 }}>
                    <label style={s.label}>Live Mockup Preview</label>
                    <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "8px" }}>
                      Drag the design or use the sliders — updates instantly
                    </p>
                    <PositionCanvas
                      designUrl={design.url}
                      mockupUrl={cfg.selected_mockup_url || mockups[product.id]?.list?.[0]?.url || product.image}
                      pos={pos}
                      onMouseDown={e => onMouseDown(e, product.id, product)}
                      onMouseMove={e => onMouseMove(e, product.id, product)}
                      onMouseUp={() => onMouseUp(product.id, product)}
                    />
                    <p style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "6px", lineHeight: 1.5 }}>
                      {cfg.selected_mockup_url
                        ? "Preview uses your selected store mockup."
                        : mockups[product.id]?.list?.[0]?.url
                          ? "Preview uses a generated mockup."
                          : "Preview uses the catalog photo — generate/select a mockup below for a closer match."}
                      {" "}Dashed box = approximate print area.
                    </p>
                    {/* Sliders */}
                    <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px", width: AREA_W }}>
                      <SliderRow
                        label={`Scale ${Math.round(pos.width_pct * 100)}%`}
                        min={10} max={150} value={Math.round(pos.width_pct * 100)}
                        onChange={v => {
                          const newPos = { ...pos, width_pct: v / 100 };
                          setConfigs(prev => ({ ...prev, [product.id]: { ...cfg, position_data: newPos } }));
                          patchConfig(product.id, product, { position_data: newPos });
                        }}
                      />
                      <SliderRow
                        label={`X ${Math.round(pos.left_pct * 100)}%`}
                        min={0} max={90} value={Math.round(pos.left_pct * 100)}
                        onChange={v => {
                          const newPos = { ...pos, left_pct: v / 100 };
                          setConfigs(prev => ({ ...prev, [product.id]: { ...cfg, position_data: newPos } }));
                          patchConfig(product.id, product, { position_data: newPos });
                        }}
                      />
                      <SliderRow
                        label={`Y ${Math.round(pos.top_pct * 100)}%`}
                        min={0} max={90} value={Math.round(pos.top_pct * 100)}
                        onChange={v => {
                          const newPos = { ...pos, top_pct: v / 100 };
                          setConfigs(prev => ({ ...prev, [product.id]: { ...cfg, position_data: newPos } }));
                          patchConfig(product.id, product, { position_data: newPos });
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                      <button style={{ ...s.btn, ...s.btnGhost, flex: 1, justifyContent: "center", fontSize: "11px", padding: "5px" }}
                        onClick={() => {
                          const aspect = 1; // will be overridden by actual image aspect
                          centerPosition(product.id, product, aspect);
                        }}
                      >
                        <AlignCenter size={11} /> Center
                      </button>
                      <button style={{ ...s.btn, ...s.btnGhost, flex: 1, justifyContent: "center", fontSize: "11px", padding: "5px" }}
                        onClick={() => patchConfig(product.id, product, { position_data: { width_pct: 0.8, left_pct: 0.1, top_pct: 0.05 } })}
                      >
                        <Maximize2 size={11} /> Reset
                      </button>
                    </div>

                    {/* Printful px info */}
                    <div style={{ marginTop: "10px", fontSize: "10px", color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "8px 10px", borderRadius: "6px", lineHeight: 1.7 }}>
                      W: {Math.round(pos.width_pct * PRINT_W)}px &nbsp;·&nbsp;
                      L: {Math.round(pos.left_pct * PRINT_W)}px &nbsp;·&nbsp;
                      T: {Math.round(pos.top_pct * PRINT_H)}px
                    </div>
                  </div>

                  {/* RIGHT: Colors + Settings */}
                  <div style={{ flex: 1, minWidth: 280 }}>
                    {/* Placement + Price row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                      <div>
                        <label style={s.label}>Print Placement</label>
                        {vd && vd.placements.length > 0 ? (
                          <select
                            style={s.input}
                            value={cfg.placement}
                            onChange={e => patchConfig(product.id, product, { placement: e.target.value })}
                          >
                            {vd.placements.map(pl => (
                              <option key={pl.placement} value={pl.placement}>
                                {pl.placement.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} ({pl.width}″×{pl.height}″)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select style={s.input} value={cfg.placement} onChange={e => patchConfig(product.id, product, { placement: e.target.value })}>
                            <option value="front">Front</option>
                            <option value="back">Back</option>
                            <option value="left_chest">Left Chest</option>
                          </select>
                        )}
                      </div>
                      <div>
                        <label style={s.label}>Retail Price (USD)</label>
                        <input
                          style={s.input}
                          type="number" step="0.01" min="1"
                          value={cfg.default_price}
                          onChange={e => patchConfig(product.id, product, { default_price: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Color Picker */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <label style={{ ...s.label, marginBottom: 0 }}>
                          <Palette size={10} style={{ verticalAlign: "middle", marginRight: 4 }} />
                          Colors &amp; Variants
                          {vd && !vd.loading && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, marginLeft: 6 }}>({cfg.selected_variant_ids.length} selected)</span>}
                        </label>
                        {vd && !vd.loading && vd.colors.length > 0 && (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button style={{ ...s.btn, ...s.btnGhost, padding: "3px 8px", fontSize: "10px" }} onClick={() => selectAllColors(product.id, product, vd.colors)}>All</button>
                            <button style={{ ...s.btn, ...s.btnGhost, padding: "3px 8px", fontSize: "10px" }} onClick={() => selectNoColors(product.id, product)}>None</button>
                          </div>
                        )}
                      </div>

                      {!vd || vd.loading ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px", color: "var(--text-muted)", fontSize: "12px" }}>
                          <Loader2 size={14} className="animate-spin" /> Loading colors from Printful…
                        </div>
                      ) : vd.colors.length === 0 ? (
                        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>No colors found for this product</p>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "200px", overflowY: "auto", padding: "2px" }}>
                          {vd.colors.map(color => {
                            const colorIds    = color.sizes.map(sz => sz.id);
                            const allSelected = colorIds.every(id => cfg.selected_variant_ids.includes(id));
                            const someSelected = colorIds.some(id => cfg.selected_variant_ids.includes(id));
                            const bg = color.color_code2
                              ? `linear-gradient(135deg, ${color.color_code} 50%, ${color.color_code2} 50%)`
                              : color.color_code;
                            return (
                              <button
                                key={color.color}
                                title={`${color.color} (${color.sizes.length} sizes)${color.in_stock ? "" : " — out of stock"}`}
                                onClick={() => toggleColor(product.id, product, color)}
                                style={{
                                  width: 30, height: 30, borderRadius: "50%",
                                  background: bg,
                                  border: allSelected ? "3px solid #ea580c" : someSelected ? "3px solid #0d9488" : "2px solid var(--border)",
                                  outline: allSelected ? "2px solid #ea580c44" : "none",
                                  cursor: "pointer",
                                  opacity: color.in_stock ? 1 : 0.4,
                                  transform: allSelected ? "scale(1.15)" : "scale(1)",
                                  transition: "all 0.15s",
                                  position: "relative",
                                  flexShrink: 0,
                                }}
                              >
                                {allSelected && (
                                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Check size={12} color="#fff" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }} />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Size breakdown for selected colors */}
                      {vd && !vd.loading && cfg.selected_variant_ids.length > 0 && (() => {
                        const selectedColors = vd.colors.filter(c => c.sizes.some(sz => cfg.selected_variant_ids.includes(sz.id)));
                        if (selectedColors.length === 0) return null;
                        const allSizes = [...new Set(selectedColors.flatMap(c => c.sizes.filter(sz => cfg.selected_variant_ids.includes(sz.id)).map(sz => sz.size)))];
                        return (
                          <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "8px" }}>
                            {selectedColors.length} color{selectedColors.length !== 1 ? "s" : ""} · sizes: {allSizes.join(", ")}
                          </p>
                        );
                      })()}
                    </div>

                    {/* ── Mockup Preview Section ── */}
                    <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                        <label style={{ ...s.label, marginBottom: 0 }}>
                          <Images size={10} style={{ verticalAlign: "middle", marginRight: 4 }} />
                          Store Mockup
                          {cfg.selected_mockup_url && <span style={{ fontWeight: 400, color: "#0d9488", marginLeft: 6 }}>✓ Selected</span>}
                        </label>
                        <button
                          style={{ ...s.btn, ...(mockups[product.id]?.generating ? { background: "#ea580c33", color: "#ea580c" } : s.btnPrimary), fontSize: "11px", padding: "5px 12px" }}
                          onClick={() => generateMockups(product.id, product)}
                          disabled={mockups[product.id]?.generating}
                        >
                          {mockups[product.id]?.generating
                            ? <><Loader2 size={11} className="animate-spin" /> Loading…</>
                            : cfg.status === "published"
                              ? <><Images size={11} /> Load Mockups</>
                              : <><Sparkles size={11} /> Generate Mockups</>
                          }
                        </button>
                      </div>

                      {mockups[product.id]?.generating && (
                        <p style={{ fontSize: "11px", color: "#ea580c", marginBottom: "10px" }}>
                          {cfg.status === "published"
                            ? "Loading preview images from Printful…"
                            : "Calling Printful mockup generator… this takes 20–60 seconds."}
                        </p>
                      )}

                      {mockups[product.id]?.error && (
                        <div style={{ padding: "8px 12px", background: "#ef444411", border: "1px solid #ef444430", borderRadius: "8px", fontSize: "11px", color: "#ef4444", marginBottom: "10px" }}>
                          {mockups[product.id].error}
                        </div>
                      )}

                      {/* Selected mockup preview */}
                      {cfg.selected_mockup_url && (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", padding: "8px", background: "#0d948811", borderRadius: "8px", border: "1px solid #0d948830" }}>
                          <Image
                            src={cfg.selected_mockup_url}
                            alt="selected mockup"
                            width={60} height={60}
                            style={{ borderRadius: "6px", objectFit: "cover", flexShrink: 0 }}
                            unoptimized
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "11px", fontWeight: 600, color: "#0d9488", margin: 0 }}>Selected as store image</p>
                            <p style={{ fontSize: "10px", color: "var(--text-muted)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>This will display on the shop &amp; homepage</p>
                          </div>
                          <button
                            style={{ ...s.btn, padding: "4px 8px", background: "#ef444415", color: "#ef4444", border: "1px solid #ef444430", fontSize: "10px" }}
                            onClick={() => patchConfig(product.id, product, { selected_mockup_url: null })}
                          >
                            <X size={10} /> Clear
                          </button>
                        </div>
                      )}

                      {/* Mockup grid */}
                      {(mockups[product.id]?.list ?? []).length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "8px" }}>
                          {mockups[product.id].list.map((m, i) => {
                            const isSelected = cfg.selected_mockup_url === m.url;
                            return (
                              <button
                                key={i}
                                onClick={() => selectMockup(product.id, product, m.url)}
                                style={{
                                  position: "relative", border: `2px solid ${isSelected ? "#ea580c" : "var(--border)"}`,
                                  borderRadius: "8px", overflow: "hidden", cursor: "pointer",
                                  background: "var(--bg-secondary)", padding: 0,
                                  outline: isSelected ? "2px solid #ea580c44" : "none",
                                }}
                              >
                                <Image src={m.url} alt={m.placement} width={110} height={110} style={{ width: "100%", height: "auto", aspectRatio: "1", objectFit: "cover", display: "block" }} unoptimized />
                                <div style={{ padding: "4px 6px", borderTop: "1px solid var(--border)", background: "var(--bg-primary)" }}>
                                  <p style={{ margin: 0, fontSize: "9px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {m.placement.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                                  </p>
                                </div>
                                {isSelected && (
                                  <div style={{ position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: "50%", background: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Check size={10} color="#fff" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {(mockups[product.id]?.list ?? []).length === 0 && !mockups[product.id]?.generating && !cfg.selected_mockup_url && (
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                          {cfg.status === "published"
                            ? <>Click <strong>Load Mockups</strong> to pull the auto-generated preview images Printful created for this product.</>
                            : <>Click <strong>Generate Mockups</strong> to create previews using the Printful mockup generator, or <strong>Publish</strong> the product first for instant auto-generated images.</>
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    draft:        { bg: "#6b728018", color: "#6b7280", label: "Draft" },
    published:    { bg: "#0d948818", color: "#0d9488", label: "Published" },
    needs_update: { bg: "#f59e0b18", color: "#d97706", label: "Needs Update" },
  };
  const c = cfg[status] ?? cfg.draft;
  return (
    <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "99px", background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function PositionCanvas({ designUrl, mockupUrl, pos, onMouseDown, onMouseMove, onMouseUp }: {
  designUrl: string;
  mockupUrl?: string | null;
  pos: PositionData;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
}) {
  const [aspect, setAspect] = useState(1);

  // Guide box (approximate on-garment print zone) in canvas px
  const guideL = GUIDE.left   * AREA_W;
  const guideT = GUIDE.top    * AREA_H;
  const guideW = GUIDE.width  * AREA_W;
  const guideH = GUIDE.height * AREA_H;

  // Design size/position mapped onto the guide box
  const designW = pos.width_pct * guideW;
  const designH = designW / aspect;
  const designL = guideL + pos.left_pct * guideW;
  const designT = guideT + pos.top_pct  * guideH;

  return (
    <div
      style={{ width: AREA_W, height: AREA_H, background: "#f9fafb", border: "1px solid var(--border)", borderRadius: "6px", position: "relative", overflow: "hidden", cursor: "crosshair", userSelect: "none" }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Product mockup background */}
      {mockupUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mockupUrl}
          alt="product mockup"
          draggable={false}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)", backgroundSize: "22px 22px", opacity: 0.5 }} />
      )}

      {/* Print area guide box */}
      <div style={{ position: "absolute", left: guideL, top: guideT, width: guideW, height: guideH, border: "1.5px dashed rgba(234,88,12,0.7)", borderRadius: "4px", pointerEvents: "none" }} />

      {/* Design overlay — live position */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={designUrl}
        alt="design"
        draggable={false}
        onLoad={e => {
          const img = e.currentTarget;
          setAspect(img.naturalWidth / img.naturalHeight);
        }}
        onMouseDown={onMouseDown}
        style={{ position: "absolute", left: designL, top: designT, width: designW, height: designH, cursor: "move", pointerEvents: "all", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))" }}
      />
    </div>
  );
}

function SliderRow({ label, min, max, value, onChange }: {
  label: string; min: number; max: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>
        <span>{label}</span>
      </div>
      <input
        type="range" min={min} max={max} step={1} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: "100%", accentColor: "#ea580c", height: "4px" }}
      />
    </div>
  );
}
