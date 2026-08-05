"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Type, Save, Loader2, Plus, Trash2, RefreshCcw, CheckCircle2, AlertCircle,
  BookOpen, Heart, MousePointerClick,
} from "lucide-react";

interface AboutValue {
  title: string;
  description: string;
}

interface AboutSettings {
  badge_text: string;
  headline: string;
  subheadline: string;
  story_paragraphs: string[];
  values: AboutValue[];
  cta_title: string;
  cta_subtitle: string;
}

const DEFAULTS: AboutSettings = {
  badge_text: "Our Story",
  headline: "From Etsy & Amazon to Our Own Home",
  subheadline:
    "Veliova started as another shop among many — selling on Etsy and Merch by Amazon. Now it's something we built and control ourselves: a small, independent brand focused on doing one thing really well.",
  story_paragraphs: [
    "Before Veliova, we were already selling print-on-demand designs on Etsy and Merch by Amazon — two great platforms that taught us a lot about what customers actually want. But selling on a marketplace means sharing the stage: someone else controls the search results, the checkout experience, the branding, even how customers reach us when something goes wrong.",
    "We wanted more than that. So we started Veliova as our own small brand — a place where we control every part of the experience, from the first design sketch to the moment your order arrives at your door. No algorithm deciding whether you get found. No generic marketplace checkout. Just a store we've built and stand behind ourselves.",
    "We're still a small team, and we like it that way. Every design is picked with care, every order matters, and every customer gets our full attention — not because a platform requires it, but because it's how we actually want to run this.",
  ],
  values: [
    { title: "Made with Care", description: "Every design is chosen and refined by us, not mass-generated — because we're building something we're proud to put our name on." },
    { title: "Our Own Platform", description: "Veliova is fully ours — not a storefront borrowed from a marketplace. That means a more direct, better-controlled experience for you." },
    { title: "Made to Order", description: "Every item is printed after you order it, through trusted print-on-demand manufacturing partners — so nothing sits in a warehouse before it's yours." },
    { title: "A Small Team, Directly Reachable", description: "When you reach out to us, you're talking to the people who actually run Veliova — not a marketplace support queue." },
  ],
  cta_title: "Ready to find your next favorite piece?",
  cta_subtitle: "Browse our full catalog and discover products you'll love.",
};

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
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

