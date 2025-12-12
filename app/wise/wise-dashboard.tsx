"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type WiseRow = {
  id: number;
  merchant_name: string | null;
  payment_date: string | null;
  amount_gbp: string | null;
};

type WiseSummary = {
  ok: boolean;
  months: number;
  all_time: { total_gbp: string | null; payments: number };
  monthly: { month: string; total_gbp: string | null; payments: number }[];
} | null;

type WiseChart = {
  ok: boolean;
  months: number;
  rows: { month: string; merchant_name: string | null; total_gbp: string | null }[];
  merchants: string[];
} | null;

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2,
});

function formatDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toISOString().slice(0, 10);
}

function formatGBP(n: string | null) {
  if (!n) return "-";
  const num = Number(n);
  if (!Number.isFinite(num)) return n;
  return num.toFixed(2);
}

function monthLabel(yyyyMm: string) {
  // "2025-12" -> "Dec 2025"
  const [y, m] = yyyyMm.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleString("en-GB", { month: "short", year: "numeric" });
}

function shortMerchant(name: string) {
  // make legend readable (you can tweak rules as you like)
  return name
    .replace(/^GC re\s+/i, "")
    .replace(/\s+Limited$/i, "")
    .replace(/\s+LTD$/i, "")
    .replace(/\s+PLC$/i, "")
    .replace(/\s+UTILITIES\s+/i, " ")
    .trim();
}

/**
 * Curated palette (modern, readable, not neon).
 * We assign merchants in order to this palette and keep it stable.
 */
const PALETTE = [
  "#2563EB", // blue
  "#16A34A", // green
  "#F59E0B", // amber
  "#7C3AED", // purple
  "#DC2626", // red
  "#0EA5E9", // sky
  "#14B8A6", // teal
  "#EA580C", // orange
];

function Card({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
        {value}
      </div>
      {sub ? <div className="mt-1 text-sm text-gray-500">{sub}</div> : null}
    </div>
  );
}

function LegendPills({
  merchants,
  colors,
}: {
  merchants: string[];
  colors: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {merchants.map((m) => (
        <div
          key={m}
          className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700"
          title={m}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: colors[m] }}
          />
          <span className="max-w-[220px] truncate">{shortMerchant(m)}</span>
        </div>
      ))}
    </div>
  );
}

export default function WiseDashboard({
  rows,
  summary,
  chart,
}: {
  rows: WiseRow[];
  summary: WiseSummary;
  chart: WiseChart;
}) {
  const merchants = chart?.merchants ?? [];

  const merchantColors = useMemo(() => {
    const map: Record<string, string> = {};
    merchants.forEach((m, idx) => {
      map[m] = PALETTE[idx % PALETTE.length];
    });
    return map;
  }, [merchants]);

  const chartData = useMemo(() => {
    if (!chart?.rows?.length) return [];

    const byMonth: Record<string, any> = {};

    for (const r of chart.rows) {
      const month = r.month;
      const merchant = r.merchant_name ?? "Unknown";
      const amt = r.total_gbp ? Number(r.total_gbp) : 0;

      if (!byMonth[month]) byMonth[month] = { month };
      byMonth[month][merchant] = (byMonth[month][merchant] ?? 0) + amt;
    }

    const months = Object.keys(byMonth).sort();
    return months.map((m) => {
      const obj = { ...byMonth[m] };
      for (const merchant of merchants) obj[merchant] = obj[merchant] ?? 0;
      return obj;
    });
  }, [chart, merchants]);

  const allTimeTotal = summary?.all_time?.total_gbp ?? null;
  const allTimePayments = summary?.all_time?.payments ?? 0;

  const lastSixTotal = useMemo(() => {
    if (!summary?.monthly?.length) return null;
    const total = summary.monthly.reduce(
      (acc, m) => acc + Number(m.total_gbp ?? 0),
      0
    );
    return total;
  }, [summary]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gray-900 text-white grid place-items-center shadow-sm">
              £
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
                Wise Direct Debits
              </h1>
              <p className="text-sm text-gray-600">
                Monthly spend breakdown by merchant.
              </p>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card
            title="All-time total"
            value={allTimeTotal ? gbp.format(Number(allTimeTotal)) : "—"}
            sub={`${allTimePayments} payments`}
          />
          <Card
            title="Last 6 months total"
            value={lastSixTotal !== null ? gbp.format(lastSixTotal) : "—"}
            sub="Sum across recent months"
          />
          <Card
            title="Merchants"
            value={`${merchants.length}`}
            sub="Unique merchants detected"
          />
        </div>

        {/* Chart block */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Monthly totals (stacked)
              </div>
              <div className="text-xs text-gray-500">
                Last {chart?.months ?? 12} months
              </div>
            </div>

            {/* Legend pills */}
            <div className="sm:max-w-[60%]">
              <LegendPills merchants={merchants} colors={merchantColors} />
            </div>
          </div>

          <div className="mt-5">
            {chartData.length === 0 ? (
              <div className="text-sm text-gray-500">No chart data yet.</div>
            ) : (
              <div style={{ width: "100%", height: 360 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    barCategoryGap={18}
                    barGap={4}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tickFormatter={(v) => monthLabel(String(v))}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={60}
                      tickFormatter={(v) => gbp.format(Number(v)).replace(".00", "")}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.03)" }}
                      formatter={(value: any, name: any) => [
                        gbp.format(Number(value)),
                        shortMerchant(String(name)),
                      ]}
                      labelFormatter={(label) => `Month: ${monthLabel(String(label))}`}
                    />

                    {/* Stacked bars (no weird rounding per segment) */}
                    {merchants.map((m) => (
                      <Bar
                        key={m}
                        dataKey={m}
                        stackId="a"
                        fill={merchantColors[m]}
                        // no radius here; rounding stacked segments looks bad
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">Latest payments</div>
              <div className="text-xs text-gray-500">Up to 200 rows</div>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">No Wise payments saved yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 text-left font-medium text-gray-500">Date</th>
                    <th className="py-3 text-left font-medium text-gray-500">Merchant</th>
                    <th className="py-3 text-right font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 text-gray-700">{formatDate(r.payment_date)}</td>
                      <td className="py-3 text-gray-900">
                        {r.merchant_name ? shortMerchant(r.merchant_name) : "-"}
                        {r.merchant_name && shortMerchant(r.merchant_name) !== r.merchant_name ? (
                          <div className="text-xs text-gray-400" title={r.merchant_name}>
                            {r.merchant_name}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 text-right font-semibold text-gray-900">
                        {r.amount_gbp ? gbp.format(Number(r.amount_gbp)) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 text-xs text-gray-400">
          Tip: run <span className="font-mono">/api/save-wise-sync</span> to keep this updated.
        </div>
      </div>
    </main>
  );
}
