"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Rocket, Loader2, CheckCircle2, XCircle, AlertCircle, Play,
  ImageOff, FolderOpen, RefreshCw, BarChart3, Palette,
} from "lucide-react";

interface Design {
  id: string;
  name: string;
  url: string;
  tags?: string;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  collection_products?: { catalog_product_id: number; catalog_product_name: string; is_enabled?: boolean }[];
}

interface MockupPreset {
  id: string;
  name: string;
  description?: string;
  products: { catalog_product_id: number; catalog_product_name: string; selected_variant_ids: number[]; placement: string; default_price: string }[];
}

interface PublishJobItem {
  id: string;
  catalog_product_id: number;
  catalog_product_name: string;
  status: "pending" | "running" | "done" | "failed" | "skipped";
  error?: string;
  printful_product_id?: number;
}

interface PublishJob {
  id: string;
  design_name: string;
  collection_name: string;
  total: number;
  completed: number;
  failed: number;
  status: "running" | "completed" | "failed" | "partial";
  started_at: string;
  finished_at?: string;
  publish_job_items?: PublishJobItem[];
}

const s: Record<string, React.CSSProperties> = {
  page:  { padding: "24px" },
  card:  { background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px", marginBottom: "16px" },
  label: { display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  select:{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" },
  btn:   { display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none" },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Loader2 size={13} style={{ opacity: 0.4 }} />,
  running: <Loader2 size={13} className="animate-spin" style={{ color: "#ea580c" }} />,
  done:    <CheckCircle2 size={13} style={{ color: "#0d9488" }} />,
  failed:  <XCircle size={13} style={{ color: "#ef4444" }} />,
  skipped: <AlertCircle size={13} style={{ color: "#f59e0b" }} />,
};

export default function PublishPage() {
  const [designs, setDesigns]         = useState<Design[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [presets, setPresets]         = useState<MockupPreset[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedDesign, setSelectedDesign]         = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [selectedPreset, setSelectedPreset]         = useState("");

  const [publishing, setPublishing]   = useState(false);
  const [job, setJob]                 = useState<PublishJob | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    const [dRes, cRes, pRes] = await Promise.all([
      fetch("/api/designs"),
      fetch("/api/collections"),
      fetch("/api/mockup-presets"),
    ]);
    const [dData, cData, pData] = await Promise.all([dRes.json(), cRes.json(), pRes.json()]);
    setDesigns((dData.designs ?? []).filter((d: Design & { status?: string }) => d.status !== "archived"));
    setCollections(cData.collections ?? []);
    setPresets(pData.presets ?? []);
    setLoadingData(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Poll job
  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed" || job.status === "partial") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/publish?jobId=${job.id}`);
      const data = await res.json();
      if (data.job) setJob(data.job);
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [job?.id, job?.status]);

  async function startPublish() {
    if (!selectedDesign || !selectedCollection) return;
    setError(null);
    setPublishing(true);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          design_id: selectedDesign,
          collection_id: selectedCollection,
          ...(selectedPreset ? { preset_id: selectedPreset } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      // Start polling
      const pollRes = await fetch(`/api/publish?jobId=${data.jobId}`);
      const pollData = await pollRes.json();
      setJob(pollData.job);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  const chosenDesign     = designs.find((d) => d.id === selectedDesign);
  const chosenCollection = collections.find((c) => c.id === selectedCollection);
  const chosenPreset     = presets.find((p) => p.id === selectedPreset);
  const enabledProducts  = (chosenCollection?.collection_products ?? []).filter((p) => p.is_enabled !== false);

  const progressPct = job ? Math.round(((job.completed + job.failed) / Math.max(job.total, 1)) * 100) : 0;
  const isDone      = job?.status === "completed" || job?.status === "failed" || job?.status === "partial";

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
        <div style={{ width: 36, height: 36, borderRadius: "10px", background: "#ea580c22", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Rocket size={18} color="#ea580c" />
        </div>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Publish Engine</h1>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>Upload one design → auto-publish to all products in a collection</p>
        </div>
        <button style={{ ...s.btn, marginLeft: "auto", background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)", padding: "7px 12px" }} onClick={loadData}>
          <RefreshCw size={13} />
        </button>
      </div>

      {loadingData ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px", color: "var(--text-muted)" }}>
          <Loader2 size={22} className="animate-spin" /><span style={{ marginLeft: 10 }}>Loading…</span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "20px", alignItems: "start" }}>
          {/* Left: Publish Form */}
          <div>
            <div style={s.card}>
              <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 20px" }}>1. Select Design</h2>
              <select style={s.select} value={selectedDesign} onChange={(e) => setSelectedDesign(e.target.value)}>
                <option value="">— Choose a design —</option>
                {designs.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {chosenDesign && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "14px", padding: "12px", background: "var(--bg-secondary)", borderRadius: "8px" }}>
                  <Image src={chosenDesign.url} alt={chosenDesign.name} width={56} height={56} style={{ borderRadius: "6px", objectFit: "contain", background: "#f4f4f4" }} unoptimized />
                  <div>
                    <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: 0, fontSize: "13px" }}>{chosenDesign.name}</p>
                    {chosenDesign.tags && <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "11px" }}>{chosenDesign.tags}</p>}
                  </div>
                </div>
              )}

              {designs.length === 0 && (
                <div style={{ marginTop: "12px", padding: "12px", background: "#f59e0b10", border: "1px solid #f59e0b30", borderRadius: "8px", fontSize: "12px", color: "#f59e0b", display: "flex", gap: "8px" }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  No designs found. Go to <strong>Designs</strong> to upload one.
                </div>
              )}
            </div>

            <div style={s.card}>
              <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>2. Select Mockup Preset</h2>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                Optional — overrides the colors/variants defined in collections and templates.
                Use <strong>Dark Products</strong> for light designs, <strong>Light Products</strong> for dark designs.
              </p>
              <select style={s.select} value={selectedPreset} onChange={(e) => setSelectedPreset(e.target.value)}>
                <option value="">— No preset (use collection / template settings) —</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.description ? ` — ${p.description}` : ""}</option>
                ))}
              </select>
              {chosenPreset && (
                <div style={{ marginTop: "10px", padding: "10px 12px", background: "#ea580c08", border: "1px solid #ea580c30", borderRadius: "8px", fontSize: "12px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Palette size={13} color="#ea580c" style={{ flexShrink: 0 }} />
                  <span>{chosenPreset.products.length} product configurations will override template defaults</span>
                </div>
              )}
              {presets.length === 0 && (
                <div style={{ marginTop: "10px", padding: "10px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
                  No presets yet. Create one in <strong>Mockup Presets</strong> to control which colors are used per design.
                </div>
              )}
            </div>

            <div style={s.card}>
              <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 20px" }}>3. Select Collection</h2>
              <select style={s.select} value={selectedCollection} onChange={(e) => setSelectedCollection(e.target.value)}>
                <option value="">— Choose a collection —</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({(c.collection_products ?? []).filter((p) => p.is_enabled !== false).length} products)
                  </option>
                ))}
              </select>

              {chosenCollection && (
                <div style={{ marginTop: "14px" }}>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 10px" }}>{enabledProducts.length} products will be published:</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {enabledProducts.map((p) => (
                      <div key={p.catalog_product_id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px", background: "var(--bg-secondary)", borderRadius: "7px", fontSize: "12px", color: "var(--text-primary)" }}>
                        <FolderOpen size={12} color="#0d9488" />{p.catalog_product_name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {collections.length === 0 && (
                <div style={{ marginTop: "12px", padding: "12px", background: "#f59e0b10", border: "1px solid #f59e0b30", borderRadius: "8px", fontSize: "12px", color: "#f59e0b", display: "flex", gap: "8px" }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  No collections found. Go to <strong>Collections</strong> to create one.
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: "12px 16px", background: "#ef444415", border: "1px solid #ef444430", borderRadius: "10px", color: "#ef4444", fontSize: "13px", display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "16px" }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{error}
              </div>
            )}

            {/* Publish button */}
            <button
              style={{ ...s.btn, width: "100%", justifyContent: "center", background: !selectedDesign || !selectedCollection || publishing ? "var(--bg-tertiary)" : "#ea580c", color: !selectedDesign || !selectedCollection || publishing ? "var(--text-muted)" : "#fff", fontSize: "14px", padding: "12px 20px" }}
              disabled={!selectedDesign || !selectedCollection || publishing}
              onClick={startPublish}
            >
              {publishing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {publishing ? "Starting…" : `Publish to ${enabledProducts.length || "?"} Products`}
            </button>
          </div>

          {/* Right: Job Progress */}
          <div>
            {!job && (
              <div style={{ ...s.card, textAlign: "center", padding: "60px 24px", color: "var(--text-muted)" }}>
                <BarChart3 size={32} style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: "14px", margin: 0 }}>Select a design and collection, then hit Publish to start.</p>
                <p style={{ fontSize: "12px", margin: "8px 0 0" }}>Your products will be automatically created in Printful.</p>
              </div>
            )}

            {job && (
              <div style={s.card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                  <div>
                    <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                      {job.design_name} → {job.collection_name}
                    </h2>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>Job started {new Date(job.started_at).toLocaleTimeString()}</p>
                  </div>
                  <span style={{
                    padding: "4px 12px", borderRadius: "99px", fontSize: "12px", fontWeight: 700,
                    background: job.status === "completed" ? "#0d948820" : job.status === "failed" ? "#ef444420" : job.status === "partial" ? "#f59e0b20" : "#ea580c20",
                    color: job.status === "completed" ? "#0d9488" : job.status === "failed" ? "#ef4444" : job.status === "partial" ? "#f59e0b" : "#ea580c",
                    border: `1px solid currentColor`,
                  }}>
                    {job.status === "running" ? "Publishing…" : job.status === "completed" ? "Completed" : job.status === "partial" ? "Partial" : "Failed"}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>
                    <span>{job.completed + job.failed} / {job.total} processed</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div style={{ height: 8, background: "var(--bg-tertiary)", borderRadius: "99px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progressPct}%`, background: job.failed > 0 ? "#f59e0b" : "#0d9488", borderRadius: "99px", transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "12px" }}>
                    <span style={{ color: "#0d9488" }}>✓ {job.completed} done</span>
                    {job.failed > 0 && <span style={{ color: "#ef4444" }}>✗ {job.failed} failed</span>}
                    {!isDone && <span style={{ color: "var(--text-muted)" }}>{job.total - job.completed - job.failed} remaining</span>}
                  </div>
                </div>

                {/* Items */}
                {job.publish_job_items && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {job.publish_job_items.map((item) => (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                        <span style={{ flexShrink: 0 }}>{STATUS_ICON[item.status] ?? STATUS_ICON.pending}</span>
                        <span style={{ flex: 1, fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{item.catalog_product_name}</span>
                        {item.status === "done" && item.printful_product_id && (
                          <span style={{ fontSize: "11px", color: "#0d9488" }}>ID: {item.printful_product_id}</span>
                        )}
                        {item.status === "failed" && item.error && (
                          <span style={{ fontSize: "11px", color: "#ef4444", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.error}>{item.error}</span>
                        )}
                        {item.status === "skipped" && (
                          <span style={{ fontSize: "11px", color: "#f59e0b" }}>Already published</span>
                        )}
                        {item.status === "running" && (
                          <span style={{ fontSize: "11px", color: "#ea580c" }}>Publishing…</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isDone && (
                  <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "10px" }}>
                    {job.status === "completed" ? (
                      <><CheckCircle2 size={16} color="#0d9488" /><span style={{ fontSize: "13px", color: "#0d9488", fontWeight: 600 }}>All products published successfully!</span></>
                    ) : job.status === "partial" ? (
                      <><AlertCircle size={16} color="#f59e0b" /><span style={{ fontSize: "13px", color: "#f59e0b", fontWeight: 600 }}>{job.completed} published, {job.failed} failed. Check Printful for details.</span></>
                    ) : (
                      <><XCircle size={16} color="#ef4444" /><span style={{ fontSize: "13px", color: "#ef4444", fontWeight: 600 }}>Publish job failed. Check logs above.</span></>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
