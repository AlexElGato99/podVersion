"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutGrid,
  Save,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
interface Category {
  id: string;
  name: string;
  icon: string;
  href: string;
  color: string;
}

interface CategorySettings {
  section_title: string;
  section_description: string;
  categories: Category[];
}

/* ─── Defaults ───────────────────────────────────────────── */
const DEFAULTS: CategorySettings = {
  section_title: "Shop by Category",
  section_description: "Find exactly what you're looking for",
  categories: [
    { id: "1", name: "T-Shirts",     icon: "👕", href: "/shop?category=t-shirts",     color: "from-violet-600 to-purple-600" },
    { id: "2", name: "Hoodies",      icon: "🧥", href: "/shop?category=hoodies",       color: "from-blue-600 to-cyan-600" },
    { id: "3", name: "Mugs",         icon: "☕", href: "/shop?category=mugs",          color: "from-amber-600 to-orange-600" },
    { id: "4", name: "Posters",      icon: "🖼️", href: "/shop?category=posters",      color: "from-pink-600 to-rose-600" },
    { id: "5", name: "Hats",         icon: "🎩", href: "/shop?category=hats",          color: "from-green-600 to-emerald-600" },
    { id: "6", name: "Accessories",  icon: "💎", href: "/shop?category=accessories",   color: "from-indigo-600 to-violet-600" },
  ],
};

/* ─── Gradient presets ───────────────────────────────────── */
const GRADIENT_PRESETS = [
  { label: "Violet → Purple", value: "from-violet-600 to-purple-600" },
  { label: "Blue → Cyan",     value: "from-blue-600 to-cyan-600" },
  { label: "Amber → Orange",  value: "from-amber-600 to-orange-600" },
  { label: "Pink → Rose",     value: "from-pink-600 to-rose-600" },
  { label: "Green → Emerald", value: "from-green-600 to-emerald-600" },
  { label: "Indigo → Violet", value: "from-indigo-600 to-violet-600" },
  { label: "Red → Orange",    value: "from-red-600 to-orange-600" },
  { label: "Teal → Cyan",     value: "from-teal-600 to-cyan-600" },
  { label: "Sky → Blue",      value: "from-sky-600 to-blue-600" },
  { label: "Fuchsia → Pink",  value: "from-fuchsia-600 to-pink-600" },
];

