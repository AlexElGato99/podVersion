"use client";

import { useState } from "react";
import { RefreshCcw, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

function SyncProductsButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const sync = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/admin/revalidate-products", { method: "POST" });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 4000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <button
        onClick={sync}
        disabled={status === "loading"}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 8, border: "none", background: status === "loading" ? "var(--text-muted)" : "#ea580c", color: "#fff", fontSize: 14, fontWeight: 600, cursor: status === "loading" ? "wait" : "pointer" }}
      >
        {status === "loading" ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCcw size={15} />}
        {status === "loading" ? "Syncing…" : "Sync Products Now"}
      </button>
      {status === "ok" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#16a34a", fontWeight: 500 }}>
          <CheckCircle2 size={14} /> Store updated — new products will appear within seconds.
        </div>
      )}
      {status === "error" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#dc2626", fontWeight: 500 }}>
          <AlertTriangle size={14} /> Sync failed — try again.
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Product Sync</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>
          After publishing a new product on Printful or Printify, click this button to immediately refresh the store — otherwise new products appear automatically within 60 seconds.
        </p>
        <SyncProductsButton />
      </div>
    </div>
  );
}

