"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  Type,
  ImagePlus,
  Upload,
  X,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
interface Category {
  id: string;
  name: string;
  icon: string;
  icon_url: string;
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
    { id: "1", name: "T-Shirts",    icon: "👕", icon_url: "", href: "/shop?category=t-shirts",    color: "from-violet-600 to-purple-600" },
    { id: "2", name: "Hoodies",     icon: "🧥", icon_url: "", href: "/shop?category=hoodies",      color: "from-blue-600 to-cyan-600" },
    { id: "3", name: "Mugs",        icon: "☕", icon_url: "", href: "/shop?category=mugs",         color: "from-amber-600 to-orange-600" },
    { id: "4", name: "Posters",     icon: "🖼️", icon_url: "", href: "/shop?category=posters",     color: "from-pink-600 to-rose-600" },
    { id: "5", name: "Hats",        icon: "🎩", icon_url: "", href: "/shop?category=hats",         color: "from-green-600 to-emerald-600" },
    { id: "6", name: "Accessories", icon: "💎", icon_url: "", href: "/shop?category=accessories",  color: "from-indigo-600 to-violet-600" },
  ],
};

/* ─── Gradient presets ───────────────────────────────────── */
const GRADIENT_PRESETS: { label: string; value: string; css: string }[] = [
  { label: "Violet → Purple", value: "from-violet-600 to-purple-600",  css: "linear-gradient(135deg,#7c3aed,#9333ea)" },
  { label: "Blue → Cyan",     value: "from-blue-600 to-cyan-600",      css: "linear-gradient(135deg,#2563eb,#0891b2)" },
  { label: "Amber → Orange",  value: "from-amber-600 to-orange-600",   css: "linear-gradient(135deg,#d97706,#ea580c)" },
  { label: "Pink → Rose",     value: "from-pink-600 to-rose-600",      css: "linear-gradient(135deg,#db2777,#e11d48)" },
  { label: "Green → Emerald", value: "from-green-600 to-emerald-600",  css: "linear-gradient(135deg,#16a34a,#059669)" },
  { label: "Indigo → Violet", value: "from-indigo-600 to-violet-600",  css: "linear-gradient(135deg,#4f46e5,#7c3aed)" },
  { label: "Red → Orange",    value: "from-red-600 to-orange-600",     css: "linear-gradient(135deg,#dc2626,#ea580c)" },
  { label: "Teal → Cyan",     value: "from-teal-600 to-cyan-600",      css: "linear-gradient(135deg,#0d9488,#0891b2)" },
  { label: "Sky → Blue",      value: "from-sky-600 to-blue-600",       css: "linear-gradient(135deg,#0284c7,#2563eb)" },
  { label: "Fuchsia → Pink",  value: "from-fuchsia-600 to-pink-600",   css: "linear-gradient(135deg,#c026d3,#db2777)" },
];

/* ─── Shared style tokens ────────────────────────────────── */
const inp: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--bg-secondary)",
  color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box",
};

