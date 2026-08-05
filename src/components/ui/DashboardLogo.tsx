"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "icon";
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: { mark: 28, text: "text-base", gap: "gap-1.5" },
  md: { mark: 34, text: "text-lg", gap: "gap-2" },
  lg: { mark: 40, text: "text-xl", gap: "gap-2.5" },
  xl: { mark: 44, text: "text-xl", gap: "gap-2.5" },
};

// Source SVGs are 30x20 (viewBox "0 0 30 20") — keep the mark's box at that
// aspect ratio instead of forcing it square, so the artwork isn't stretched.
const MARK_ASPECT = 20 / 30;

/**
 * Swaps between the two supplied logo files based on the dashboard's theme.
 * `dark:` here follows the `.dark` class on `.dashboard-root`
 * (see the `@custom-variant dark` remap in globals.css), not the OS setting.
 */
function LogoMark({
  size,
  label,
  className,
}: {
  size: number;
  label: string;
  className?: string;
}) {
  const height = Math.round(size * MARK_ASPECT);
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-light.svg"
        alt={label}
        width={size}
        height={height}
        className="absolute inset-0 h-full w-full object-contain dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-dark.svg"
        alt={label}
        width={size}
        height={height}
        className="absolute inset-0 hidden h-full w-full object-contain dark:block"
      />
    </span>
  );
}

export function Logo({ variant = "full", className, size = "md" }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("inline-flex items-center", s.gap, className)}>
      <LogoMark size={s.mark} label="Veliova logo" />
      {variant === "full" && (
        <span className={cn("font-black tracking-tight text-[var(--text-primary)] dark:text-white", s.text)}>
          Veliova
        </span>
      )}
    </div>
  );
}

/* Always shows the light (white-fill) logo mark — for use on a dark
   background regardless of the dashboard's own theme setting. */
export function LogoDark({ variant = "full", className, size = "md" }: LogoProps) {
  const s = sizes[size];
  const height = Math.round(s.mark * MARK_ASPECT);

  return (
    <div className={cn("inline-flex items-center", s.gap, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-dark.svg"
        alt="Veliova logo"
        width={s.mark}
        height={height}
        className="shrink-0 object-contain"
        style={{ width: s.mark, height }}
      />
      {variant === "full" && (
        <span className={cn("font-black tracking-tight text-white", s.text)}>
          Veliova
        </span>
      )}
    </div>
  );
}
