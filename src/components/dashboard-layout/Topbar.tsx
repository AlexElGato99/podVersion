"use client";

import { useState } from "react";
import {
  Bell,
  Sun,
  Moon,
  RefreshCw,
  Trash2,
  Settings,
  Globe,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/components/dashboard-layout/ThemeProvider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL ?? "/";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/analytics": "Analytics",
  "/dashboard/hero": "Hero Section",
  "/dashboard/quick-stats": "Quick Statistics",
  "/dashboard/sliders": "Sliders",
  "/dashboard/features": "Features",
  "/dashboard/coverage": "Global Coverage",
  "/dashboard/live-section": "Live Section",
  "/dashboard/pages": "Pages",
  "/dashboard/footer": "Footer Settings",
  "/dashboard/seo": "SEO Settings",
  "/dashboard/footer-links": "Footer Links",
  "/dashboard/contact": "Contact Page",
  "/dashboard/coupons": "Coupons",
  "/dashboard/faqs": "FAQs",
  "/dashboard/tutorials": "Tutorials",
  "/dashboard/free-trial": "Free Trial",
  "/dashboard/testimonials": "Testimonials",
  "/dashboard/blog": "Blog",
  "/dashboard/promotions": "Promotions",
  "/dashboard/users": "Users",
  "/dashboard/orders": "Orders",
  "/dashboard/notifications": "Notifications",
  "/dashboard/live-chat": "Live Chat",
  "/dashboard/pricing": "Pricing Plans",
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

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
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

        <Link
          href="/dashboard/notifications"
          className="relative w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="Notifications"
        >
          <Bell size={16} strokeWidth={1.75} />
          <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 px-0.5 bg-[var(--accent)] rounded-full flex items-center justify-center text-white text-[8px] font-bold leading-none shadow-sm">
            1
          </span>
        </Link>

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
