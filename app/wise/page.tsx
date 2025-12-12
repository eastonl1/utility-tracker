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

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export default async function WisePage() {
  const baseUrl = getBaseUrl();

  const [rowsRes, summary, chart] = await Promise.all([
    query<WiseRow>(
      "SELECT id, merchant_name, payment_date, amount_gbp FROM wise_payments ORDER BY payment_date DESC NULLS LAST, id DESC LIMIT 200"
    ),
    fetch(`${baseUrl}/api/wise-summary`, { cache: "no-store" }).then((r) =>
      r.ok ? (r.json() as Promise<WiseSummary>) : null
    ),
    fetch(`${baseUrl}/api/wise-chart?months=12`, { cache: "no-store" }).then((r) =>
      r.ok ? (r.json() as Promise<WiseChart>) : null
    ),
  ]);

  return <WiseDashboard rows={rowsRes.rows} summary={summary} chart={chart} />;
}