/* ─── Shared style tokens ────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--bg-secondary)",
  color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box",
};

/* ─── SectionCard ────────────────────────────────────────── */
function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, boxShadow: "var(--card-shadow)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--purple-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--purple)", flexShrink: 0 }}>
          <Icon size={16} strokeWidth={1.75} />
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────── */
export default function CategoriesSettingsPage() {
  const [settings, setSettings] = useState<CategorySettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("category_settings")
        .select("*")
        .eq("id", 1)
        .single();
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, updated_at: _u, ...rest } = data;
        setSettings({ ...DEFAULTS, ...rest });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(async () => {
    setSaving(true); setMsg(null);
    const { error } = await supabase
      .from("category_settings")
      .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });
    setSaving(false);
    setMsg(
      error
        ? { type: "error", text: error.message }
        : { type: "success", text: "Category section saved! Changes are live on the store." }
    );
    setTimeout(() => setMsg(null), 5000);
  }, [settings, supabase]);

  const set = (key: keyof CategorySettings, value: string) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const setCategory = (id: string, key: keyof Category, value: string) =>
    setSettings((s) => ({
      ...s,
      categories: s.categories.map((c) => c.id === id ? { ...c, [key]: value } : c),
    }));

  const addCategory = () => {
    const newId = Date.now().toString();
    setSettings((s) => ({
      ...s,
      categories: [
        ...s.categories,
        { id: newId, name: "New Category", icon: "🏷️", href: "/shop", color: "from-violet-600 to-purple-600" },
      ],
    }));
  };

  const removeCategory = (id: string) =>
    setSettings((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) }));

  const resetDefaults = () => setSettings(DEFAULTS);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: "var(--text-muted)" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        Loading category settings…
      </div>
    );
  }

  return (
    <div className="dashboard-root" style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Category Section Settings</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Edit the "Shop by Category" section shown on the store homepage.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={resetDefaults}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}
          >
            <RefreshCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, marginBottom: 20, border: "1px solid", fontSize: 13, fontWeight: 500, background: msg.type === "success" ? "#f0fdf4" : "#fef2f2", borderColor: msg.type === "success" ? "#bbf7d0" : "#fecaca", color: msg.type === "success" ? "#16a34a" : "#dc2626" }}>
          {msg.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Section Header */}
        <SectionCard icon={LayoutGrid} title="Section Header">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Section Title</label>
              <input
                type="text"
                value={settings.section_title}
                onChange={(e) => set("section_title", e.target.value)}
                style={inputStyle}
                placeholder="Shop by Category"
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Section Description</label>
              <input
                type="text"
                value={settings.section_description}
                onChange={(e) => set("section_description", e.target.value)}
                style={inputStyle}
                placeholder="Find exactly what you're looking for"
              />
            </div>
          </div>
        </SectionCard>

        {/* Categories */}
        <SectionCard icon={GripVertical} title="Categories">
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -10, marginBottom: 16 }}>
            Each category appears as a card with an emoji icon and a gradient background. The <strong>Link</strong> is the URL the card points to.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {settings.categories.map((cat, idx) => (
              <div
                key={cat.id}
                style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 16, background: "var(--bg-secondary)" }}
              >
                {/* Card top row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Mini preview */}
                    <div
                      style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                    >
                      {cat.icon || "?"}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--purple)" }}>Category {idx + 1}</span>
                  </div>
                  <button
                    onClick={() => removeCategory(cat.id)}
                    title="Remove category"
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, border: "1px solid #fecaca", background: "#fff1f2", color: "#dc2626", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>

                {/* Fields grid */}
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Icon (emoji)</label>
                    <input
                      type="text"
                      value={cat.icon}
                      onChange={(e) => setCategory(cat.id, "icon", e.target.value)}
                      style={{ ...inputStyle, fontSize: 18, textAlign: "center" }}
                      placeholder="👕"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Name</label>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => setCategory(cat.id, "name", e.target.value)}
                      style={inputStyle}
                      placeholder="T-Shirts"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Link URL</label>
                    <input
                      type="text"
                      value={cat.href}
                      onChange={(e) => setCategory(cat.id, "href", e.target.value)}
                      style={inputStyle}
                      placeholder="/shop?category=t-shirts"
                    />
                  </div>
                </div>

                {/* Gradient picker */}
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Icon Gradient</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {GRADIENT_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        title={preset.label}
                        onClick={() => setCategory(cat.id, "color", preset.value)}
                        style={{
                          width: 28, height: 28, borderRadius: 7, cursor: "pointer",
                          border: cat.color === preset.value ? "2px solid var(--purple)" : "2px solid transparent",
                          outline: cat.color === preset.value ? "2px solid var(--purple-light)" : "none",
                          padding: 0,
                          background: getPreviewGradient(preset.value),
                          transition: "all 0.12s",
                        }}
                      />
                    ))}
                    {/* Custom value input */}
                    <input
                      type="text"
                      value={cat.color}
                      onChange={(e) => setCategory(cat.id, "color", e.target.value)}
                      style={{ ...inputStyle, flex: 1, minWidth: 180, fontSize: 11 }}
                      placeholder="from-violet-600 to-purple-600"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add category button */}
          <button
            onClick={addCategory}
            style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 16, padding: "9px 16px", borderRadius: 8, border: "1.5px dashed var(--purple)", background: "var(--purple-light)", color: "var(--purple)", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%", justifyContent: "center" }}
          >
            <Plus size={15} /> Add Category
          </button>
        </SectionCard>

      </div>

      {/* Bottom save bar */}
      <div style={{ marginTop: 28, padding: "16px 20px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, boxShadow: "var(--card-shadow)" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Changes go live on the store homepage immediately after saving.</p>
        <button
          onClick={save}
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 8, border: "none", background: saving ? "var(--text-muted)" : "var(--purple)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
        >
          {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */
function getPreviewGradient(tailwindGradient: string): string {
  const map: Record<string, string> = {
    "from-violet-600 to-purple-600":  "linear-gradient(135deg, #7c3aed, #9333ea)",
    "from-blue-600 to-cyan-600":      "linear-gradient(135deg, #2563eb, #0891b2)",
    "from-amber-600 to-orange-600":   "linear-gradient(135deg, #d97706, #ea580c)",
    "from-pink-600 to-rose-600":      "linear-gradient(135deg, #db2777, #e11d48)",
    "from-green-600 to-emerald-600":  "linear-gradient(135deg, #16a34a, #059669)",
    "from-indigo-600 to-violet-600":  "linear-gradient(135deg, #4f46e5, #7c3aed)",
    "from-red-600 to-orange-600":     "linear-gradient(135deg, #dc2626, #ea580c)",
    "from-teal-600 to-cyan-600":      "linear-gradient(135deg, #0d9488, #0891b2)",
    "from-sky-600 to-blue-600":       "linear-gradient(135deg, #0284c7, #2563eb)",
    "from-fuchsia-600 to-pink-600":   "linear-gradient(135deg, #c026d3, #db2777)",
  };
  return map[tailwindGradient] ?? "linear-gradient(135deg, #7c3aed, #9333ea)";
}
