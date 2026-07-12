"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard-layout/Sidebar";
import { Topbar } from "@/components/dashboard-layout/Topbar";
import { ThemeProvider, useTheme } from "@/components/dashboard-layout/ThemeProvider";
import "./dashboard.css";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useTheme();

  return (
    <div
      className={`dashboard-root${theme === "dark" ? " dark" : ""} flex h-screen overflow-hidden`}
      style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}
    >
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <DashboardShell>{children}</DashboardShell>
    </ThemeProvider>
  );
}
