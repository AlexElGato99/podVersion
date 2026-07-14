"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutGrid, Save, Loader2, Plus, Trash2, GripVertical,
  CheckCircle2, AlertCircle, RefreshCcw, Type, Download, ExternalLink, Upload,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
interface Category {
  id: string;
  name: string;
  image_url: string;
  href: string;
}

interface CategorySettings {
  section_title: string;
  section_description: string;
  categories: Category[];
}

interface PrintfulCategory {
  id: number;
  parent_id: number;
  title: string;
  image_url: string;
}

/* ─── Real Printful category image URLs (by ID) ─────────── */
const CATEGORY_IMAGES: Record<string, string> = {
  "1":   "https://files.cdn.printful.com/o/upload/catalog_category/fb/fbf0cf796a5603666e85713ece1708a1_t?v=1764596927",
  "2":   "https://files.cdn.printful.com/o/upload/catalog_category/04/04140d7cd1565012645092fc8f1d8632_t?v=1764596927",
  "3":   "https://files.cdn.printful.com/o/upload/catalog_category/96/96e91feb26f0b28ba821534bb0d5478b_t?v=1764596927",
  "4":   "https://files.cdn.printful.com/o/upload/catalog_category/b1/b1e86be07423274b27b55561ddc6eee9_t?v=1764596927",
  "5":   "https://files.cdn.printful.com/o/upload/catalog_category/77/7776d01e716d80e3ffbdebbf3db6b198_t?v=1764596927",
  "93":  "https://files.cdn.printful.com/o/upload/catalog_category/0c/0c38c3b13be79b5f8e1f2f1dccf62115_t?v=1764596927",
  "116": "https://files.cdn.printful.com/o/upload/catalog_category/9e/9ed797fbbdac07a98f6fdfa06a9f6c8f_t?v=1764596928",
};

function resolveCategoryImage(cat: PrintfulCategory): string {
  if (cat.image_url && cat.image_url.startsWith("http")) return cat.image_url;
  return CATEGORY_IMAGES[String(cat.id)] ?? "";
}

/* ─── Defaults ───────────────────────────────────────────── */
const DEFAULTS: CategorySettings = {
  section_title: "Shop by Category",
  section_description: "Find exactly what you're looking for",
  categories: [],
};

