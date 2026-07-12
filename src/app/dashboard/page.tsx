export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-center h-96 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Dashboard Ready
          </h2>
          <p className="text-[var(--text-muted)]">
            Add your project data here to display real-time analytics and metrics
          </p>
        </div>
      </div>
    </div>
  );
}
