"use client";

import { useEffect, useState } from "react";

export function LiveVisitors() {
  const [count, setCount] = useState(0);

  // Simulate live visitor count
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(Math.floor(Math.random() * 5));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="stat-card relative overflow-hidden">
      <div className="flex items-center gap-2">
        <span className="live-dot" />
        <span className="text-xs font-medium text-green-600 dark:text-green-400">
          Live Now
        </span>
      </div>
      <div>
        <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">
          {count}
        </p>
        <p className="text-xs text-[var(--text-muted)]">Active visitors</p>
      </div>

      {/* Subtle pulse ring */}
      <div className="absolute top-4 right-4 w-8 h-8">
        <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-20 animate-ping" />
        <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 m-2" />
      </div>
    </div>
  );
}
