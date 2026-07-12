"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { date: "26 Apr", visitors: 8 },
  { date: "27 Apr", visitors: 12 },
  { date: "28 Apr", visitors: 10 },
  { date: "29 Apr", visitors: 15 },
  { date: "30 Apr", visitors: 9 },
  { date: "01 May", visitors: 7 },
  { date: "02 May", visitors: 11 },
  { date: "03 May", visitors: 18 },
  { date: "04 May", visitors: 29 },
  { date: "05 May", visitors: 24 },
  { date: "06 May", visitors: 31 },
  { date: "07 May", visitors: 19 },
  { date: "08 May", visitors: 14 },
  { date: "09 May", visitors: 10 },
  { date: "10 May", visitors: 4 },
];

const stats = [
  { label: "Page Views", value: "858" },
  { label: "Sessions", value: "134" },
  { label: "Bounce", value: "54%" },
  { label: "New", value: "133" },
];

const visitors = [
  { label: "Year to Date", value: "134" },
  { label: "Last Year", value: "0" },
  { label: "Lifetime", value: "134" },
  { label: "Total Revenue", value: "$0.00", highlight: true },
];

export function VisitorChart() {
  return (
    <div className="card p-5 flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Visitor Traffic
          </h2>
          <p className="text-xs text-[var(--text-muted)]">Last 15 days</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span>{s.label}</span>
              <span className="font-semibold text-[var(--text-primary)]">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="podGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="4 4"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="visitors"
              stroke="#a855f7"
              strokeWidth={2}
              fill="url(#podGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#a855f7", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer stats */}
      <div className="grid grid-cols-4 gap-4 pt-1 border-t border-[var(--border)]">
        {visitors.map((v) => (
          <div key={v.label} className="text-center">
            <p className="text-xs text-[var(--text-muted)]">{v.label}</p>
            <p
              className={
                v.highlight
                  ? "text-sm font-bold text-green-500"
                  : "text-sm font-bold text-[var(--text-primary)]"
              }
            >
              {v.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
