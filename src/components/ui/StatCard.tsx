import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number; // percentage change
  icon?: React.ComponentType<{ size?: number | string; className?: string }>;
  iconBg?: string;
  className?: string;
  highlighted?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconBg,
  className,
  highlighted,
}: StatCardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <div
      className={cn(
        "stat-card",
        highlighted &&
          "border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-900/10",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            {title}
          </span>
          <span
            className={cn(
              "text-2xl font-bold tracking-tight",
              highlighted
                ? "text-green-600 dark:text-green-400"
                : "text-[var(--text-primary)]"
            )}
          >
            {value}
          </span>
          {subtitle && (
            <span className="text-xs text-[var(--text-muted)]">{subtitle}</span>
          )}
        </div>

        {Icon && (
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              iconBg ?? "bg-[var(--bg-tertiary)]"
            )}
          >
            <Icon size={18} className={highlighted ? "text-green-600" : "text-[var(--text-secondary)]"} />
          </div>
        )}
      </div>

      {trend !== undefined && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            isPositive && "text-green-600",
            isNegative && "text-red-500",
            !isPositive && !isNegative && "text-[var(--text-muted)]"
          )}
        >
          {isPositive ? (
            <TrendingUp size={12} />
          ) : isNegative ? (
            <TrendingDown size={12} />
          ) : (
            <Minus size={12} />
          )}
          <span>
            {trend > 0 ? "+" : ""}
            {trend}% from last period
          </span>
        </div>
      )}
    </div>
  );
}
