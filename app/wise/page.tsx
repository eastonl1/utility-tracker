// app/wise/page.tsx
import { query } from "@/lib/db";
import WiseDashboard from "./wise-dashboard";

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
};

type WiseChart = {
  ok: boolean;
  months: number;
  rows: { month: string; merchant_name: string | null; total_gbp: string | null }[];
  merchants: string[];
};

export default async function WisePage() {
  const [rowsRes, summaryRes, chartRes] = await Promise.all([
    query<WiseRow>(
      "SELECT id, merchant_name, payment_date, amount_gbp FROM wise_payments ORDER BY payment_date DESC NULLS LAST, id DESC LIMIT 200"
    ),

    // Summary: all-time totals
    query<{ total_gbp: string | null; payments: number }>(
      `SELECT COALESCE(SUM(amount_gbp),0)::text AS total_gbp, COUNT(*)::int AS payments
       FROM wise_payments`
    ),

    // Chart: last 12 months totals by month + merchant
    query<{ month: string; merchant_name: string | null; total_gbp: string | null }>(
      `SELECT
         to_char(date_trunc('month', payment_date::date), 'YYYY-MM') AS month,
         merchant_name,
         SUM(amount_gbp)::text AS total_gbp
       FROM wise_payments
       WHERE payment_date >= (current_date - interval '12 months')
       GROUP BY 1, 2
       ORDER BY 1 ASC`
    ),
  ]);

  const summary: WiseSummary = {
    ok: true,
    months: 6,
    all_time: summaryRes.rows[0] ?? { total_gbp: "0", payments: 0 },
    monthly: [],
  };

  const chart: WiseChart = {
    ok: true,
    months: 12,
    rows: chartRes.rows,
    merchants: Array.from(
      new Set(chartRes.rows.map((r) => r.merchant_name).filter(Boolean))
    ) as string[],
  };

  return <WiseDashboard rows={rowsRes.rows} summary={summary} chart={chart} />;
}
