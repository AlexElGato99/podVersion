"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  Images,
  Loader2,
  Search,
  RefreshCw,
  Check,
  ImageOff,
  ChevronRight,
  X,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
interface StoreProduct {
  id: number;
  name: string;
  thumbnail_url: string;
}

interface Mockup {
  url: string;
  label: string;
}

interface ProductMockupState {
  loading: boolean;
  seeding: boolean;
  seedError: string | null;
  mockups: Mockup[];          // existing previews from Printful
  generated: Mockup[];        // seeded via mockup generator
  selected: string | null;    // currently saved custom_mockup_url
}

/* ─── Styles ─────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page:   { padding: "24px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" },
  card:   { background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", marginBottom: "12px" },
  label:  { display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  btn:    { display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "none", transition: "opacity 0.15s" },
  btnPrimary: { background: "#ea580c", color: "#fff" },
  btnGhost:   { background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)" },
  btnTeal:    { background: "#0d948818", color: "#0d9488", border: "1px solid #0d948840" },
};

/* ─── Main Component ─────────────────────────────────────── */
export default function MockupManagerPage() {
  const [products, setProducts]   = useState<StoreProduct[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [saving, setSaving]       = useState<number | null>(null);
  const [savedIds, setSavedIds]   = useState<Set<number>>(new Set());

  // Per-product mockup state
  const [states, setStates] = useState<Record<number, ProductMockupState>>({});
  // Which product row is expanded
  const [expanded, setExpanded] = useState<number | null>(null);

  /* ── helpers ── */
  function getState(id: number): ProductMockupState {
    return states[id] ?? { loading: false, seeding: false, seedError: null, mockups: [], generated: [], selected: null };
  }
  function patchState(id: number, patch: Partial<ProductMockupState>) {
    setStates(prev => ({ ...prev, [id]: { ...getState(id), ...patch } }));
  }

  /* ── Load store products + their saved thumbnails ── */
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

      // Pre-populate selected mockup from saved settings
      const initial: Record<number, ProductMockupState> = {};
      for (const row of sData.settings ?? []) {
        initial[row.id] = { loading: false, seeding: false, seedError: null, mockups: [], generated: [], selected: row.custom_mockup_url ?? null };
      }
      setStates(initial);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  /* ── Load existing Printful preview mockups for a product ── */
  async function loadMockups(productId: number) {
    patchState(productId, { loading: true });
    try {
      const res  = await fetch(`/api/products/mockups?id=${productId}`);
      const data = await res.json();
      patchState(productId, { mockups: data.previews ?? [], loading: false });
    } catch {
      patchState(productId, { loading: false });
    }
  }

  /* ── Expand a row and load mockups if not yet loaded ── */
  function toggleExpand(productId: number) {
    if (expanded === productId) {
      setExpanded(null);
      return;
    }
    setExpanded(productId);
    const st = getState(productId);
    if (st.mockups.length === 0 && !st.loading) {
      loadMockups(productId);
    }
  }

  /* ── Seed (generate all placements) via Printful mockup generator ── */
  async function seedMockups(productId: number) {
    patchState(productId, { seeding: true, seedError: null, generated: [] });
    try {
      const res  = await fetch("/api/products/mockups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync_product_id: productId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      const generated: Mockup[] = (data.mockups ?? []).map((m: { placement: string; url: string }) => ({
        url: m.url,
        label: m.placement.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      }));
      patchState(productId, { seeding: false, generated });
    } catch (e) {
      patchState(productId, { seeding: false, seedError: e instanceof Error ? e.message : "Failed" });
    }
  }

  /* ── Select a mockup as the thumbnail and save to DB ── */
  async function selectMockup(productId: number, url: string) {
    patchState(productId, { selected: url });
    setSaving(productId);
    try {
      await fetch("/api/product-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId, custom_mockup_url: url }),
      });
      setSavedIds(prev => { const n = new Set(prev); n.add(productId); return n; });
      setTimeout(() => setSavedIds(prev => { const n = new Set(prev); n.delete(productId); return n; }), 2500);
    } finally {
      setSaving(null);
    }
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 36, height: 36, borderRadius: "10px", background: "#0d948822", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Images size={18} color="#0d9488" />
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Mockup Manager</h1>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>Select the store thumbnail mockup for each published product</p>
          </div>
        </div>
        <button style={{ ...s.btn, ...s.btnGhost }} onClick={loadProducts}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "20px" }}>
        <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          style={{ width: "100%", padding: "8px 12px 8px 36px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px", color: "var(--text-muted)", gap: "10px" }}>
          <Loader2 size={20} className="animate-spin" />
          <span>Loading products from Printful…</span>
        </div>
      )}

      {/* Product rows */}
      {!loading && filtered.map(product => {
        const st       = getState(product.id);
        const isExpanded = expanded === product.id;
        const isSaving   = saving === product.id;
        const isSaved    = savedIds.has(product.id);

        // All mockups: generated first, then existing
        const allMockups: Mockup[] = [
          ...st.generated,
          ...st.mockups,
        ];

        return (
          <div key={product.id} style={s.card}>
            {/* Row header — always visible */}
            <div
              style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", cursor: "pointer" }}
              onClick={() => toggleExpand(product.id)}
            >
              {/* Current thumbnail */}
              <div style={{ width: 52, height: 52, borderRadius: "8px", overflow: "hidden", flexShrink: 0, border: "1px solid var(--border)", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {(st.selected || product.thumbnail_url) ? (
                  <Image
                    src={st.selected || product.thumbnail_url}
                    alt={product.name}
                    width={52} height={52}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                    unoptimized
                  />
                ) : (
                  <ImageOff size={18} color="var(--text-muted)" />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: 0, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {product.name}
                </p>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                  ID #{product.id}
                  {st.selected ? " · Custom thumbnail set" : " · Using Printful default"}
                  {isSaved ? <span style={{ color: "#0d9488", marginLeft: 8 }}>✓ Saved</span> : null}
                  {isSaving ? <span style={{ color: "#ea580c", marginLeft: 8 }}>Saving…</span> : null}
                </p>
              </div>

              <ChevronRight
                size={16}
                color="var(--text-muted)"
                style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}
              />
            </div>

            {/* Expanded mockup panel */}
            {isExpanded && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "16px" }}>
                {/* Toolbar */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
                  <span style={{ ...s.label, flex: 1 }}>
                    {allMockups.length > 0
                      ? `${allMockups.length} mockup${allMockups.length !== 1 ? "s" : ""} available — click one to set as thumbnail`
                      : "No mockups loaded yet"}
                  </span>

                  {st.seeding ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#ea580c" }}>
                      <Loader2 size={13} className="animate-spin" />
                      Generating… (30–90s)
                    </div>
                  ) : (
                    <button
                      style={{ ...s.btn, ...s.btnTeal }}
                      onClick={e => { e.stopPropagation(); seedMockups(product.id); }}
                    >
                      <RefreshCw size={12} /> Generate All Placements
                    </button>
                  )}

                  {st.selected && (
                    <button
                      style={{ ...s.btn, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444430" }}
                      onClick={e => { e.stopPropagation(); selectMockup(product.id, ""); }}
                    >
                      <X size={12} /> Clear Custom
                    </button>
                  )}
                </div>

                {/* Seed error */}
                {st.seedError && (
                  <div style={{ marginBottom: "12px", padding: "8px 12px", background: "#ef444411", border: "1px solid #ef444430", borderRadius: "8px", fontSize: "12px", color: "#ef4444" }}>
                    {st.seedError}
                  </div>
                )}

                {/* Generated badge */}
                {st.generated.length > 0 && (
                  <div style={{ marginBottom: "12px", padding: "8px 12px", background: "#0d948811", border: "1px solid #0d948830", borderRadius: "8px", fontSize: "12px", color: "#0d9488", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Check size={13} />
                    {st.generated.length} placement mockup{st.generated.length !== 1 ? "s" : ""} generated — shown first below.
                  </div>
                )}

                {/* Mockup grid */}
                {st.loading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "20px", color: "var(--text-muted)", fontSize: "13px" }}>
                    <Loader2 size={16} className="animate-spin" /> Loading mockups…
                  </div>
                ) : allMockups.length === 0 ? (
                  <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                    <ImageOff size={28} style={{ margin: "0 auto 10px", opacity: 0.35 }} />
                    <p style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 4px" }}>No mockups found</p>
                    <p style={{ fontSize: "12px", margin: 0, lineHeight: 1.5 }}>
                      Click <strong>Generate All Placements</strong> above to create mockups using the design file that was used when publishing this product.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" }}>
                    {allMockups.map((m, i) => {
                      const isSelected  = st.selected === m.url;
                      const isGenerated = i < st.generated.length;
                      return (
                        <button
                          key={m.url + i}
                          onClick={e => { e.stopPropagation(); selectMockup(product.id, m.url); }}
                          style={{
                            position: "relative",
                            border: `2px solid ${isSelected ? "#ea580c" : isGenerated ? "#0d948866" : "var(--border)"}`,
                            borderRadius: "10px",
                            overflow: "hidden",
                            cursor: "pointer",
                            background: "var(--bg-secondary)",
                            padding: 0,
                            outline: isSelected ? "3px solid #ea580c44" : "none",
                            transition: "border-color 0.15s",
                          }}
                        >
                          <Image
                            src={m.url}
                            alt={m.label}
                            width={140} height={140}
                            style={{ width: "100%", height: "auto", aspectRatio: "1", objectFit: "cover", display: "block" }}
                            unoptimized
                          />
                          <div style={{ padding: "5px 8px", borderTop: "1px solid var(--border)", background: isGenerated ? "#0d948808" : "var(--bg-primary)" }}>
                            <p style={{ margin: 0, fontSize: "10px", fontWeight: isGenerated ? 600 : 400, color: isGenerated ? "#0d9488" : "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {m.label}
                            </p>
                          </div>
                          {isSelected && (
                            <div style={{ position: "absolute", top: 5, right: 5, width: 20, height: 20, borderRadius: "50%", background: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Check size={11} color="#fff" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
          <Images size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p>No products found</p>
        </div>
      )}
    </div>
  );
}
