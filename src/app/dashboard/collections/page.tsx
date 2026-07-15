"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  FolderOpen, Plus, Trash2, Search, Loader2, Save,
  ChevronDown, ChevronUp, Check, RefreshCw, X, PackageCheck,
} from "lucide-react";

interface CatalogProduct {
  id: number;
  name: string;
  image: string;
  type: string;
}

interface CollectionProduct {
  catalog_product_id: number;
  catalog_product_name: string;
  catalog_product_image?: string;
  placement?: string;
  default_price?: string;
  is_enabled?: boolean;
}

interface Collection {
  id?: string;
  name: string;
  description?: string;
  collection_products?: CollectionProduct[];
}

const s: Record<string, React.CSSProperties> = {
  page:  { padding: "24px" },
  card:  { background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "12px" },
  input: { width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" },
  label: { display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  btn:   { display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none" },
};

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [saving, setSaving]           = useState<string | null>(null);
  const [savedIds, setSavedIds]       = useState<Set<string>>(new Set());

  // Catalog picker state
  const [pickerOpen, setPickerOpen]   = useState<string | null>(null); // collection id
  const [catalog, setCatalog]         = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch]   = useState("");

  // New collection form
  const [creating, setCreating]       = useState(false);
  const [newName, setNewName]         = useState("");
  const [newDesc, setNewDesc]         = useState("");
  const [search, setSearch]           = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/collections");
    const data = await res.json();
    setCollections(data.collections ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadCatalog() {
    if (catalog.length > 0) return;
    setCatalogLoading(true);
    const res = await fetch("/api/catalog?limit=100&offset=0");
    const data = await res.json();
    setCatalog(data.products ?? []);
    setCatalogLoading(false);
  }

  function updateCollection(id: string, patch: Partial<Collection>) {
    setCollections((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));
  }

  function toggleProduct(collectionId: string, catProduct: CatalogProduct) {
    setCollections((prev) => prev.map((c) => {
      if (c.id !== collectionId) return c;
      const existing = (c.collection_products ?? []).find((p) => p.catalog_product_id === catProduct.id);
      const products = existing
        ? (c.collection_products ?? []).filter((p) => p.catalog_product_id !== catProduct.id)
        : [...(c.collection_products ?? []), {
            catalog_product_id: catProduct.id,
            catalog_product_name: catProduct.name,
            catalog_product_image: catProduct.image,
            placement: "front",
            default_price: "24.99",
            is_enabled: true,
          }];
      return { ...c, collection_products: products };
    }));
  }

  async function saveCollection(id: string) {
    setSaving(id);
    const coll = collections.find((c) => c.id === id);
    if (!coll) return;
    await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: coll.id,
        name: coll.name,
        description: coll.description,
        products: coll.collection_products ?? [],
      }),
    });
    setSaving(null);
    setSavedIds((prev) => new Set(prev).add(id));
    setTimeout(() => setSavedIds((prev) => { const n = new Set(prev); n.delete(id); return n; }), 2500);
  }

  async function createCollection() {
    if (!newName.trim()) return;
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), products: [] }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Failed to create collection"); return; }
    setCreating(false);
    setNewName(""); setNewDesc("");
    await load();
    if (data.id) setExpandedId(data.id);
  }

  async function deleteCollection(id: string) {
    if (!confirm("Delete this collection?")) return;
    await fetch(`/api/collections?id=${id}`, { method: "DELETE" });
    load();
  }

  const filteredCollections = collections.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredCatalog = catalog.filter((p) =>
    p.name.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 36, height: 36, borderRadius: "10px", background: "#0d948822", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FolderOpen size={18} color="#0d9488" />
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Collections</h1>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>Group Printful products into reusable collections for publishing</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{ ...s.btn, background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)" }} onClick={load}>
            <RefreshCw size={13} />
          </button>
          <button style={{ ...s.btn, background: "#0d9488", color: "#fff" }} onClick={() => setCreating(true)}>
            <Plus size={14} /> New Collection
          </button>
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div style={{ ...s.card, border: "1px solid #0d948840", background: "#0d948808" }}>
          <h3 style={{ fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px", fontSize: "14px" }}>New Collection</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={s.label}>Collection Name *</label>
              <input style={s.input} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Everything, Summer 2025, Hoodies" autoFocus />
            </div>
            <div>
              <label style={s.label}>Description</label>
              <input style={s.input} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional description" />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{ ...s.btn, background: "#0d9488", color: "#fff" }} onClick={createCollection}><Check size={13} /> Create</button>
            <button style={{ ...s.btn, background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }} onClick={() => setCreating(false)}><X size={13} /> Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "16px" }}>
        <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input style={{ ...s.input, paddingLeft: "36px" }} placeholder="Search collections…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px", color: "var(--text-muted)" }}>
          <Loader2 size={22} className="animate-spin" /><span style={{ marginLeft: 10 }}>Loading…</span>
        </div>
      )}

      {/* Collection list */}
      {!loading && filteredCollections.map((coll) => {
        const isExpanded = expandedId === coll.id;
        const isSaving   = saving === coll.id;
        const isSaved    = savedIds.has(coll.id!);
        const productCount = (coll.collection_products ?? []).length;
        const enabledCount = (coll.collection_products ?? []).filter((p) => p.is_enabled !== false).length;

        return (
          <div key={coll.id} style={s.card}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : coll.id!)}>
              <div style={{ width: 38, height: 38, borderRadius: "10px", background: "#0d948815", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FolderOpen size={18} color="#0d9488" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, color: "var(--text-primary)", margin: 0, fontSize: "14px" }}>{coll.name}</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                  {productCount} products · {enabledCount} enabled {coll.description ? `· ${coll.description}` : ""}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button style={{ ...s.btn, padding: "5px 8px", background: "#ef444415", color: "#ef4444", border: "1px solid #ef444430" }} onClick={(e) => { e.stopPropagation(); deleteCollection(coll.id!); }}>
                  <Trash2 size={13} />
                </button>
                {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
              </div>
            </div>

            {/* Expanded panel */}
            {isExpanded && (
              <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
                {/* Name + description edit */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <div>
                    <label style={s.label}>Collection Name</label>
                    <input style={s.input} value={coll.name} onChange={(e) => updateCollection(coll.id!, { name: e.target.value })} />
                  </div>
                  <div>
                    <label style={s.label}>Description</label>
                    <input style={s.input} value={coll.description ?? ""} onChange={(e) => updateCollection(coll.id!, { description: e.target.value })} placeholder="Optional" />
                  </div>
                </div>

                {/* Products in collection */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <label style={{ ...s.label, marginBottom: 0 }}>Products in this collection ({enabledCount} enabled)</label>
                    <button
                      style={{ ...s.btn, padding: "5px 12px", fontSize: "12px", background: "#0d948815", color: "#0d9488", border: "1px solid #0d948830" }}
                      onClick={() => { setPickerOpen(pickerOpen === coll.id ? null : coll.id!); loadCatalog(); }}
                    >
                      <Plus size={12} /> Add Products
                    </button>
                  </div>

                  {(coll.collection_products ?? []).length === 0 ? (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", padding: "16px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "8px" }}>
                      No products yet. Click &quot;Add Products&quot; to add from the Printful catalog.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {(coll.collection_products ?? []).map((cp) => (
                        <div key={cp.catalog_product_id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                          {cp.catalog_product_image && (
                            <Image src={cp.catalog_product_image} alt={cp.catalog_product_name} width={36} height={36} style={{ borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} unoptimized />
                          )}
                          <span style={{ flex: 1, fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{cp.catalog_product_name}</span>
                          <input
                            style={{ ...s.input, width: 90, padding: "4px 8px" }}
                            value={cp.placement ?? "front"}
                            onChange={(e) => updateCollection(coll.id!, {
                              collection_products: (coll.collection_products ?? []).map((p) =>
                                p.catalog_product_id === cp.catalog_product_id ? { ...p, placement: e.target.value } : p
                              ),
                            })}
                            placeholder="front"
                            title="Placement (front/back)"
                          />
                          <input
                            style={{ ...s.input, width: 80, padding: "4px 8px" }}
                            value={cp.default_price ?? "24.99"}
                            onChange={(e) => updateCollection(coll.id!, {
                              collection_products: (coll.collection_products ?? []).map((p) =>
                                p.catalog_product_id === cp.catalog_product_id ? { ...p, default_price: e.target.value } : p
                              ),
                            })}
                            placeholder="Price"
                          />
                          <button
                            style={{ ...s.btn, padding: "4px 8px", background: cp.is_enabled !== false ? "#0d948820" : "var(--bg-tertiary)", color: cp.is_enabled !== false ? "#0d9488" : "var(--text-muted)", border: "1px solid var(--border)", fontSize: "11px" }}
                            onClick={() => updateCollection(coll.id!, {
                              collection_products: (coll.collection_products ?? []).map((p) =>
                                p.catalog_product_id === cp.catalog_product_id ? { ...p, is_enabled: !p.is_enabled } : p
                              ),
                            })}
                          >
                            {cp.is_enabled !== false ? <Check size={11} /> : <X size={11} />}
                            {cp.is_enabled !== false ? "On" : "Off"}
                          </button>
                          <button
                            style={{ ...s.btn, padding: "4px 8px", background: "#ef444415", color: "#ef4444", border: "1px solid #ef444430" }}
                            onClick={() => toggleProduct(coll.id!, { id: cp.catalog_product_id, name: cp.catalog_product_name, image: cp.catalog_product_image ?? "", type: "" })}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Catalog picker */}
                {pickerOpen === coll.id && (
                  <div style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "16px", marginBottom: "16px", background: "var(--bg-secondary)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                      <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>Browse Printful Catalog</span>
                      <button style={{ ...s.btn, padding: "4px 8px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }} onClick={() => setPickerOpen(null)}><X size={13} /></button>
                    </div>
                    <input style={{ ...s.input, marginBottom: "12px" }} placeholder="Search catalog…" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} />
                    {catalogLoading ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", color: "var(--text-muted)" }}>
                        <Loader2 size={16} className="animate-spin" /><span style={{ marginLeft: 8 }}>Loading catalog…</span>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px", maxHeight: "360px", overflowY: "auto" }}>
                        {filteredCatalog.map((cp) => {
                          const added = (coll.collection_products ?? []).some((p) => p.catalog_product_id === cp.id);
                          return (
                            <button
                              key={cp.id}
                              onClick={() => toggleProduct(coll.id!, cp)}
                              style={{ padding: "10px", borderRadius: "8px", border: `2px solid ${added ? "#0d9488" : "var(--border)"}`, background: added ? "#0d948810" : "var(--bg-primary)", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                            >
                              <Image src={cp.image} alt={cp.name} width={60} height={60} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "6px", marginBottom: "6px" }} unoptimized />
                              <p style={{ fontSize: "11px", fontWeight: 600, color: added ? "#0d9488" : "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{cp.name}</p>
                              {added && <span style={{ fontSize: "10px", color: "#0d9488", marginTop: "3px", display: "block" }}>✓ Added</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Save button */}
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                  <button
                    style={{ ...s.btn, background: isSaved ? "#0d9488" : "#ea580c", color: "#fff", minWidth: 130, justifyContent: "center" }}
                    onClick={() => saveCollection(coll.id!)}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : isSaved ? <PackageCheck size={14} /> : <Save size={14} />}
                    {isSaved ? "Saved!" : isSaving ? "Saving…" : "Save Collection"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!loading && collections.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
          <FolderOpen size={32} style={{ margin: "0 auto 12px" }} />
          <p>No collections yet. Create your first collection above.</p>
        </div>
      )}
    </div>
  );
}
