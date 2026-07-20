"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LayoutTemplate,
  Save,
  Loader2,
  Eye,
  EyeOff,
  GripVertical,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  RotateCcw,
  Check,
  Tag,
} from "lucide-react";

/* ─── Types ────────────────────────────────────────────────── */
interface HomepageSection {
  key: string;
  label: string;
  subtitle: string;
  shop_slug: string;
  is_visible: boolean;
  max_products: number;
  sort_order: number;
  bg: "white" | "zinc";
  badge_first?: string;
  badge_second?: string;
  updated_at?: string;
}

/* ─── Defaults (mirrors the hardcoded PRODUCT_CATEGORIES) ─── */
const SECTION_DEFAULTS: HomepageSection[] = [
  { key: "tshirts",  label: "Custom T-Shirts & Graphic Tees",    subtitle: "Premium unisex tees with vibrant DTG prints",        shop_slug: "t-shirt",  is_visible: true,  max_products: 6, sort_order: 0, bg: "white" },
  { key: "hoodies",  label: "Hoodies & Sweatshirts",             subtitle: "Cozy custom hoodies — perfect for every season",     shop_slug: "hoodie",   is_visible: true,  max_products: 6, sort_order: 1, bg: "zinc"  },
  { key: "mugs",     label: "Custom Mugs & Drinkware",           subtitle: "Start your morning with your favourite design",      shop_slug: "mug",      is_visible: true,  max_products: 6, sort_order: 2, bg: "white" },
  { key: "stickers", label: "Stickers & Decals",                 subtitle: "Waterproof, fade-resistant custom stickers",        shop_slug: "sticker",  is_visible: true,  max_products: 6, sort_order: 3, bg: "zinc"  },
  { key: "caps",     label: "Caps & Hats",                       subtitle: "Structured & unstructured caps for every style",    shop_slug: "cap",      is_visible: true,  max_products: 6, sort_order: 4, bg: "white" },
  { key: "wallart",  label: "Canvas Prints & Wall Art",          subtitle: "Stretched canvas, posters, framed art and statement decor", shop_slug: "canvas", is_visible: true,  max_products: 6, sort_order: 5, bg: "zinc"  },
  { key: "other",    label: "Accessories & More",                subtitle: "Phone cases, tote bags and everyday extras",        shop_slug: "",         is_visible: true,  max_products: 6, sort_order: 6, bg: "white" },
];

const BADGE_OPTIONS = ["", "New", "Bestseller", "Popular", "Sale", "Limited", "Hot"] as const;

