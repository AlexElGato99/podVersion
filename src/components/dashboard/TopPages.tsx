import { ExternalLink } from "lucide-react";

const pages = [
  { url: "yourdomain.com/", views: 95 },
  { url: "yourdomain.com/", views: 72 },
  { url: "yourdomain.com/tutorials/en", views: 51 },
  { url: "yourdomain.com/", views: 51 },
  { url: "yourdomain.com/", views: 36 },
  { url: "yourdomain.com/tutorials", views: 31 },
  { url: "yourdomain.com/checkout/1", views: 30 },
  { url: "yourdomain.com/trial/en", views: 24 },
  { url: "yourdomain.com/en", views: 22 },
  { url: "yourdomain.com/en", views: 21 },
];

const maxViews = Math.max(...pages.map((p) => p.views));

export function TopPages() {
  return (
    <div className="card p-5 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Top Pages
        </h2>
        <span className="text-xs text-[var(--text-muted)]">Last 30 days</span>
      </div>

      <div className="space-y-1">
        {/* Header */}
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="table-header">Page</span>
          <span className="table-header">Views</span>
        </div>

        {pages.map((page, i) => (
          <div
            key={i}
            className="group relative flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            {/* Bar background */}
            <div
              className="absolute left-0 top-0 bottom-0 rounded-lg bg-[var(--bg-tertiary)] dark:bg-[var(--bg-tertiary)] transition-all"
              style={{ width: `${(page.views / maxViews) * 100}%`, opacity: 0.6 }}
            />
            <span className="relative text-xs text-[var(--text-secondary)] truncate max-w-[160px] group-hover:text-[var(--text-primary)] transition-colors">
              {page.url}
            </span>
            <span className="relative text-xs font-semibold text-[var(--text-primary)] ml-2 shrink-0">
              {page.views}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
