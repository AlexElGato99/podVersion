"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import RichTextEditor from "@/components/dashboard/RichTextEditor";
import {
  ChevronLeft, Save, Loader2, CheckCircle2, AlertCircle, ExternalLink, Trash2,
} from "lucide-react";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--bg-secondary)",
  color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box",
};

export default function PageEditor() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [metaDescription, setMetaDescription] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase.from("pages").select("*").eq("id", params.id).single();
      if (error || !data) {
        setMsg({ type: "error", text: "Page not found." });
      } else {
        setTitle(data.title);
        setSlug(data.slug);
        setSlugTouched(true);
        setMetaDescription(data.meta_description ?? "");
        setContent(data.content ?? "");
        setIsPublished(data.is_published);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const save = useCallback(async () => {
    if (!title.trim() || !slug.trim()) {
      setMsg({ type: "error", text: "Title and slug are required." });
      return;
    }
    setSaving(true); setMsg(null);
    const payload = {
      title: title.trim(),
      slug: slugify(slug),
      meta_description: metaDescription.trim() || null,
      content,
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    };

    if (isNew) {
      const { data, error } = await supabase.from("pages").insert(payload).select("id").single();
      setSaving(false);
      if (error) {
        setMsg({ type: "error", text: error.message });
      } else {
        setMsg({ type: "success", text: "Page created!" });
        router.replace(`/dashboard/pages/${data.id}`);
      }
    } else {
      const { error } = await supabase.from("pages").update(payload).eq("id", params.id);
      setSaving(false);
      setMsg(error ? { type: "error", text: error.message } : { type: "success", text: "Saved!" });
      setTimeout(() => setMsg(null), 4000);
    }
  }, [title, slug, metaDescription, content, isPublished, isNew, params.id, router, supabase]);

  const remove = async () => {
    if (isNew || !window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("pages").delete().eq("id", params.id);
    setDeleting(false);
    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      router.push("/dashboard/pages");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: "var(--text-muted)" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> Loading page…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>

      <Link href="/dashboard/pages" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--text-muted)", marginBottom: 16, textDecoration: "none" }}>
        <ChevronLeft size={14} /> Back to Pages
      </Link>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          {isNew ? "New Page" : "Edit Page"}
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          {!isNew && (
            <button onClick={remove} disabled={deleting} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff1f2", color: "#dc2626", fontSize: 13, fontWeight: 600, cursor: deleting ? "wait" : "pointer" }}>
              {deleting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={13} />} Delete
            </button>
          )}
          {!isNew && isPublished && (
            <a href={`/${slug}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
              <ExternalLink size={13} /> View live
            </a>
          )}
          <button onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, border: "none", background: saving ? "var(--text-muted)" : "#ea580c", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, marginBottom: 20, border: "1px solid", fontSize: 13, fontWeight: 500, background: msg.type === "success" ? "#f0fdf4" : "#fef2f2", borderColor: msg.type === "success" ? "#bbf7d0" : "#fecaca", color: msg.type === "success" ? "#16a34a" : "#dc2626" }}>
          {msg.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {msg.text}
        </div>
      )}

      <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Title</label>
            <input type="text" value={title} onChange={(e) => onTitleChange(e.target.value)} style={inp} placeholder="Privacy Policy" />
          </div>
          <div>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
              Slug
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>/{slug || "…"}</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
              style={inp}
              placeholder="privacy"
            />
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
            Meta description <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(shown in Google search results)</span>
          </label>
          <input type="text" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} style={inp} placeholder="One or two sentences describing this page." maxLength={160} />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer", width: "fit-content" }}>
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} style={{ width: 15, height: 15 }} />
          Published (visible to visitors)
        </label>
      </div>

      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Content</label>
      <RichTextEditor value={content} onChange={setContent} placeholder="Write the page content…" />
    </div>
  );
}
