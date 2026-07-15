"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  ImageOff, Upload, Trash2, Search, Loader2, Save,
  CheckCircle2, AlertCircle, Tag, FileText, RefreshCw, Eye,
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
}

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
  const fileRef = useRef<HTMLInputElement>(null);

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