/* ─── Style helpers ─────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page:    { padding: "24px" },
  card:    { background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "10px" },
  label:   { display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  input:   { width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" },
  btn:     { display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none", transition: "opacity 0.15s" },
  btnPrimary: { background: "#ea580c", color: "#fff" },
  btnGhost:   { background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)" },
};

const KEY_LABELS: Record<string, string> = {
  tshirts: "T-Shirts",
  hoodies: "Hoodies",
  mugs: "Mugs",
  stickers: "Stickers",
  caps: "Caps",
  wallart: "Wall Art",
  other: "Other / Accessories",
};

/* ─── Main Component ──────────────────────────────────────── */
export default function HomepageSectionsPage() {
  const [sections, setSections] = useState<HomepageSection[]>(SECTION_DEFAULTS);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>("tshirts");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/homepage-sections");
      const data = await res.json();
      if (data.sections?.length > 0) {
        // Merge API data over defaults (preserves any new default keys not yet in DB)
        const merged = SECTION_DEFAULTS.map((def) => {
          const saved = data.sections.find((s: HomepageSection) => s.key === def.key);
          return saved ? { ...def, ...saved } : def;
        });
        setSections(merged);
      }
    } catch { /* keep defaults */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function update(key: string, patch: Partial<HomepageSection>) {
    setSections((prev) => prev.map((s) => s.key === key ? { ...s, ...patch } : s));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setSections((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((s, i) => ({ ...s, sort_order: i }));
    });
  }

  function moveDown(idx: number) {
    setSections((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((s, i) => ({ ...s, sort_order: i }));
    });
  }

  function resetSection(key: string) {
    const def = SECTION_DEFAULTS.find((d) => d.key === key);
    if (def) update(key, { ...def });
  }

  async function saveAll() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/homepage-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sections),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save homepage sections");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: "var(--text-muted)" }}>
        <Loader2 size={22} className="animate-spin" />
        <span style={{ marginLeft: 10 }}>Loading sections…</span>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 36, height: 36, borderRadius: "10px", background: "#ea580c22", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LayoutTemplate size={18} color="#ea580c" />
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Homepage Sections</h1>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
              Configure product category sections shown on the homepage
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{ ...s.btn, ...s.btnGhost }} onClick={load}>
            <RefreshCw size={13} /> Reload
          </button>
          <button
            style={{ ...s.btn, ...(saved ? { background: "#0d9488", color: "#fff" } : s.btnPrimary), minWidth: 120, justifyContent: "center" }}
            onClick={saveAll}
            disabled={saving}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
            {saved ? "Saved!" : saving ? "Saving…" : "Save All Sections"}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", fontSize: "12px", color: "var(--text-secondary)" }}>
        <strong style={{ color: "var(--text-primary)" }}>How it works:</strong> Each section pulls products from your Printful catalog matched by type. Hidden sections are not rendered on the homepage. Drag order buttons reorder sections. Changes take effect immediately after saving.
      </div>

      {saveError && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", fontSize: "12px", color: "#b91c1c" }}>
          <strong>Save failed:</strong> {saveError}
        </div>
      )}

      {/* Section cards */}
      {sections.map((sec, idx) => {
        const isExpanded = expandedKey === sec.key;
        return (
          <div key={sec.key} style={{ ...s.card, opacity: sec.is_visible ? 1 : 0.55 }}>
            {/* Row header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Order buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
                <button
                  style={{ ...s.btn, ...s.btnGhost, padding: "3px 6px", opacity: idx === 0 ? 0.3 : 1 }}
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  title="Move up"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  style={{ ...s.btn, ...s.btnGhost, padding: "3px 6px", opacity: idx === sections.length - 1 ? 0.3 : 1 }}
                  onClick={() => moveDown(idx)}
                  disabled={idx === sections.length - 1}
                  title="Move down"
                >
                  <ChevronDown size={12} />
                </button>
              </div>

              {/* Sort order badge */}
              <div style={{ width: 28, height: 28, borderRadius: "8px", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", flexShrink: 0 }}>
                {idx + 1}
              </div>
              <GripVertical size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setExpandedKey(isExpanded ? null : sec.key)}>
                <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: 0, fontSize: "14px" }}>
                  {sec.label}
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {sec.subtitle}
                </p>
              </div>

              {/* Status chips */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Max {sec.max_products} products
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: 600, background: sec.is_visible ? "#0d948820" : "var(--bg-tertiary)", color: sec.is_visible ? "#0d9488" : "var(--text-muted)", border: `1px solid ${sec.is_visible ? "#0d948840" : "var(--border)"}` }}>
                  {sec.is_visible ? <Eye size={10} /> : <EyeOff size={10} />}
                  {sec.is_visible ? "Visible" : "Hidden"}
                </span>
              </div>

              {/* Expand toggle */}
              <button
                style={{ ...s.btn, ...s.btnGhost, padding: "5px 8px" }}
                onClick={() => setExpandedKey(isExpanded ? null : sec.key)}
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {/* Expanded panel */}
            {isExpanded && (
              <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "18px" }}>

                {/* Row 1: Label + Subtitle */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={s.label}>Section Heading</label>
                    <input
                      style={s.input}
                      value={sec.label}
                      onChange={(e) => update(sec.key, { label: e.target.value })}
                      placeholder="e.g. Custom T-Shirts & Graphic Tees"
                    />
                  </div>
                  <div>
                    <label style={s.label}>Subtitle / Description</label>
                    <input
                      style={s.input}
                      value={sec.subtitle}
                      onChange={(e) => update(sec.key, { subtitle: e.target.value })}
                      placeholder="e.g. Premium unisex tees with vibrant DTG prints"
                    />
                  </div>
                </div>

                {/* Row 2: Shop slug + Max products + BG */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 160px", gap: "16px" }}>
                  <div>
                    <label style={s.label}>&quot;See All&quot; Link Slug</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>/shop?category=</span>
                      <input
                        style={{ ...s.input }}
                        value={sec.shop_slug}
                        onChange={(e) => update(sec.key, { shop_slug: e.target.value })}
                        placeholder="t-shirt"
                      />
                    </div>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Leave blank to link to /shop</p>
                  </div>
                  <div>
                    <label style={s.label}>Max Products</label>
                    <select
                      style={s.input}
                      value={sec.max_products}
                      onChange={(e) => update(sec.key, { max_products: parseInt(e.target.value) })}
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <option key={n} value={n}>{n} products</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Section Background</label>
                    <select
                      style={s.input}
                      value={sec.bg}
                      onChange={(e) => update(sec.key, { bg: e.target.value as "white" | "zinc" })}
                    >
                      <option value="white">White</option>
                      <option value="zinc">Light grey (zinc-50)</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Badges for first 2 products */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={s.label}>
                      <Tag size={11} style={{ display: "inline", marginRight: "4px" }} />
                      Badge — 1st Product
                    </label>
                    <select
                      style={s.input}
                      value={sec.badge_first ?? ""}
                      onChange={(e) => update(sec.key, { badge_first: e.target.value })}
                    >
                      {BADGE_OPTIONS.map((b) => (
                        <option key={b} value={b}>{b || "— None —"}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>
                      <Tag size={11} style={{ display: "inline", marginRight: "4px" }} />
                      Badge — 2nd Product
                    </label>
                    <select
                      style={s.input}
                      value={sec.badge_second ?? ""}
                      onChange={(e) => update(sec.key, { badge_second: e.target.value })}
                    >
                      {BADGE_OPTIONS.map((b) => (
                        <option key={b} value={b}>{b || "— None —"}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 4: Visibility toggle + Reset */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                  <button
                    style={{ ...s.btn, background: sec.is_visible ? "#ef444418" : "#0d948818", color: sec.is_visible ? "#ef4444" : "#0d9488", border: `1px solid ${sec.is_visible ? "#ef444430" : "#0d948830"}` }}
                    onClick={() => update(sec.key, { is_visible: !sec.is_visible })}
                  >
                    {sec.is_visible ? <EyeOff size={13} /> : <Eye size={13} />}
                    {sec.is_visible ? "Hide this section" : "Show this section"}
                  </button>
                  <button
                    style={{ ...s.btn, ...s.btnGhost, fontSize: "12px" }}
                    onClick={() => resetSection(sec.key)}
                  >
                    <RotateCcw size={12} />
                    Reset to defaults
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom save */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
        <button
          style={{ ...s.btn, ...(saved ? { background: "#0d9488", color: "#fff" } : s.btnPrimary), minWidth: 140, justifyContent: "center" }}
          onClick={saveAll}
          disabled={saving}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
          {saved ? "All Saved!" : saving ? "Saving…" : "Save All Sections"}
        </button>
      </div>
    </div>
  );
}
