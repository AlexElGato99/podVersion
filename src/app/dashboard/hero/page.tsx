"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Image as ImageIcon,
  Type,
  Palette,
  MousePointerClick,
  LayoutTemplate,
  Save,
  RefreshCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GripVertical,
  Upload,
  X,
  Smile,
  ImagePlus,
} from "lucide-react";

/* --- Types ----------------------------------------------- */
interface FloatingCard {
  id: string;
  emoji: string;
  image_url: string;
  label: string;
  sublabel: string;
  bg: string;
  bg_disabled: boolean;
  text_color: string;
  position: "top-left" | "bottom-left" | "top-right" | "bottom-right";
}

interface HeroSettings {
  headline: string;
  subtitle: string;
  cta_primary_text: string;
  cta_primary_link: string;
  cta_secondary_text: string;
  cta_secondary_link: string;
  bg_from: string;
  bg_to: string;
  main_image_url: string;
  floating_cards: FloatingCard[];
}

const POSITION_LABELS: Record<FloatingCard["position"], string> = {
  "top-left":    "Top-Left (behind image)",
  "bottom-left": "Bottom-Left (behind image)",
  "top-right":   "Top-Right (behind image)",
  "bottom-right":"Bottom-Right (behind image)",
};

const DEFAULTS: HeroSettings = {
  headline: "The leader in quality custom T-Shirts",
  subtitle: "Turn your ideas into premium products that leave a lasting impression",
  cta_primary_text: "Shop Now",
  cta_primary_link: "/shop",
  cta_secondary_text: "View Collections",
  cta_secondary_link: "/collections",
  bg_from: "#fdf1e7",
  bg_to: "#fce8d5",
  main_image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&auto=format&fit=crop&q=80",
  floating_cards: [
    { id: "1", emoji: "??", image_url: "", label: "", sublabel: "", bg: "#0d3d5f", bg_disabled: false, text_color: "#ffffff", position: "top-left" },
    { id: "2", emoji: "?????", image_url: "", label: "", sublabel: "", bg: "#d4eaff", bg_disabled: false, text_color: "#374151", position: "bottom-left" },
    { id: "3", emoji: "", image_url: "", label: "Company Name", sublabel: "Slogan Here", bg: "#ffffff", bg_disabled: false, text_color: "#374151", position: "top-right" },
    { id: "4", emoji: "??", image_url: "", label: "", sublabel: "", bg: "#ffffff", bg_disabled: false, text_color: "#374151", position: "bottom-right" },
  ],
};

/* --- Shared style tokens ---------------------------------- */
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--bg-secondary)",
  color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box",
};

