"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingCart, Loader2, RefreshCcw, Search, X, Package,
  Truck, CheckCircle2, XCircle, Clock, AlertTriangle, Copy, ExternalLink,
  DollarSign, Mail, Phone, MapPin, CreditCard,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────── */
interface ShippingAddress {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  unitAmount: number;
  variantId: number;
  imageUrl?: string;
  size?: string;
  color?: string;
}

interface Order {
  id: string;
  user_id: string | null;
  printful_order_id: string | null;
  paypal_order_id: string | null;
  status: string;
  payment_status: string | null;
  total_amount: number;
  subtotal_amount: number | null;
  shipping_amount: number | null;
  tax_amount: number | null;
  currency: string;
  email: string | null;
  shipping_address: ShippingAddress | null;
  items: OrderItem[] | null;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  fulfillment_error: string | null;
  created_at: string;
  updated_at: string | null;
}

const STATUS_FILTERS = ["all", "pending", "processing", "fulfilled", "shipped", "cancelled", "refunded"] as const;

/* ─── Badge helpers ──────────────────────────────────────── */
const STATUS_STYLES: Record<string, { bg: string; color: string; icon: React.ElementType }> = {
  pending: { bg: "#fef9c3", color: "#a16207", icon: Clock },
  processing: { bg: "#dbeafe", color: "#1d4ed8", icon: Package },
  fulfilled: { bg: "#dcfce7", color: "#16a34a", icon: CheckCircle2 },
  shipped: { bg: "#e0e7ff", color: "#4338ca", icon: Truck },
  cancelled: { bg: "#fee2e2", color: "#dc2626", icon: XCircle },
  refunded: { bg: "#f3e8ff", color: "#7e22ce", icon: XCircle },
};

const PAYMENT_STYLES: Record<string, { bg: string; color: string }> = {
  pending: { bg: "#fef9c3", color: "#a16207" },
  paid: { bg: "#dcfce7", color: "#16a34a" },
  failed: { bg: "#fee2e2", color: "#dc2626" },
  refunded: { bg: "#f3e8ff", color: "#7e22ce" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: "#f4f4f5", color: "#71717a", icon: Clock };
  const Icon = s.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, textTransform: "capitalize", whiteSpace: "nowrap" }}>
      <Icon size={11} /> {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string | null }) {
  const key = status ?? "pending";
  const s = PAYMENT_STYLES[key] ?? { bg: "#f4f4f5", color: "#71717a" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 999, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, textTransform: "capitalize", whiteSpace: "nowrap" }}>
      {key}
    </span>
  );
}

