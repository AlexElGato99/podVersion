"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Sun,
  Moon,
  RefreshCw,
  Trash2,
  Settings,
  Globe,
  LogOut,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useTheme } from "@/components/dashboard-layout/ThemeProvider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface DashboardNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
}

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  new_order: Package,
  order_shipped: Truck,
  order_fulfilled: CheckCircle2,
  order_cancelled: XCircle,
  fulfillment_error: AlertTriangle,
};

function notifTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL ?? "/";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/hero": "Hero Section",
  "/dashboard/homepage-sections": "Homepage Sections",
  "/dashboard/categories": "Categories",
  "/dashboard/seo": "SEO Settings",
  "/dashboard/users": "Users",
  "/dashboard/orders": "Orders",
  "/dashboard/settings": "Settings",
};

function titleFromPathname(pathname: string | null): string {
  if (!pathname) return "Dashboard";
  if (TITLES[pathname]) return TITLES[pathname];
  const last = pathname.split("/").filter(Boolean).pop() ?? "Dashboard";
  return last
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const resolvedTitle = title ?? titleFromPathname(pathname);

  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    const supabase = createClient();

    const loadNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, message, read, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNotifications(data as DashboardNotification[]);
    };
    loadNotifications();

    // Live updates — new order notifications appear instantly without a page refresh.
    const channel = supabase
      .channel("dashboard-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const row = payload.new as DashboardNotification;
        setNotifications((prev) => [row, ...prev].slice(0, 20));
        showToast(row.title);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await createClient().from("notifications").update({ read: true }).eq("id", id);
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await createClient().from("notifications").update({ read: true }).in("id", unreadIds);
  };

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 700);
  };

  const handleClearCache = async () => {
    const ok = window.confirm(
      "Clear cached data for this site?\n\nThis will remove local storage, session storage, cookies and any service-worker caches. You will stay logged in only if your session uses server-side cookies."
    );
    if (!ok) return;

    try {
      window.localStorage.clear();
      window.sessionStorage.clear();

      document.cookie.split(";").forEach((c) => {
        const eq = c.indexOf("=");
        const name = (eq > -1 ? c.substr(0, eq) : c).trim();
        if (!name) return;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      });

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }

      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }

      showToast("Cache cleared");
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast("Failed to clear cache");
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <header className="relative h-14 shrink-0 flex items-center justify-between gap-4 px-5 sm:px-6 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-md shadow-[0_1px_0_var(--border-light)]">
      <div className="min-w-0 flex items-center">
        <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-primary)] truncate">
          {resolvedTitle}
        </h1>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 pl-2 border-l border-[var(--border)]/80">
        <a
          href={FRONTEND_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="Open frontend website"
          aria-label="Open frontend website"
        >
          <Globe size={16} strokeWidth={1.75} />
        </a>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-60 transition-colors"
          title="Refresh data"
          aria-label="Refresh data"
        >
          <RefreshCw
            size={16}
            strokeWidth={1.75}
            className={cn(refreshing && "animate-spin")}
          />
        </button>

        <button
          type="button"
          onClick={handleClearCache}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="Clear website cache"
          aria-label="Clear website cache"
        >
          <Trash2 size={16} strokeWidth={1.75} />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun size={16} strokeWidth={1.75} />
          ) : (
            <Moon size={16} strokeWidth={1.75} />
          )}
        </button>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={16} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 px-0.5 bg-[var(--accent)] rounded-full flex items-center justify-center text-white text-[8px] font-bold leading-none shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-80 max-h-[420px] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-xl z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] font-medium text-[var(--accent)] hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">No notifications yet.</p>
              ) : (
                <ul>
                  {notifications.map((n) => {
                    const Icon = NOTIFICATION_ICONS[n.type] ?? Bell;
                    return (
                      <li key={n.id}>
                        <Link
                          href="/dashboard/orders"
                          onClick={() => { markRead(n.id); setNotifOpen(false); }}
                          className="flex items-start gap-3 px-4 py-3 border-b border-[var(--border-light,var(--border))] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          <div className={cn("mt-0.5 w-7 h-7 shrink-0 rounded-lg flex items-center justify-center", n.read ? "bg-[var(--bg-tertiary)] text-[var(--text-muted)]" : "bg-[var(--accent)]/15 text-[var(--accent)]")}>
                            <Icon size={13} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-xs leading-snug", n.read ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)] font-semibold")}>{n.title}</p>
                            {n.message && <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{n.message}</p>}
                            <p className="text-[10px] text-[var(--text-muted)] mt-1">{notifTimeAgo(n.created_at)}</p>
                          </div>
                          {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        <Link
          href="/dashboard/settings"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="Account settings"
        >
          <Settings size={16} strokeWidth={1.75} />
        </Link>

        <div
          className="ml-1 sm:ml-2 w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center text-white text-sm font-semibold cursor-default select-none shadow-sm ring-2 ring-[var(--bg-primary)]"
          title="Account"
        >
          A
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={16} strokeWidth={1.75} />
        </button>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-4 top-[calc(100%+8px)] z-50 px-3 py-2 rounded-xl text-xs font-medium bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] shadow-lg animate-fade-in"
        >
          {toast}
        </div>
      )}
    </header>
  );
}
