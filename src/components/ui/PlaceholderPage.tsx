import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
        <Construction size={22} className="text-[var(--text-muted)]" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
          {description ?? "This section is ready to be built. Add your content here."}
        </p>
      </div>
    </div>
  );
}
