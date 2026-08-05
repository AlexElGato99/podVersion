"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, Loader2, ExternalLink, Pencil, Trash2, FileText,
  CheckCircle2, AlertCircle, Search,
} from "lucide-react";

interface PageRow {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  updated_at: string;
}

export default function PagesListPage() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("pages")
      .select("id, slug, title, is_published, updated_at")
      .order("updated_at", { ascending: false });
    if (error) setMsg({ type: "error", text: error.message });
    else setPages((data ?? []) as PageRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setDeletingId(id);
    const { error } = await supabase.from("pages").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      setPages((p) => p.filter((row) => row.id !== id));
      setMsg({ type: "success", text: `"${title}" deleted.` });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  const filtered = pages.filter((p) =>
    !search.trim() ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: "var(--text-muted)" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> Loading pages…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px" }}>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Pages</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Content pages like Privacy Policy, FAQ, Shipping — each is served live at <code>veliova.com/[slug]</code>.
          </p>
        </div>
        <Link
          href="/dashboard/pages/new"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, border: "none", background: "#ea580c", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
        >
          <Plus size={15} /> Add New Page
        </Link>
      </div>

      {msg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, marginBottom: 20, border: "1px solid", fontSize: 13, fontWeight: 500, background: msg.type === "success" ? "#f0fdf4" : "#fef2f2", borderColor: msg.type === "success" ? "#bbf7d0" : "#fecaca", color: msg.type === "success" ? "#16a34a" : "#dc2626" }}>
          {msg.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {msg.text}
        </div>
      )}

      <div style={{ position: "relative", marginBottom: 16, maxWidth: 320 }}>
        <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pages…"
          style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
        />
      </div>

      <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--card-shadow)" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
            <FileText size={28} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
            <p style={{ fontSize: 13 }}>{pages.length === 0 ? "No pages yet — add your first one." : "No pages match your search."}</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary)", textAlign: "left" }}>
                  {["Title", "Slug", "Status", "Updated", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--text-primary)" }}>{p.title}</td>
                    <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 12, color: "var(--text-secondary)" }}>/{p.slug}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: p.is_published ? "#dcfce7" : "#f4f4f5",
                        color: p.is_published ? "#16a34a" : "#71717a",
                      }}>
                        {p.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {new Date(p.updated_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                        {p.is_published && (
                          <a href={`/${p.slug}`} target="_blank" rel="noreferrer" title="View live" style={{ display: "flex", width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 6, color: "var(--text-muted)" }}>
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <Link href={`/dashboard/pages/${p.id}`} title="Edit" style={{ display: "flex", width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 6, color: "var(--purple)" }}>
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={() => remove(p.id, p.title)}
                          disabled={deletingId === p.id}
                          title="Delete"
                          style={{ display: "flex", width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 6, border: "none", background: "none", color: "#dc2626", cursor: deletingId === p.id ? "wait" : "pointer" }}
                        >
                          {deletingId === p.id ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
