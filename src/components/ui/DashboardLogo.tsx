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

function LogoMark({
  size,
  label,
  className,
}: {
  size: number;
  label: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={label}
      role="img"
      className={className}
    >
      <rect x="3" y="3" width="42" height="42" rx="13" fill="currentColor" opacity="0.1" />
      <path
        d="M11.5 10.5H19L24 27.5L29 10.5H36.5L27.25 37.5H20.75L11.5 10.5Z"
        fill="currentColor"
      />
      <path
        d="M18 37.5H30"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

export function Logo({ variant = "full", className, size = "md" }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("inline-flex items-center", s.gap, className)}>
      <LogoMark
        size={s.mark}
        label="Veliova logo"
        className="shrink-0 text-brand-600 dark:text-white"
      />
      {variant === "full" && (
        <span className={cn("font-black tracking-tight text-[var(--text-primary)] dark:text-white", s.text)}>
          Veliova
        </span>
      )}
    </div>
  );
}

/* Dark variant with inverted colors for use on dark bg */
export function LogoDark({ variant = "full", className, size = "md" }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("inline-flex items-center", s.gap, className)}>
      <LogoMark size={s.mark} label="Veliova logo" className="shrink-0 text-white" />
      {variant === "full" && (
        <span className={cn("font-black tracking-tight text-white", s.text)}>
          Veliova
        </span>
      )}
    </div>
  );
}
