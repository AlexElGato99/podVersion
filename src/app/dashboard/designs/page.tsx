"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  ImageOff, Upload, Trash2, Search, Loader2, Save,
  AlertCircle, Tag, FileText, RefreshCw, Eye, Move,
  AlignCenter, Maximize2, X, Check,
} from "lucide-react";

interface Design {
  id: string;
  name: string;
  description?: string;
  tags?: string;
  url: string;
  storage_path: string;
  mime_type?: string;
  size?: number;
  status?: "draft" | "active" | "archived";
  created_at: string;
  position_data?: PositionData | null;
}

/** All values are fractions of the print area (0–1). */
interface PositionData {
  width_pct: number;   // design width / print area width
  left_pct: number;    // design left edge / print area width
  top_pct: number;     // design top edge / print area height
}

/** Print area dimensions in px as used by Printful at 150 dpi */
export const PRINT_AREA_PX = { w: 1800, h: 2400 };
/** Aspect ratio of print area (used for the preview canvas) */
const AREA_W = 300; // preview canvas px
const AREA_H = 400; // preview canvas px (3:4 ratio)

const s: Record<string, React.CSSProperties> = {
  page:  { padding: "24px" },
  card:  { background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "12px" },
  input: { width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" },
  label: { display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  btn:   { display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none" },
};

export default function DesignsPage() {
  const [designs, setDesigns]         = useState<Design[]>([]);
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [editId, setEditId]           = useState<string | null>(null);
  const [editData, setEditData]       = useState<Partial<Design>>({});
  const [savingId, setSavingId]       = useState<string | null>(null);
  const [preview, setPreview]         = useState<Design | null>(null);

  // Position editor
  const [posDesign, setPosDesign]         = useState<Design | null>(null);
  const [posData, setPosData]             = useState<PositionData>({ width_pct: 0.8, left_pct: 0.1, top_pct: 0.05 });
  const [imgAspect, setImgAspect]         = useState(1); // width / height of design image
  const [savingPos, setSavingPos]         = useState(false);
  const [posSaved, setPosSaved]           = useState(false);
  const areaRef    = useRef<HTMLDivElement>(null);
  const dragging   = useRef(false);
  const dragStart  = useRef({ mx: 0, my: 0, left: 0, top: 0 });

  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Position editor helpers ── */
  function openPositionEditor(design: Design) {
    setPosDesign(design);
    setPosSaved(false);
    const saved = design.position_data;
    setPosData(saved ?? { width_pct: 0.8, left_pct: 0.1, top_pct: 0.05 });
  }

  function centerDesign() {
    const w = posData.width_pct;
    const h = w / imgAspect * (AREA_W / AREA_H); // height in print-area fraction (0-1 of H)
    setPosData(prev => ({
      ...prev,
      left_pct: (1 - w) / 2,
      top_pct: (1 - h) / 2,
    }));
  }

  function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, left: posData.left_pct, top: posData.top_pct };
    e.preventDefault();
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    const dx = (e.clientX - dragStart.current.mx) / AREA_W;
    const dy = (e.clientY - dragStart.current.my) / AREA_H;
    setPosData(prev => ({
      ...prev,
      left_pct: clamp(dragStart.current.left + dx, 0, 1 - prev.width_pct),
      top_pct:  clamp(dragStart.current.top  + dy, 0, 1 - prev.width_pct / imgAspect * (AREA_W / AREA_H)),
    }));
  }

  function onMouseUp() { dragging.current = false; }

  async function savePosition() {
    if (!posDesign) return;
    setSavingPos(true);
    await fetch("/api/designs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: posDesign.id, position_data: posData }),
    });
    setDesigns(prev => prev.map(d => d.id === posDesign.id ? { ...d, position_data: posData } : d));
    setSavingPos(false);
    setPosSaved(true);
    setTimeout(() => { setPosSaved(false); setPosDesign(null); }, 1200);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/designs");
    const data = await res.json();
    setDesigns(data.designs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/designs/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        // Save design metadata
        await fetch("/api/designs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name.replace(/\.[^.]+$/, ""),
            url: data.url,
            storage_path: data.storage_path,
            mime_type: data.mime_type,
            size: data.size,
            status: "active",
          }),
        });
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Upload failed");
      }
    }
    setUploading(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this design? This cannot be undone.")) return;
    await fetch(`/api/designs?id=${id}`, { method: "DELETE" });
    load();
  }

  async function saveEdit(id: string) {
    setSavingId(id);
    await fetch("/api/designs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editData }),
    });
    setSavingId(null);
    setEditId(null);
    load();
  }

  const filtered = designs.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.tags ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 36, height: 36, borderRadius: "10px", background: "#ea580c22", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ImageOff size={18} color="#ea580c" />
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Design Library</h1>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>{designs.length} designs uploaded</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{ ...s.btn, background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)" }} onClick={load}>
            <RefreshCw size={13} />
          </button>
          <button
            style={{ ...s.btn, background: "#ea580c", color: "#fff" }}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? "Uploading…" : "Upload Design"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div style={{ background: "#ef444420", border: "1px solid #ef444440", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#ef4444", fontSize: "13px" }}>
          <AlertCircle size={15} /> {uploadError}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
        style={{ border: "2px dashed var(--border)", borderRadius: "12px", padding: "32px", textAlign: "center", marginBottom: "20px", cursor: "pointer", color: "var(--text-muted)", fontSize: "13px" }}
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={24} style={{ margin: "0 auto 8px" }} />
        <p style={{ margin: 0 }}>Drag & drop designs here, or click to browse</p>
        <p style={{ margin: "4px 0 0", fontSize: "11px" }}>PNG, JPG, WebP, SVG — any size</p>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "20px" }}>
        <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input style={{ ...s.input, paddingLeft: "36px" }} placeholder="Search by name or tag…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px", color: "var(--text-muted)" }}>
          <Loader2 size={22} className="animate-spin" />
          <span style={{ marginLeft: 10 }}>Loading designs…</span>
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
          {filtered.map((design) => {
            const isEditing = editId === design.id;
            return (
              <div key={design.id} style={{ ...s.card, padding: "0", overflow: "hidden" }}>
                {/* Image */}
                <div style={{ position: "relative", aspectRatio: "1", background: "#f4f4f4", cursor: "pointer" }} onClick={() => setPreview(design)}>
                  <Image src={design.url} alt={design.name} fill style={{ objectFit: "contain" }} unoptimized />
                  <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: "6px" }}>
                    <button
                      style={{ ...s.btn, padding: "5px 8px", background: "rgba(255,255,255,0.9)", color: "#374151", border: "1px solid #e5e7eb" }}
                      onClick={(e) => { e.stopPropagation(); setPreview(design); }}
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      style={{ ...s.btn, padding: "5px 8px", background: "rgba(255,255,255,0.9)", color: "#ef4444", border: "1px solid #fca5a5" }}
                      onClick={(e) => { e.stopPropagation(); handleDelete(design.id); }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div style={{ position: "absolute", bottom: 8, left: 8 }}>
                    <span style={{ background: design.status === "active" ? "#0d948820" : "#6b728020", color: design.status === "active" ? "#0d9488" : "#6b7280", fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", border: "1px solid currentColor" }}>
                      {design.status ?? "active"}
                    </span>
                  </div>
                </div>

                {/* Info / Edit */}
                <div style={{ padding: "12px" }}>
                  {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <input style={s.input} value={editData.name ?? design.name} onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))} placeholder="Design name" />
                      <input style={s.input} value={editData.tags ?? design.tags ?? ""} onChange={(e) => setEditData((p) => ({ ...p, tags: e.target.value }))} placeholder="Tags (comma-separated)" />
                      <textarea style={{ ...s.input, minHeight: 60, resize: "vertical" }} value={editData.description ?? design.description ?? ""} onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))} placeholder="Description" />
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button style={{ ...s.btn, flex: 1, justifyContent: "center", background: "#ea580c", color: "#fff" }} onClick={() => saveEdit(design.id)}>
                          {savingId === design.id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                          Save
                        </button>
                        <button style={{ ...s.btn, background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }} onClick={() => setEditId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{design.name}</p>
                      {design.tags && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                          {design.tags.split(",").map((t) => (
                            <span key={t} style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)", fontSize: "10px", padding: "1px 6px", borderRadius: "4px", display: "flex", alignItems: "center", gap: "3px" }}>
                              <Tag size={9} />{t.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          style={{ ...s.btn, flex: 1, justifyContent: "center", background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)", padding: "5px 10px", fontSize: "12px" }}
                          onClick={() => { setEditId(design.id); setEditData({ name: design.name, tags: design.tags, description: design.description }); }}
                        >
                          <FileText size={12} /> Edit
                        </button>
                        <button
                          style={{ ...s.btn, justifyContent: "center", background: design.position_data ? "#0d948818" : "var(--bg-tertiary)", color: design.position_data ? "#0d9488" : "var(--text-secondary)", border: `1px solid ${design.position_data ? "#0d948840" : "var(--border)"}`, padding: "5px 10px", fontSize: "12px" }}
                          onClick={() => openPositionEditor(design)}
                          title="Set design position on print area"
                        >
                          <Move size={12} /> Position
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
          <ImageOff size={32} style={{ margin: "0 auto 12px" }} />
          <p>No designs yet. Upload your first design above.</p>
        </div>
      )}

      {/* ── Position Editor Modal ── */}
      {posDesign && (() => {
        const designW = posData.width_pct * AREA_W;
        const designH = designW / imgAspect;
        const designLeft = posData.left_pct * AREA_W;
        const designTop  = posData.top_pct  * AREA_H;

        return (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
            onClick={() => setPosDesign(null)}
          >
            <div
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "14px", width: "100%", maxWidth: "660px", overflow: "hidden" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "10px" }}>
                <Move size={16} color="#ea580c" />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>Design Position Editor</h3>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--text-muted)" }}>{posDesign.name} — drag the design or use the controls below</p>
                </div>
                <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }} onClick={() => setPosDesign(null)}><X size={16} /></button>
              </div>

              <div style={{ display: "flex", gap: "0", alignItems: "flex-start" }}>
                {/* Canvas */}
                <div style={{ padding: "20px", flexShrink: 0 }}>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px", textAlign: "center" }}>Print Area (12″×16″)</p>
                  <div
                    ref={areaRef}
                    style={{ width: AREA_W, height: AREA_H, background: "#f9fafb", border: "2px dashed #d1d5db", borderRadius: "6px", position: "relative", overflow: "hidden", cursor: "crosshair", userSelect: "none" }}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                  >
                    {/* Grid lines */}
                    <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)", backgroundSize: "30px 30px", opacity: 0.6 }} />
                    {/* Center crosshair */}
                    <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "#ea580c44" }} />
                    <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "#ea580c44" }} />

                    {/* Design */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={posDesign.url}
                      alt={posDesign.name}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        setImgAspect(img.naturalWidth / img.naturalHeight);
                      }}
                      draggable={false}
                      onMouseDown={onMouseDown}
                      style={{
                        position: "absolute",
                        left: designLeft,
                        top:  designTop,
                        width: designW,
                        height: designH,
                        cursor: "move",
                        userSelect: "none",
                        pointerEvents: "all",
                        border: "1.5px solid #ea580c",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      }}
                    />
                  </div>
                </div>

                {/* Controls */}
                <div style={{ flex: 1, padding: "20px 20px 20px 0", display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Scale */}
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Scale — {Math.round(posData.width_pct * 100)}% of print area width
                    </label>
                    <input
                      type="range" min={10} max={150} step={1}
                      value={Math.round(posData.width_pct * 100)}
                      onChange={e => {
                        const w = parseInt(e.target.value) / 100;
                        setPosData(prev => ({ ...prev, width_pct: w }));
                      }}
                      style={{ width: "100%", accentColor: "#ea580c" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-muted)" }}>
                      <span>10%</span><span>150%</span>
                    </div>
                  </div>

                  {/* X offset */}
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Horizontal offset — {Math.round(posData.left_pct * 100)}%
                    </label>
                    <input
                      type="range" min={0} max={100} step={1}
                      value={Math.round(posData.left_pct * 100)}
                      onChange={e => setPosData(prev => ({ ...prev, left_pct: parseInt(e.target.value) / 100 }))}
                      style={{ width: "100%", accentColor: "#ea580c" }}
                    />
                  </div>

                  {/* Y offset */}
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Vertical offset — {Math.round(posData.top_pct * 100)}%
                    </label>
                    <input
                      type="range" min={0} max={100} step={1}
                      value={Math.round(posData.top_pct * 100)}
                      onChange={e => setPosData(prev => ({ ...prev, top_pct: parseInt(e.target.value) / 100 }))}
                      style={{ width: "100%", accentColor: "#ea580c" }}
                    />
                  </div>

                  {/* Exact px info */}
                  <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "10px 12px", fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.7 }}>
                    <strong style={{ color: "var(--text-secondary)" }}>Printful print area (front):</strong><br />
                    Width: {Math.round(posData.width_pct * PRINT_AREA_PX.w)}px &nbsp;·&nbsp;
                    Height: {Math.round((posData.width_pct * PRINT_AREA_PX.w) / imgAspect)}px<br />
                    Left: {Math.round(posData.left_pct * PRINT_AREA_PX.w)}px &nbsp;·&nbsp;
                    Top: {Math.round(posData.top_pct * PRINT_AREA_PX.h)}px
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "1px solid var(--border)", background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                      onClick={centerDesign}
                    >
                      <AlignCenter size={13} /> Center
                    </button>
                    <button
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "1px solid var(--border)", background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                      onClick={() => setPosData({ width_pct: 0.8, left_pct: 0.1, top_pct: 0.05 })}
                    >
                      <Maximize2 size={13} /> Reset
                    </button>
                    <button
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "none", background: posSaved ? "#0d9488" : "#ea580c", color: "#fff", marginLeft: "auto" }}
                      onClick={savePosition}
                      disabled={savingPos}
                    >
                      {savingPos ? <Loader2 size={13} className="animate-spin" /> : posSaved ? <Check size={13} /> : <Save size={13} />}
                      {posSaved ? "Saved!" : savingPos ? "Saving…" : "Save Position"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Preview modal */}
      {preview && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setPreview(null)}
        >
          <div style={{ position: "relative", maxWidth: "80vw", maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <Image src={preview.url} alt={preview.name} width={800} height={800} style={{ objectFit: "contain", maxWidth: "80vw", maxHeight: "80vh", borderRadius: "12px" }} unoptimized />
            <p style={{ textAlign: "center", color: "#fff", marginTop: "12px", fontSize: "14px", fontWeight: 600 }}>{preview.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
