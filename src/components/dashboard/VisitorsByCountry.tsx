const countries = [
  { name: "United States", flag: "🇺🇸", percent: 60.6, count: 77 },
  { name: "Morocco", flag: "🇲🇦", percent: 13.4, count: 17 },
  { name: "India", flag: "🇮🇳", percent: 8.7, count: 11 },
  { name: "Canada", flag: "🇨🇦", percent: 5.5, count: 7 },
  { name: "Germany", flag: "🇩🇪", percent: 4.7, count: 6 },
  { name: "Brazil", flag: "🇧🇷", percent: 1.6, count: 2 },
  { name: "New Zealand", flag: "🇳🇿", percent: 1.6, count: 2 },
  { name: "Russia", flag: "🇷🇺", percent: 1.6, count: 2 },
  { name: "China", flag: "🇨🇳", percent: 0.8, count: 1 },
];

export function VisitorsByCountry() {
  return (
    <div className="card p-5 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Visitors by Country
        </h2>
        <span className="text-xs text-[var(--text-muted)]">
          Top 10 countries · Last 30 days
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        {countries.map((c) => (
          <div key={c.name} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{c.flag}</span>
                <span className="text-sm text-[var(--text-secondary)]">
                  {c.name}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span>{c.percent}%</span>
                <span className="font-semibold text-[var(--text-primary)] w-4 text-right">
                  {c.count}
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-400 dark:bg-purple-500 transition-all duration-700"
                style={{ width: `${c.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