/* ─── Shared style tokens ────────────────────────────────── */
const inp: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--bg-secondary)",
  color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box",
};

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
  const [importing, setImporting] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [printfulCats, setPrintfulCats] = useState<PrintfulCategory[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("category_settings").select("*").eq("id", 1).single();
      if (data) {
        const { id: _id, updated_at: _u, ...rest } = data;
        setSettings({ ...DEFAULTS, ...rest });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const importFromPrintful = useCallback(async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/printful-categories");
      const json = await res.json();
      const top = (json.categories as PrintfulCategory[])
        .filter((c) => c.parent_id === 0 && c.id !== 159 && c.id !== 277)
        .slice(0, 10);
      setPrintfulCats(top);
      setShowPicker(true);
    } catch {
      setMsg({ type: "error", text: "Failed to fetch Printful categories." });
    } finally {
      setImporting(false);
    }
  }, []);

  const seedFromPrintful = useCallback(async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/printful-categories");
      const json = await res.json();
      const top = (json.categories as PrintfulCategory[])
        .filter((c) => c.parent_id === 0 && c.id !== 159 && c.id !== 277)
        .slice(0, 7);
      const seeded = top.map((c) => ({
        id: String(c.id),
        name: c.title,
        image_url: resolveCategoryImage(c),
        href: `/shop?category=${encodeURIComponent(c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`,
      }));
      const newSettings = { ...settings, categories: seeded };
      setSettings(newSettings);
      // Save to DB immediately
      setSaving(true);
      const { error } = await supabase.from("category_settings").upsert({ id: 1, ...newSettings, updated_at: new Date().toISOString() });
      setSaving(false);
      setMsg(error
        ? { type: "error", text: error.message }
        : { type: "success", text: `Seeded ${seeded.length} categories from Printful and saved. You can now edit them below.` });
      setTimeout(() => setMsg(null), 6000);
    } catch {
      setMsg({ type: "error", text: "Failed to seed from Printful." });
    } finally {
      setImporting(false);
    }
  }, [settings, supabase]);

  const pickPrintfulCategory = (cat: PrintfulCategory) => {
    const slug = cat.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newCat: Category = {
      id: String(cat.id),
      name: cat.title,
      image_url: resolveCategoryImage(cat),
      href: `/shop?category=${encodeURIComponent(slug)}`,
    };
    setSettings((s) => {
      if (s.categories.find((c) => c.id === newCat.id)) return s; // already added
      return { ...s, categories: [...s.categories, newCat] };
    });
  };

  const save = useCallback(async () => {
    setSaving(true); setMsg(null);
    const { error } = await supabase.from("category_settings").upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });
    setSaving(false);
    setMsg(error ? { type: "error", text: error.message } : { type: "success", text: "Categories saved! Changes are live on the store." });
    setTimeout(() => setMsg(null), 5000);
  }, [settings, supabase]);

  const uploadImage = useCallback(async (catId: string, file: File) => {
    setUploadingId(catId);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("catId", catId);
      const res = await fetch("/api/upload-category-image", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setCat(catId, "image_url", json.url);
    } catch (e) {
      setMsg({ type: "error", text: `Upload failed: ${(e as Error).message}` });
      setTimeout(() => setMsg(null), 5000);
    } finally {
      setUploadingId(null);
    }
  }, []);

  const set = (key: keyof CategorySettings, value: string) => setSettings((s) => ({ ...s, [key]: value }));
  const setCat = (id: string, key: keyof Category, value: string) =>
    setSettings((s) => ({ ...s, categories: s.categories.map((c) => c.id === id ? { ...c, [key]: value } : c) }));
  const removeCat = (id: string) => setSettings((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) }));
  const addBlank = () => setSettings((s) => ({
    ...s,
    categories: [...s.categories, { id: Date.now().toString(), name: "New Category", image_url: "", href: "/shop" }],
  }));

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
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Manage the &quot;Shop by Category&quot; section on the homepage. Import from Printful or add custom categories.
          </p>
        </div>

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
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Section Title</label>
              <input type="text" value={settings.section_title} onChange={(e) => set("section_title", e.target.value)} style={inp} placeholder="Shop by Category" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Section Description</label>
              <input type="text" value={settings.section_description} onChange={(e) => set("section_description", e.target.value)} style={inp} placeholder="Find exactly what you're looking for" />
            </div>
          </div>
        </SectionCard>

        {/* Categories list */}
        <SectionCard icon={GripVertical} title={`Categories (${settings.categories.length})`}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -10, marginBottom: 16 }}>
            Each category shows a square image. Paste any image URL or upload from computer. The live preview below matches exactly how it looks on the homepage.
          </p>



          {/* ── Edit cards ─────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {settings.categories.map((cat, idx) => (
              <div key={cat.id} style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg-secondary)" }}>

                {/* Header row with square preview */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-primary)" }}>
                  {/* Square preview — same aspect-ratio as frontend */}
                  <div style={{ position: "relative", width: 72, height: 72, borderRadius: 14, overflow: "hidden", background: "#f4f4f5", border: "1px solid #e4e4e7", flexShrink: 0 }}>
                    {cat.image_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={cat.image_url} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#94a3b8" }}>🖼️</div>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>#{idx + 1} — {cat.name || "Untitled"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{cat.href || "No link set"}</div>
                  </div>
                  <button onClick={() => removeCat(cat.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: "1px solid #fecaca", background: "#fff1f2", color: "#dc2626", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                    <Trash2 size={11} /> Remove
                  </button>
                </div>

                {/* Fields */}
                <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 5 }}>Name</label>
                    <input type="text" value={cat.name} onChange={(e) => setCat(cat.id, "name", e.target.value)} style={inp} placeholder="T-Shirts" />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 5 }}>Link URL</label>
                    <input type="text" value={cat.href} onChange={(e) => setCat(cat.id, "href", e.target.value)} style={inp} placeholder="/shop?category=t-shirts" />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 5 }}>Image</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="text" value={cat.image_url} onChange={(e) => setCat(cat.id, "image_url", e.target.value)} style={{ ...inp, flex: 1 }} placeholder="Paste URL or upload from computer →" />
                      <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: uploadingId === cat.id ? "#f1f5f9" : "var(--bg-primary)", color: uploadingId === cat.id ? "var(--text-muted)" : "var(--text-primary)", fontSize: 12, fontWeight: 600, cursor: uploadingId === cat.id ? "wait" : "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {uploadingId === cat.id
                          ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Uploading…</>
                          : <><Upload size={13} /> Upload image</>}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          disabled={uploadingId !== null}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(cat.id, f); e.target.value = ""; }}
                        />
                      </label>
                    </div>
                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Uploaded images are stored in Supabase Storage. Editing the URL overrides the upload.</p>
                  </div>
                  {cat.href && (
                    <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                      <a href={cat.href} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--purple)", fontSize: 12, fontWeight: 500, textDecoration: "none" }}>
                        <ExternalLink size={12} /> View in store
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button onClick={addBlank} style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 14, padding: "10px 0", borderRadius: 9, border: "1.5px dashed var(--purple)", background: "var(--purple-light)", color: "var(--purple)", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%", justifyContent: "center" }}>
            <Plus size={15} /> Add Custom Category
          </button>
        </SectionCard>

      </div>

      {/* Save bar */}
      <div style={{ marginTop: 28, padding: "16px 20px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, boxShadow: "var(--card-shadow)" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Changes go live on the store homepage immediately after saving.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setSettings(DEFAULTS)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>
            <RefreshCcw size={13} /> Reset
          </button>
          <button onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 8, border: "none", background: saving ? "var(--text-muted)" : "var(--purple)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

    </div>
  );
}