/* --- ImageUploader component ------------------------------ */
function ImageUploader({
  currentUrl,
  slot,
  onUploaded,
  token,
  aspect = "square",
}: {
  currentUrl: string;
  slot: string;
  onUploaded: (url: string) => void;
  token: string;
  aspect?: "square" | "tall";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setErr(null);
    setProgress("Converting to WebP�");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("slot", slot);

    try {
      const res = await fetch("/api/upload-hero-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setProgress(`Done � ${json.original_size_kb}KB ? ${json.size_kb}KB WebP`);
      onUploaded(json.url);
      setTimeout(() => setProgress(null), 4000);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  }, [slot, token, onUploaded]);

  const onFile = (files: FileList | null) => {
    if (files?.[0]) upload(files[0]);
  };

  const previewH = aspect === "tall" ? 180 : 100;

  return (
    <div style={{ marginTop: 8 }}>
      {currentUrl ? (
        <div style={{ position: "relative", display: "inline-block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt=""
            style={{ height: previewH, maxWidth: "100%", objectFit: "contain", borderRadius: 8, border: "1px solid var(--border)", background: "#f8fafc" }}
          />
          <button
            onClick={() => onUploaded("")}
            title="Remove image"
            style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", background: "#ef4444", border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
          >
            <X size={11} />
          </button>
          <div style={{ marginTop: 6 }}>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{ fontSize: 11, color: "#ea580c", cursor: "pointer", background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
            >
              <Upload size={11} /> Replace image
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files); }}
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "#ea580c" : "var(--border)"}`,
            borderRadius: 10,
            padding: "20px 12px",
            textAlign: "center",
            cursor: uploading ? "wait" : "pointer",
            background: dragOver ? "#fff7ed" : "var(--bg-secondary)",
            transition: "all 0.15s",
          }}
        >
          {uploading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <Loader2 size={20} color="#ea580c" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{progress}</span>
            </div>
          ) : (
            <>
              <ImagePlus size={22} color="var(--text-muted)" style={{ margin: "0 auto 6px" }} />
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>Click or drag & drop</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0 0" }}>JPG, PNG, GIF ? auto-converted to WebP � max 5 MB</p>
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
  const [token, setToken] = useState("");
  // Track which card mode is active: "emoji" or "image"
  const [cardMode, setCardMode] = useState<Record<string, "emoji" | "image">>({
    "1": "emoji", "2": "emoji", "3": "emoji", "4": "emoji",
  });

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) setToken(session.access_token);

      const { data } = await supabase.from("hero_settings").select("*").eq("id", 1).single();
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, updated_at: _u, ...rest } = data;
        const s = rest as HeroSettings;
        setSettings(s);
        // Auto-detect card mode based on whether image_url is set
        const modes: Record<string, "emoji" | "image"> = {};
        (s.floating_cards || []).forEach((c: FloatingCard) => {
          modes[c.id] = c.image_url ? "image" : "emoji";
        });
        setCardMode(modes);
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
  const setCard = (id: string, key: keyof FloatingCard, value: string | boolean) =>
    setSettings((s) => ({ ...s, floating_cards: s.floating_cards.map((c) => c.id === id ? { ...c, [key]: value } : c) }));

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: "var(--text-muted)" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        Loading hero settings�
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
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Control every element of the store hero banner � images auto-converted to WebP</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setPreviewOpen(!previewOpen)} style={btnBase}><Eye size={14} />{previewOpen ? "Hide Preview" : "Preview"}</button>
          <button onClick={() => setSettings(DEFAULTS)} style={btnBase}><RefreshCcw size={14} />Reset</button>
          <button onClick={save} disabled={saving} style={{ ...btnBase, border: "none", background: saving ? "var(--text-muted)" : "#ea580c", color: "#fff", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
            {saving ? "Saving�" : "Save Changes"}
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
          <div style={{ background: `linear-gradient(135deg, ${settings.bg_from} 0%, ${settings.bg_to} 100%)`, padding: "28px 36px", display: "flex", alignItems: "center", gap: 40 }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 10px 0", whiteSpace: "pre-line" }}>{settings.headline}</h2>
              <p style={{ fontSize: 13, color: "#4b5563", margin: "0 0 16px 0" }}>{settings.subtitle}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 999, background: "#5b4fe9", color: "#fff", fontSize: 13, fontWeight: 600 }}>
                  {settings.cta_primary_text} ?
                </div>
                {settings.cta_secondary_text && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 999, border: "2px solid rgba(0,0,0,0.2)", background: "rgba(255,255,255,0.6)", color: "#1f2937", fontSize: 13, fontWeight: 600 }}>
                    {settings.cta_secondary_text}
                  </div>
                )}
              </div>
            </div>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 110, height: 110, borderRadius: "50%", background: "#2d9ee0", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 0 }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.main_image_url} alt="" style={{ position: "relative", zIndex: 1, height: 140, width: 110, objectFit: "cover", objectPosition: "top", borderRadius: 8 }} />
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

        {/* CTA + Background */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <SectionCard icon={MousePointerClick} title="CTA Buttons">
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "-10px 0 14px 0" }}>Primary button is always shown. Leave Secondary text blank to hide it.</p>
            <Field label="Primary Button Text">
              <input type="text" value={settings.cta_primary_text} onChange={(e) => set("cta_primary_text", e.target.value)} style={inputStyle} placeholder="Shop Now" />
            </Field>
            <Field label="Primary Button Link" hint="e.g. /shop">
              <input type="text" value={settings.cta_primary_link} onChange={(e) => set("cta_primary_link", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Secondary Button Text" hint="Leave blank to hide the second button">
              <input type="text" value={settings.cta_secondary_text} onChange={(e) => set("cta_secondary_text", e.target.value)} style={inputStyle} placeholder="View Collections" />
            </Field>
            <Field label="Secondary Button Link">
              <input type="text" value={settings.cta_secondary_link} onChange={(e) => set("cta_secondary_link", e.target.value)} style={inputStyle} placeholder="/collections" />
            </Field>
          </SectionCard>

          <SectionCard icon={Palette} title="Background Gradient">
            <Field label="Start Color">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={settings.bg_from} onChange={(e) => set("bg_from", e.target.value)} style={{ width: 40, height: 36, border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", padding: 2 }} />
                <input type="text" value={settings.bg_from} onChange={(e) => set("bg_from", e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              </div>
            </Field>
            <Field label="End Color">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={settings.bg_to} onChange={(e) => set("bg_to", e.target.value)} style={{ width: 40, height: 36, border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", padding: 2 }} />
                <input type="text" value={settings.bg_to} onChange={(e) => set("bg_to", e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              </div>
            </Field>
            <div style={{ height: 24, borderRadius: 8, background: `linear-gradient(135deg, ${settings.bg_from}, ${settings.bg_to})`, border: "1px solid var(--border)", marginTop: 4 }} />
          </SectionCard>
        </div>

        {/* Main hero image */}
        <SectionCard icon={ImageIcon} title="Main Hero Image">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
            <div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px 0" }}>
                Upload a product image (PNG with transparent background recommended). It will be automatically converted to <strong>WebP</strong> for best performance.
              </p>
              <ImageUploader
                currentUrl={settings.main_image_url}
                slot="main"
                onUploaded={(url) => set("main_image_url", url)}
                token={token}
                aspect="tall"
              />
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Or paste a URL directly</label>
                <input type="url" value={settings.main_image_url} onChange={(e) => set("main_image_url", e.target.value)} style={inputStyle} placeholder="https://�" />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>Current Image Preview</label>
              {settings.main_image_url && (
                <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", background: settings.bg_from, display: "flex", justifyContent: "center", padding: 16 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={settings.main_image_url} alt="" style={{ maxHeight: 220, maxWidth: "100%", objectFit: "contain", borderRadius: 8 }} />
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Floating cards */}
        <SectionCard icon={GripVertical} title="Floating Design Cards">
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -10, marginBottom: 16 }}>
            4 cards float around the product image with animation. Each supports either an <strong>emoji</strong> or an uploaded <strong>image</strong>. Toggle the mode per card. Images are auto-converted to WebP on upload.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {settings.floating_cards.map((card) => (
              <div key={card.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 18, background: "var(--bg-secondary)" }}>

                {/* Card header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#ea580c", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {POSITION_LABELS[card.position]}
                  </span>
                  {/* Mini preview */}
                  <div style={{ width: 46, height: 46, borderRadius: 10, background: card.bg_disabled ? "transparent" : card.bg, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", overflow: "hidden", flexShrink: 0 }}>
                    {card.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: card.emoji ? 22 : 10, color: card.text_color, fontWeight: 700 }}>
                        {card.emoji || (card.label ? card.label.slice(0, 2) : "?")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mode toggle */}
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {(["emoji", "image"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setCardMode((m) => ({ ...m, [card.id]: mode }))}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                        padding: "6px 0", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        border: `1px solid ${cardMode[card.id] === mode ? "#ea580c" : "var(--border)"}`,
                        background: cardMode[card.id] === mode ? "#fff7ed" : "var(--bg-primary)",
                        color: cardMode[card.id] === mode ? "#ea580c" : "var(--text-muted)",
                        transition: "all 0.15s",
                      }}
                    >
                      {mode === "emoji" ? <Smile size={12} /> : <Upload size={12} />}
                      {mode === "emoji" ? "Emoji" : "Upload Image"}
                    </button>
                  ))}
                </div>

                {/* Emoji mode */}
                {cardMode[card.id] === "emoji" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Emoji</label>
                      <input type="text" value={card.emoji} onChange={(e) => setCard(card.id, "emoji", e.target.value)} style={{ ...inputStyle, fontSize: 18, textAlign: "center" }} placeholder="??" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Label</label>
                      <input type="text" value={card.label} onChange={(e) => setCard(card.id, "label", e.target.value)} style={inputStyle} placeholder="Company Name" />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Sub-label</label>
                      <input type="text" value={card.sublabel} onChange={(e) => setCard(card.id, "sublabel", e.target.value)} style={inputStyle} placeholder="Slogan" />
                    </div>
                  </div>
                )}

                {/* Image upload mode */}
                {cardMode[card.id] === "image" && (
                  <div>
                    <ImageUploader
                      currentUrl={card.image_url}
                      slot={`card-${card.id}`}
                      onUploaded={(url) => setCard(card.id, "image_url", url)}
                      token={token}
                      aspect="square"
                    />
                  </div>
                )}

                {/* Card background + text color (always shown) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Card Background</label>
                      <button
                        onClick={() => setCard(card.id, "bg_disabled", !card.bg_disabled)}
                        style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, cursor: "pointer", border: "1px solid",
                          borderColor: card.bg_disabled ? "var(--text-muted)" : "#ea580c",
                          background: card.bg_disabled ? "var(--bg-primary)" : "#fff7ed",
                          color: card.bg_disabled ? "var(--text-muted)" : "#ea580c",
                          transition: "all 0.15s",
                        }}
                        title={card.bg_disabled ? "Background disabled � click to enable" : "Click to disable background"}
                      >
                        {card.bg_disabled ? "Disabled" : "Enabled"}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", opacity: card.bg_disabled ? 0.35 : 1, pointerEvents: card.bg_disabled ? "none" : "auto" }}>
                      <input type="color" value={card.bg} onChange={(e) => setCard(card.id, "bg", e.target.value)} style={{ width: 32, height: 30, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: 2, flexShrink: 0 }} />
                      <input type="text" value={card.bg} onChange={(e) => setCard(card.id, "bg", e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Text Color</label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="color" value={card.text_color} onChange={(e) => setCard(card.id, "text_color", e.target.value)} style={{ width: 32, height: 30, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: 2, flexShrink: 0 }} />
                      <input type="text" value={card.text_color} onChange={(e) => setCard(card.id, "text_color", e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* -- Bottom save bar -- */}
      <div style={{ marginTop: 28, padding: "16px 20px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, boxShadow: "var(--card-shadow)" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Changes go live on the store homepage immediately after saving.</p>
        <button onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 8, border: "none", background: saving ? "var(--text-muted)" : "#ea580c", color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
          {saving ? "Saving�" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