/* ─── SectionCard ────────────────────────────────────────── */
function SectionCard({
  icon: Icon, title, children,
}: { icon: React.ElementType; title: string; children: React.ReactNode }) {
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

/* ─── Field ──────────────────────────────────────────────── */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

/* ─── IconUploader ───────────────────────────────────────── */
function IconUploader({
  currentUrl, catId, token, onUploaded,
}: {
  currentUrl: string; catId: string; token: string; onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = useCallback(async (file: File) => {
    setUploading(true); setErr(null); setProgress("Converting to WebP…");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("slot", `category-icon-${catId}`);
    try {
      const res = await fetch("/api/upload-hero-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setProgress(`Done · ${json.original_size_kb}KB → ${json.size_kb}KB WebP`);
      onUploaded(json.url);
      setTimeout(() => setProgress(null), 4000);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  }, [catId, token, onUploaded]);

  const onFile = (files: FileList | null) => { if (files?.[0]) upload(files[0]); };

  return (
    <div>
      {currentUrl ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentUrl} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)", background: "#f8fafc" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button onClick={() => inputRef.current?.click()} disabled={uploading} style={{ fontSize: 11, color: "var(--purple)", cursor: "pointer", background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
              <Upload size={11} /> Replace
            </button>
            <button onClick={() => onUploaded("")} style={{ fontSize: 11, color: "#dc2626", cursor: "pointer", background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
              <X size={11} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files); }}
          onClick={() => !uploading && inputRef.current?.click()}
          style={{ border: `2px dashed ${dragOver ? "var(--purple)" : "var(--border)"}`, borderRadius: 10, padding: "12px 10px", textAlign: "center", cursor: uploading ? "wait" : "pointer", background: dragOver ? "var(--purple-light)" : "var(--bg-secondary)", transition: "all 0.15s" }}
        >
          {uploading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <Loader2 size={16} color="var(--purple)" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{progress}</span>
            </div>
          ) : (
            <>
              <ImagePlus size={18} color="var(--text-muted)" style={{ margin: "0 auto 4px" }} />
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Click or drag image</p>
            </>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onFile(e.target.files)} />
      {err && <p style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{err}</p>}
      {progress && !uploading && <p style={{ fontSize: 11, color: "var(--accent-dark)", marginTop: 4 }}>{progress}</p>}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────── */
export default function CategoriesSettingsPage() {
  const [settings, setSettings] = useState<CategorySettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [token, setToken] = useState("");

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) setToken(session.access_token);

      const { data } = await supabase.from("category_settings").select("*").eq("id", 1).single();
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, updated_at: _u, ...rest } = data;
        const merged: CategorySettings = { ...DEFAULTS, ...rest };
        merged.categories = (merged.categories || []).map((c: Category) => ({ icon_url: "", ...c }));
        setSettings(merged);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(async () => {
    setSaving(true); setMsg(null);
    const { error } = await supabase.from("category_settings").upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });
    setSaving(false);
    setMsg(error ? { type: "error", text: error.message } : { type: "success", text: "Categories saved! Changes are live on the store." });
    setTimeout(() => setMsg(null), 5000);
  }, [settings, supabase]);

  const set = (key: keyof CategorySettings, value: string) => setSettings((s) => ({ ...s, [key]: value }));
  const setCategory = (id: string, key: keyof Category, value: string) =>
    setSettings((s) => ({ ...s, categories: s.categories.map((c) => c.id === id ? { ...c, [key]: value } : c) }));
  const addCategory = () => {
    const newId = Date.now().toString();
    setSettings((s) => ({ ...s, categories: [...s.categories, { id: newId, name: "New Category", icon: "🏷️", icon_url: "", href: "/shop", color: "from-violet-600 to-purple-600" }] }));
  };
  const removeCategory = (id: string) => setSettings((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) }));

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: "var(--text-muted)" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> Loading category settings…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Category Section</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Edit the &quot;Shop by Category&quot; section on the store homepage.</p>
        </div>
        <button onClick={() => setSettings(DEFAULTS)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>
          <RefreshCcw size={13} /> Reset defaults
        </button>
      </div>

      {/* Toast */}
      {msg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, marginBottom: 20, border: "1px solid", fontSize: 13, fontWeight: 500, background: msg.type === "success" ? "#f0fdf4" : "#fef2f2", borderColor: msg.type === "success" ? "#bbf7d0" : "#fecaca", color: msg.type === "success" ? "#16a34a" : "#dc2626" }}>
          {msg.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {msg.text}
        </div>
      )}

      <div style={{ display: "grid", gap: 20 }}>

        {/* Section Header */}
        <SectionCard icon={Type} title="Section Header">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Section Title">
              <input type="text" value={settings.section_title} onChange={(e) => set("section_title", e.target.value)} style={inp} placeholder="Shop by Category" />
            </Field>
            <Field label="Section Description">
              <input type="text" value={settings.section_description} onChange={(e) => set("section_description", e.target.value)} style={inp} placeholder="Find exactly what you're looking for" />
            </Field>
          </div>
        </SectionCard>

        {/* Categories */}
        <SectionCard icon={GripVertical} title="Categories">
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -10, marginBottom: 20 }}>
            Each card shows an <strong>uploaded icon image</strong> or falls back to the <strong>emoji</strong>. Upload a PNG / SVG / WebP icon for the best look.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {settings.categories.map((cat, idx) => (
              <div key={cat.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 18, background: "var(--bg-secondary)" }}>

                {/* Row header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, overflow: "hidden" }}>
                      {cat.icon_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={cat.icon_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : cat.icon || "?"}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--purple)" }}>Category {idx + 1}</span>
                  </div>
                  <button onClick={() => removeCategory(cat.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, border: "1px solid #fecaca", background: "#fff1f2", color: "#dc2626", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    <Trash2 size={12} /> Remove
                  </button>
                </div>

                {/* Fields */}
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr", gap: 14, alignItems: "start" }}>

                  {/* Icon upload */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Icon Image</label>
                    <IconUploader currentUrl={cat.icon_url} catId={cat.id} token={token} onUploaded={(url) => setCategory(cat.id, "icon_url", url)} />
                    <div style={{ marginTop: 8 }}>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Emoji fallback</label>
                      <input type="text" value={cat.icon} onChange={(e) => setCategory(cat.id, "icon", e.target.value)} style={{ ...inp, fontSize: 18, textAlign: "center" }} placeholder="👕" />
                    </div>
                  </div>

                  {/* Name + Link */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Category Name</label>
                      <input type="text" value={cat.name} onChange={(e) => setCategory(cat.id, "name", e.target.value)} style={inp} placeholder="T-Shirts" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Link URL</label>
                      <input type="text" value={cat.href} onChange={(e) => setCategory(cat.id, "href", e.target.value)} style={inp} placeholder="/shop?category=t-shirts" />
                    </div>
                  </div>

                  {/* Gradient */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Icon Background Gradient</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {GRADIENT_PRESETS.map((p) => (
                        <button key={p.value} title={p.label} onClick={() => setCategory(cat.id, "color", p.value)} style={{ width: 26, height: 26, borderRadius: 6, cursor: "pointer", padding: 0, background: p.css, border: cat.color === p.value ? "2px solid var(--purple)" : "2px solid transparent", outline: cat.color === p.value ? "2px solid var(--purple-light)" : "none", transition: "all 0.12s" }} />
                      ))}
                    </div>
                    <input type="text" value={cat.color} onChange={(e) => setCategory(cat.id, "color", e.target.value)} style={{ ...inp, fontSize: 11 }} placeholder="from-violet-600 to-purple-600" />
                    <div style={{ marginTop: 6, height: 8, borderRadius: 6, background: GRADIENT_PRESETS.find(p => p.value === cat.color)?.css ?? "linear-gradient(135deg,#7c3aed,#9333ea)" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addCategory} style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 16, padding: "10px 0", borderRadius: 9, border: "1.5px dashed var(--purple)", background: "var(--purple-light)", color: "var(--purple)", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%", justifyContent: "center" }}>
            <Plus size={15} /> Add Category
          </button>
        </SectionCard>

      </div>

      {/* Save bar */}
      <div style={{ marginTop: 28, padding: "16px 20px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, boxShadow: "var(--card-shadow)" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Changes go live on the store homepage immediately after saving.</p>
        <button onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 8, border: "none", background: saving ? "var(--text-muted)" : "var(--purple)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

    </div>
  );
}