export default function AboutSettingsPage() {
  const [settings, setSettings] = useState<AboutSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("about_settings").select("*").eq("id", 1).single();
      if (data) {
        const { id: _id, updated_at: _u, ...rest } = data;
        const merged = { ...DEFAULTS, ...rest } as AboutSettings;
        if (!merged.story_paragraphs?.length) merged.story_paragraphs = DEFAULTS.story_paragraphs;
        if (!merged.values?.length) merged.values = DEFAULTS.values;
        setSettings(merged);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(async () => {
    setSaving(true); setMsg(null);
    const { error } = await supabase.from("about_settings").upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });
    setSaving(false);
    setMsg(error ? { type: "error", text: error.message } : { type: "success", text: "About page saved! Changes are live on /about." });
    setTimeout(() => setMsg(null), 5000);
  }, [settings, supabase]);

  const set = <K extends keyof AboutSettings>(key: K, value: AboutSettings[K]) => setSettings((s) => ({ ...s, [key]: value }));

  const setParagraph = (i: number, value: string) =>
    setSettings((s) => ({ ...s, story_paragraphs: s.story_paragraphs.map((p, idx) => idx === i ? value : p) }));
  const addParagraph = () => setSettings((s) => ({ ...s, story_paragraphs: [...s.story_paragraphs, ""] }));
  const removeParagraph = (i: number) => setSettings((s) => ({ ...s, story_paragraphs: s.story_paragraphs.filter((_, idx) => idx !== i) }));

  const setValue = (i: number, key: keyof AboutValue, value: string) =>
    setSettings((s) => ({ ...s, values: s.values.map((v, idx) => idx === i ? { ...v, [key]: value } : v) }));
  const addValue = () => setSettings((s) => ({ ...s, values: [...s.values, { title: "New Value", description: "" }] }));
  const removeValue = (i: number) => setSettings((s) => ({ ...s, values: s.values.filter((_, idx) => idx !== i) }));

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: "var(--text-muted)" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> Loading About page settings…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>About Page</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          Edit the story, values, and call-to-action shown on <code>/about</code>.
        </p>
      </div>

      {msg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, marginBottom: 20, border: "1px solid", fontSize: 13, fontWeight: 500, background: msg.type === "success" ? "#f0fdf4" : "#fef2f2", borderColor: msg.type === "success" ? "#bbf7d0" : "#fecaca", color: msg.type === "success" ? "#16a34a" : "#dc2626" }}>
          {msg.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {msg.text}
        </div>
      )}

      <div style={{ display: "grid", gap: 20 }}>

        {/* Hero */}
        <SectionCard icon={Type} title="Hero">
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Badge text</label>
              <input type="text" value={settings.badge_text} onChange={(e) => set("badge_text", e.target.value)} style={inp} placeholder="Our Story" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Headline</label>
              <textarea rows={2} value={settings.headline} onChange={(e) => set("headline", e.target.value)} style={{ ...inp, resize: "vertical" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Subheadline</label>
              <textarea rows={3} value={settings.subheadline} onChange={(e) => set("subheadline", e.target.value)} style={{ ...inp, resize: "vertical" }} />
            </div>
          </div>
        </SectionCard>

        {/* Story */}
        <SectionCard icon={BookOpen} title="Our Story">
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -10, marginBottom: 16 }}>
            Shown as separate paragraphs beneath the hero.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {settings.story_paragraphs.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <textarea
                  rows={3}
                  value={p}
                  onChange={(e) => setParagraph(i, e.target.value)}
                  style={{ ...inp, resize: "vertical", flex: 1 }}
                  placeholder={`Paragraph ${i + 1}`}
                />
                <button onClick={() => removeParagraph(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 7, border: "1px solid #fecaca", background: "#fff1f2", color: "#dc2626", cursor: "pointer", flexShrink: 0 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addParagraph} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, padding: "8px 0", borderRadius: 8, border: "1.5px dashed var(--purple)", background: "var(--purple-light)", color: "var(--purple)", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%", justifyContent: "center" }}>
            <Plus size={13} /> Add paragraph
          </button>
        </SectionCard>

        {/* Values */}
        <SectionCard icon={Heart} title={`Values (${settings.values.length})`}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -10, marginBottom: 16 }}>
            Shown as cards — icons cycle automatically (Heart, Globe, Zap, Users) based on position.
          </p>
          <div style={{ display: "grid", gap: 14 }}>
            {settings.values.map((v, i) => (
              <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--bg-secondary)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Value #{i + 1}</span>
                  <button onClick={() => removeValue(i)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 6, border: "1px solid #fecaca", background: "#fff1f2", color: "#dc2626", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  <input type="text" value={v.title} onChange={(e) => setValue(i, "title", e.target.value)} style={inp} placeholder="Title" />
                  <textarea rows={2} value={v.description} onChange={(e) => setValue(i, "description", e.target.value)} style={{ ...inp, resize: "vertical" }} placeholder="Description" />
                </div>
              </div>
            ))}
          </div>
          <button onClick={addValue} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, padding: "8px 0", borderRadius: 8, border: "1.5px dashed var(--purple)", background: "var(--purple-light)", color: "var(--purple)", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%", justifyContent: "center" }}>
            <Plus size={13} /> Add value
          </button>
        </SectionCard>

        {/* CTA */}
        <SectionCard icon={MousePointerClick} title="Call to Action">
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Title</label>
              <input type="text" value={settings.cta_title} onChange={(e) => set("cta_title", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Subtitle</label>
              <input type="text" value={settings.cta_subtitle} onChange={(e) => set("cta_subtitle", e.target.value)} style={inp} />
            </div>
          </div>
        </SectionCard>

      </div>

      {/* Save bar */}
      <div style={{ marginTop: 28, padding: "16px 20px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, boxShadow: "var(--card-shadow)" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Changes go live on /about immediately after saving.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setSettings(DEFAULTS)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>
            <RefreshCcw size={13} /> Reset
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
