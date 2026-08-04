"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Type,
  MousePointerClick,
  LayoutTemplate,
  Save,
  RefreshCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

/* --- Types ----------------------------------------------- */
interface HeroSettings {
  headline: string;
  subtitle: string;
  cta_primary_text: string;
  cta_primary_link: string;
  cta_secondary_text: string;
  cta_secondary_link: string;
}

const DEFAULTS: HeroSettings = {
  headline: "Premium Quality Shirts, Made to Last",
  subtitle: "Soft, durable fabric and expert craftsmanship in every shirt we ship — no gimmicks, just great quality you can feel.",
  cta_primary_text: "Shop Shirts",
  cta_primary_link: "/shop",
  cta_secondary_text: "View Collections",
  cta_secondary_link: "/collections",
};

/* --- Shared style tokens ---------------------------------- */
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--bg-secondary)",
  color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box",
};

/* --- SectionCard ------------------------------------------ */
function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, boxShadow: "var(--card-shadow)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", color: "#ea580c", flexShrink: 0 }}>
          <Icon size={16} strokeWidth={1.75} />
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

/* --- Main page -------------------------------------------- */
export default function HeroSettingsPage() {
  const [settings, setSettings] = useState<HeroSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("hero_settings").select("*").eq("id", 1).single();
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
    const { error } = await supabase.from("hero_settings").upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });
    setSaving(false);
    setMsg(error ? { type: "error", text: error.message } : { type: "success", text: "Hero section saved! Changes are live on the store." });
    setTimeout(() => setMsg(null), 5000);
  }, [settings, supabase]);

  const set = (key: keyof HeroSettings, value: string) => setSettings((s) => ({ ...s, [key]: value }));

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: "var(--text-muted)" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        Loading hero settings…
      </div>
    );
  }

  const btnBase: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" };

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }} className="animate-fade-in">
      {/* -- Header -- */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", color: "#ea580c" }}>
            <LayoutTemplate size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Hero Section</h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Simple, text-only hero — headline, subtitle and two call-to-action buttons, centered.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setPreviewOpen(!previewOpen)} style={btnBase}><Eye size={14} />{previewOpen ? "Hide Preview" : "Preview"}</button>
          <button onClick={() => setSettings(DEFAULTS)} style={btnBase}><RefreshCcw size={14} />Reset</button>
          <button onClick={save} disabled={saving} style={{ ...btnBase, border: "none", background: saving ? "var(--text-muted)" : "#ea580c", color: "#fff", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* -- Toast -- */}
      {msg && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, marginBottom: 20, background: msg.type === "success" ? "var(--accent-light)" : "#fee2e2", color: msg.type === "success" ? "var(--accent-dark)" : "#dc2626", fontSize: 13, fontWeight: 500, border: `1px solid ${msg.type === "success" ? "var(--accent)" : "#fca5a5"}` }}>
          {msg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* -- Mini preview -- */}
      {previewOpen && (
        <div style={{ marginBottom: 24, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "var(--card-shadow)" }}>
          <div style={{ padding: "8px 14px", background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Live Preview</div>
          <div style={{ background: "#ffffff", padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#18181b", margin: 0, maxWidth: 480, lineHeight: 1.15 }}>{settings.headline}</h2>
            <p style={{ fontSize: 13, color: "#52525b", margin: 0, maxWidth: 420 }}>{settings.subtitle}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 999, background: "#18181b", color: "#fff", fontSize: 13, fontWeight: 600 }}>
                {settings.cta_primary_text}
              </div>
              {settings.cta_secondary_text && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 999, border: "2px solid #18181b", background: "transparent", color: "#18181b", fontSize: 13, fontWeight: 600 }}>
                  {settings.cta_secondary_text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -- Form -- */}
      <div style={{ display: "grid", gap: 20 }}>

        {/* Headline + Subtitle */}
        <SectionCard icon={Type} title="Headline & Subtitle">
          <Field label="Headline">
            <textarea rows={2} value={settings.headline} onChange={(e) => set("headline", e.target.value)} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
          </Field>
          <Field label="Subtitle">
            <textarea rows={2} value={settings.subtitle} onChange={(e) => set("subtitle", e.target.value)} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
          </Field>
        </SectionCard>

        {/* CTA */}
        <SectionCard icon={MousePointerClick} title="CTA Buttons">
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "-10px 0 14px 0" }}>Primary button is always shown. Leave Secondary text blank to hide it.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <Field label="Primary Button Text">
                <input type="text" value={settings.cta_primary_text} onChange={(e) => set("cta_primary_text", e.target.value)} style={inputStyle} placeholder="Shop Now" />
              </Field>
              <Field label="Primary Button Link" hint="e.g. /shop">
                <input type="text" value={settings.cta_primary_link} onChange={(e) => set("cta_primary_link", e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div>
              <Field label="Secondary Button Text" hint="Leave blank to hide the second button">
                <input type="text" value={settings.cta_secondary_text} onChange={(e) => set("cta_secondary_text", e.target.value)} style={inputStyle} placeholder="View Collections" />
              </Field>
              <Field label="Secondary Button Link">
                <input type="text" value={settings.cta_secondary_link} onChange={(e) => set("cta_secondary_link", e.target.value)} style={inputStyle} placeholder="/collections" />
              </Field>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* -- Bottom save bar -- */}
      <div style={{ marginTop: 28, padding: "16px 20px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, boxShadow: "var(--card-shadow)" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Changes go live on the store homepage immediately after saving.</p>
        <button onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 8, border: "none", background: saving ? "var(--text-muted)" : "#ea580c", color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
