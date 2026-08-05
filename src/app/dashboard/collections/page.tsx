"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Save, Loader2, Plus, Trash2, Layers,
  CheckCircle2, AlertCircle, RefreshCcw,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
interface CollectionDef {
  id: string;
  label: string;
  /** Comma-separated in the UI, stored as an array. A product matches this
   *  collection if its name contains any of these (case-insensitive). */
  keywords: string[];
}

const DEFAULT_COLLECTIONS: CollectionDef[] = [];

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

export default function CollectionsSettingsPage() {
  const [collections, setCollections] = useState<CollectionDef[]>(DEFAULT_COLLECTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [usingDefaults, setUsingDefaults] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("collections_settings").select("collections").eq("id", 1).single();
      const saved = (data?.collections ?? []) as CollectionDef[];
      if (saved.length > 0) {
        setCollections(saved);
        setUsingDefaults(false);
      } else {
        setUsingDefaults(true);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(async () => {
    setSaving(true); setMsg(null);
    const cleaned = collections
      .map((c) => ({ ...c, label: c.label.trim(), keywords: c.keywords.map((k) => k.trim()).filter(Boolean) }))
      .filter((c) => c.label && c.keywords.length > 0);
    const { error } = await supabase.from("collections_settings").upsert({ id: 1, collections: cleaned, updated_at: new Date().toISOString() });
    setSaving(false);
    if (!error) { setCollections(cleaned); setUsingDefaults(cleaned.length === 0); }
    setMsg(error ? { type: "error", text: error.message } : { type: "success", text: "Collections saved! Changes are live on /collections." });
    setTimeout(() => setMsg(null), 5000);
  }, [collections, supabase]);

  const setCol = (id: string, key: "label", value: string) =>
    setCollections((c) => c.map((col) => col.id === id ? { ...col, [key]: value } : col));
  const setKeywords = (id: string, raw: string) =>
    setCollections((c) => c.map((col) => col.id === id ? { ...col, keywords: raw.split(",").map((k) => k.replace(/^\s+/, "")) } : col));
  const removeCol = (id: string) => setCollections((c) => c.filter((col) => col.id !== id));
  const addBlank = () => setCollections((c) => [...c, { id: crypto.randomUUID(), label: "New Collection", keywords: [] }]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: "var(--text-muted)" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> Loading collections…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Collections</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          Manage the collections shown on <code>/collections</code>. Each collection is a label plus keywords —
          any product whose name contains one of those keywords is grouped into it automatically, so collections
          keep updating themselves as you add or remove products. No per-product tagging needed.
        </p>
      </div>

      {usingDefaults && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, marginBottom: 20, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontSize: 13 }}>
          No custom collections saved yet — <code>/collections</code> is currently using its built-in defaults
          (Retirement Gifts, Healthcare &amp; Therapy, Floral Designs, etc.). Add collections below and save to take over.
        </div>
      )}

      {/* Toast */}
      {msg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, marginBottom: 20, border: "1px solid", fontSize: 13, fontWeight: 500, background: msg.type === "success" ? "#f0fdf4" : "#fef2f2", borderColor: msg.type === "success" ? "#bbf7d0" : "#fecaca", color: msg.type === "success" ? "#16a34a" : "#dc2626" }}>
          {msg.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {msg.text}
        </div>
      )}

      <SectionCard icon={Layers} title={`Collections (${collections.length})`}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -10, marginBottom: 16 }}>
          Collections are shown largest-first — whichever two have the most matching products become the big
          featured cards at the top, the rest fill the grid below. A collection with fewer than 2 matching
          products is folded into a general &quot;Novelty &amp; Gifts&quot; group instead of showing as a sparse tile.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {collections.map((col, idx) => (
            <div key={col.id} style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg-secondary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-primary)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>#{idx + 1} — {col.label || "Untitled"}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {col.keywords.length > 0 ? col.keywords.join(", ") : "No keywords set"}
                  </div>
                </div>
                <button onClick={() => removeCol(col.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: "1px solid #fecaca", background: "#fff1f2", color: "#dc2626", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                  <Trash2 size={11} /> Remove
                </button>
              </div>

              <div style={{ padding: 14, display: "grid", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 5 }}>Label</label>
                  <input type="text" value={col.label} onChange={(e) => setCol(col.id, "label", e.target.value)} style={inp} placeholder="Retirement Gifts" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 5 }}>Keywords</label>
                  <input
                    type="text"
                    value={col.keywords.join(", ")}
                    onChange={(e) => setKeywords(col.id, e.target.value)}
                    style={inp}
                    placeholder="retire, retirement, retired"
                  />
                  <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                    Comma-separated. A product matches if its name contains any one of these words.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addBlank} style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 14, padding: "10px 0", borderRadius: 9, border: "1.5px dashed var(--purple)", background: "var(--purple-light)", color: "var(--purple)", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%", justifyContent: "center" }}>
          <Plus size={15} /> Add Collection
        </button>
      </SectionCard>

      {/* Save bar */}
      <div style={{ marginTop: 28, padding: "16px 20px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, boxShadow: "var(--card-shadow)" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Save an empty list to go back to the built-in defaults.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setCollections([])} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>
            <RefreshCcw size={13} /> Clear all
          </button>
          <button onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 8, border: "none", background: saving ? "var(--text-muted)" : "#ea580c", color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

    </div>
  );
}
