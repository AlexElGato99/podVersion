"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users as UsersIcon, Loader2, RefreshCcw, Search, ShieldCheck, Shield,
  Ban, CheckCircle2, Trash2, AlertTriangle, Mail, MailCheck, X, ShoppingBag, UserPlus,
} from "lucide-react";

interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned: boolean;
  order_count: number;
}

const ROLE_FILTERS = ["all", "admin", "customer"] as const;

function timeAgo(iso: string | null) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function initials(name: string | null, email: string) {
  const source = (name?.trim() || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--card-shadow)" }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}1a`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        <Icon size={17} strokeWidth={1.75} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUserRow | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", password: "", full_name: "", role: "customer" as "customer" | "admin" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load users");
      setUsers(json.users);
      setCurrentUserId(json.currentUserId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Keep the list fresh as new accounts are created — cheap since it's admin-only.
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const showMsg = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    window.setTimeout(() => setMsg(null), 4000);
  };

  const toggleRole = async (u: AdminUserRow) => {
    const newRole = u.role === "admin" ? "customer" : "admin";
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update role");
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
      showMsg("success", `${u.email} is now ${newRole === "admin" ? "an admin" : "a customer"}.`);
    } catch (e) {
      showMsg("error", (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleBan = async (u: AdminUserRow) => {
    const nextBanned = !u.banned;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: nextBanned }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update account status");
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, banned: nextBanned } : x)));
      showMsg("success", `${u.email} ${nextBanned ? "has been banned" : "has been unbanned"}.`);
    } catch (e) {
      showMsg("error", (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (u: AdminUserRow) => {
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete user");
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      showMsg("success", `${u.email} has been deleted.`);
    } catch (e) {
      showMsg("error", (e as Error).message);
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({ email: "", password: "", full_name: "", role: "customer" });
    setCreateError(null);
  };

  const createUser = async () => {
    setCreateError(null);
    const email = createForm.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCreateError("Enter a valid email address.");
      return;
    }
    if (createForm.password.length < 8) {
      setCreateError("Password must be at least 8 characters.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: createForm.password,
          full_name: createForm.full_name.trim() || undefined,
          role: createForm.role,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create user");
      showMsg("success", `Account created for ${email}.`);
      setShowAddUser(false);
      resetCreateForm();
      load();
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return u.email.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q);
    });
  }, [users, search, roleFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    banned: users.filter((u) => u.banned).length,
    unconfirmed: users.filter((u) => !u.email_confirmed_at).length,
  }), [users]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: "var(--text-muted)" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> Loading users…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Users</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Manage every account — promote admins, ban bad actors, or remove accounts.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => { setRefreshing(true); load(); }}
            disabled={refreshing}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 13, cursor: refreshing ? "wait" : "pointer" }}
          >
            <RefreshCcw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={() => { resetCreateForm(); setShowAddUser(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <UserPlus size={13} /> Add user
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, marginBottom: 20, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 13, fontWeight: 500 }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {msg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, marginBottom: 20, border: "1px solid", fontSize: 13, fontWeight: 500, background: msg.type === "success" ? "#f0fdf4" : "#fef2f2", borderColor: msg.type === "success" ? "#bbf7d0" : "#fecaca", color: msg.type === "success" ? "#16a34a" : "#dc2626" }}>
          {msg.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} {msg.text}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
        <StatCard icon={UsersIcon} label="Total users" value={String(stats.total)} color="#7c3aed" />
        <StatCard icon={ShieldCheck} label="Admins" value={String(stats.admins)} color="#1d4ed8" />
        <StatCard icon={Ban} label="Banned" value={String(stats.banned)} color="#dc2626" />
        <StatCard icon={Mail} label="Unconfirmed email" value={String(stats.unconfirmed)} color="#d97706" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 220 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
        >
          {ROLE_FILTERS.map((r) => (
            <option key={r} value={r}>{r === "all" ? "All roles" : r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--card-shadow)" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {users.length === 0 ? "No users yet." : "No users match your search/filter."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary)", textAlign: "left" }}>
                  {["User", "Role", "Orders", "Email", "Joined", "Last sign-in", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isBusy = busyId === u.id;
                  return (
                    <tr key={u.id} style={{ borderTop: "1px solid var(--border)", opacity: u.banned ? 0.6 : 1 }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 999, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, overflow: "hidden" }}>
                            {u.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : initials(u.full_name, u.email)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                              {u.full_name || "Unnamed"}
                              {isSelf && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-tertiary)", padding: "1px 6px", borderRadius: 999 }}>You</span>}
                              {u.banned && <Ban size={12} color="#dc2626" />}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, background: u.role === "admin" ? "#dbeafe" : "#f4f4f5", color: u.role === "admin" ? "#1d4ed8" : "#71717a", fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>
                          {u.role === "admin" ? <ShieldCheck size={11} /> : <Shield size={11} />} {u.role}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-secondary)" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><ShoppingBag size={12} /> {u.order_count}</span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        {u.email_confirmed_at ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#16a34a", fontSize: 11, fontWeight: 600 }}><MailCheck size={12} /> Verified</span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#d97706", fontSize: 11, fontWeight: 600 }}><Mail size={12} /> Unverified</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{timeAgo(u.created_at)}</td>
                      <td style={{ padding: "12px 14px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{timeAgo(u.last_sign_in_at)}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            onClick={() => toggleRole(u)}
                            disabled={isBusy || isSelf}
                            title={isSelf ? "You can't change your own role" : u.role === "admin" ? "Demote to customer" : "Promote to admin"}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 9px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, cursor: isSelf ? "not-allowed" : "pointer", opacity: isSelf ? 0.5 : 1 }}
                          >
                            {u.role === "admin" ? <Shield size={11} /> : <ShieldCheck size={11} />}
                            {u.role === "admin" ? "Demote" : "Promote"}
                          </button>
                          <button
                            onClick={() => toggleBan(u)}
                            disabled={isBusy || isSelf}
                            title={isSelf ? "You can't ban your own account" : u.banned ? "Unban" : "Ban"}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 9px", borderRadius: 7, border: `1px solid ${u.banned ? "#bbf7d0" : "#fecaca"}`, background: u.banned ? "#f0fdf4" : "#fff1f2", color: u.banned ? "#16a34a" : "#dc2626", fontSize: 11, fontWeight: 600, cursor: isSelf ? "not-allowed" : "pointer", opacity: isSelf ? 0.5 : 1 }}
                          >
                            {u.banned ? <CheckCircle2 size={11} /> : <Ban size={11} />}
                            {u.banned ? "Unban" : "Ban"}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(u)}
                            disabled={isBusy || isSelf}
                            title={isSelf ? "You can't delete your own account" : "Delete user"}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 9px", borderRadius: 7, border: "1px solid #fecaca", background: "#fff1f2", color: "#dc2626", fontSize: 11, fontWeight: 600, cursor: isSelf ? "not-allowed" : "pointer", opacity: isSelf ? 0.5 : 1 }}
                          >
                            {isBusy ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={11} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(420px, 100%)", background: "var(--bg-primary)", borderRadius: 14, padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#dc2626" }}>
                <AlertTriangle size={18} />
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>Delete this user?</h3>
              </div>
              <button onClick={() => setConfirmDelete(null)} style={{ width: 26, height: 26, borderRadius: 8, border: "none", background: "var(--bg-secondary)", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={14} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
              This will permanently delete <strong style={{ color: "var(--text-primary)" }}>{confirmDelete.email}</strong>&apos;s account. This cannot be undone. Their past orders will remain on record but will no longer be linked to an account.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                onClick={() => deleteUser(confirmDelete)}
                disabled={busyId === confirmDelete.id}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                {busyId === confirmDelete.id ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={13} />}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add user modal */}
      {showAddUser && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => { if (!creating) setShowAddUser(false); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(440px, 100%)", background: "var(--bg-primary)", borderRadius: 14, padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <UserPlus size={18} color="var(--accent)" />
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>Add a new user</h3>
              </div>
              <button
                onClick={() => { if (!creating) setShowAddUser(false); }}
                style={{ width: 26, height: 26, borderRadius: 8, border: "none", background: "var(--bg-secondary)", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <X size={14} />
              </button>
            </div>

            {createError && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, marginBottom: 14, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 12.5, fontWeight: 500 }}>
                <AlertTriangle size={14} /> {createError}
              </div>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); createUser(); }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Full name</span>
                <input
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Jane Doe"
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Email *</span>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@example.com"
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Temporary password *</span>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="At least 8 characters"
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Share this with the user — they can change it after signing in.</span>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Role</span>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as "customer" | "admin" }))}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                >
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => { if (!creating) setShowAddUser(false); }}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: creating ? "wait" : "pointer" }}
                >
                  {creating ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <UserPlus size={13} />}
                  Create user
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