function timeAgo(iso: string) {
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

/* ─── Stat card ──────────────────────────────────────────── */
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

/* ─── Main page ──────────────────────────────────────────── */
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const supabase = createClient();

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) setError(error.message);
    else setOrders((data ?? []) as Order[]);
    setLoading(false);
    setRefreshing(false);
  }, [supabase]);

  useEffect(() => {
    load();
    // Live-update the list as new orders come in or statuses change.
    const channel = supabase
      .channel("dashboard-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const name = `${o.shipping_address?.firstName ?? ""} ${o.shipping_address?.lastName ?? ""}`.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        (o.email ?? "").toLowerCase().includes(q) ||
        (o.printful_order_id ?? "").toLowerCase().includes(q) ||
        (o.paypal_order_id ?? "").toLowerCase().includes(q) ||
        name.includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => {
    const revenue = orders.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const pending = orders.filter((o) => o.status === "pending" || o.fulfillment_error).length;
    const shipped = orders.filter((o) => o.status === "shipped" || o.status === "fulfilled").length;
    return { total: orders.length, revenue, pending, shipped };
  }, [orders]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1500);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: "var(--text-muted)" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> Loading orders…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Orders</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            All orders placed through checkout — payment, fulfillment and shipping status in one place.
          </p>
        </div>
        <button
          onClick={() => { setRefreshing(true); load(); }}
          disabled={refreshing}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 13, cursor: refreshing ? "wait" : "pointer" }}
        >
          <RefreshCcw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, marginBottom: 20, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 13, fontWeight: 500 }}>
          <AlertTriangle size={15} /> Failed to load orders: {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
        <StatCard icon={ShoppingCart} label="Total orders" value={String(stats.total)} color="#7c3aed" />
        <StatCard icon={DollarSign} label="Revenue (paid)" value={formatPrice(stats.revenue)} color="#16a34a" />
        <StatCard icon={Clock} label="Needs attention" value={String(stats.pending)} color="#d97706" />
        <StatCard icon={Truck} label="Shipped / fulfilled" value={String(stats.shipped)} color="#4338ca" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 220 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, email, order or Printful ID…"
            style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--card-shadow)" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {orders.length === 0 ? "No orders placed yet." : "No orders match your search/filter."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary)", textAlign: "left" }}>
                  {["Order", "Customer", "Items", "Total", "Payment", "Fulfillment", "Placed"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const name = `${o.shipping_address?.firstName ?? ""} ${o.shipping_address?.lastName ?? ""}`.trim();
                  const itemCount = (o.items ?? []).reduce((s, i) => s + i.quantity, 0);
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setSelected(o)}
                      style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }}
                      className="hover:bg-[var(--bg-secondary)]"
                    >
                      <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 12, color: "var(--text-secondary)" }}>
                        #{o.id.slice(0, 8)}
                        {o.fulfillment_error && (
                          <span title={o.fulfillment_error} style={{ marginLeft: 6, color: "#dc2626" }}><AlertTriangle size={12} style={{ display: "inline" }} /></span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{name || "Guest"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.email ?? "—"}</div>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-secondary)" }}>{itemCount}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--text-primary)" }}>{formatPrice(o.total_amount, o.currency)}</td>
                      <td style={{ padding: "12px 14px" }}><PaymentBadge status={o.payment_status} /></td>
                      <td style={{ padding: "12px 14px" }}><StatusBadge status={o.status} /></td>
                      <td style={{ padding: "12px 14px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{timeAgo(o.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail side panel */}
      {selected && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", justifyContent: "flex-end" }}
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(480px, 100%)", height: "100%", background: "var(--bg-primary)", overflowY: "auto", boxShadow: "-8px 0 24px rgba(0,0,0,0.15)" }}
          >
            {/* Panel header */}
            <div style={{ position: "sticky", top: 0, background: "var(--bg-primary)", borderBottom: "1px solid var(--border)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 1 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Order #{selected.id.slice(0, 8)}</h2>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>Placed {new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Status row */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <StatusBadge status={selected.status} />
                <PaymentBadge status={selected.payment_status} />
              </div>

              {selected.fulfillment_error && (
                <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 12 }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>Printful fulfillment failed</div>
                    {selected.fulfillment_error}
                  </div>
                </div>
              )}

              {/* Customer */}
              <div>
                <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 8 }}>Customer</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, color: "var(--text-primary)" }}>
                  <div style={{ fontWeight: 600 }}>{selected.shipping_address?.firstName} {selected.shipping_address?.lastName}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}><Mail size={12} /> {selected.email ?? "—"}</div>
                  {selected.shipping_address?.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}><Phone size={12} /> {selected.shipping_address.phone}</div>
                  )}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6, color: "var(--text-secondary)" }}>
                    <MapPin size={12} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>
                      {selected.shipping_address?.address}<br />
                      {selected.shipping_address?.city}, {selected.shipping_address?.state} {selected.shipping_address?.zip}<br />
                      {selected.shipping_address?.country}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 8 }}>
                  Items ({(selected.items ?? []).length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(selected.items ?? []).map((it, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "var(--bg-secondary)" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "#f4f4f5", flexShrink: 0, border: "1px solid var(--border)" }}>
                        {it.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.imageUrl} alt={it.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : null}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{it.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {[it.size, it.color].filter(Boolean).join(" · ")} {(it.size || it.color) && "· "}Qty {it.quantity}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{formatPrice(it.unitAmount * it.quantity, selected.currency)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment breakdown */}
              <div>
                <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 8 }}>Payment</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>{selected.subtotal_amount != null ? formatPrice(selected.subtotal_amount, selected.currency) : "—"}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Shipping</span><span>{selected.shipping_amount != null ? formatPrice(selected.shipping_amount, selected.currency) : "—"}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tax</span><span>{selected.tax_amount != null ? formatPrice(selected.tax_amount, selected.currency) : "—"}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "var(--text-primary)", paddingTop: 4, borderTop: "1px solid var(--border)", marginTop: 2 }}><span>Total</span><span>{formatPrice(selected.total_amount, selected.currency)}</span></div>
                  {selected.paypal_order_id && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}><CreditCard size={12} /> PayPal ID</span>
                      <button onClick={() => copy(selected.paypal_order_id!, "paypal")} style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "monospace", fontSize: 11, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                        {selected.paypal_order_id} <Copy size={11} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Fulfillment */}
              <div>
                <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 8 }}>Fulfillment (Printful)</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Printful order ID</span>
                    {selected.printful_order_id ? (
                      <button onClick={() => copy(selected.printful_order_id!, "printful")} style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "monospace", fontSize: 11, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                        {selected.printful_order_id} <Copy size={11} />
                      </button>
                    ) : <span>—</span>}
                  </div>
                  {selected.tracking_number && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Tracking</span>
                      {selected.tracking_url ? (
                        <a href={selected.tracking_url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--purple)" }}>
                          {selected.tracking_number} <ExternalLink size={11} />
                        </a>
                      ) : <span>{selected.tracking_number}</span>}
                    </div>
                  )}
                  {selected.carrier && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Carrier</span><span>{selected.carrier}</span></div>
                  )}
                </div>
                <a
                  href="https://www.printful.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 12, color: "var(--purple)", fontWeight: 600, textDecoration: "none" }}
                >
                  Open Printful dashboard <ExternalLink size={11} />
                </a>
              </div>

              {copied && (
                <div style={{ position: "fixed", bottom: 20, right: 20, background: "var(--text-primary)", color: "var(--bg-primary)", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                  Copied {copied === "paypal" ? "PayPal" : "Printful"} ID
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
