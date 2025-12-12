import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const monthsParam = searchParams.get("months");
    const months = monthsParam ? Math.max(1, Math.min(24, Number(monthsParam))) : 12;

    // Returns rows like:
    // { month: "2025-12", merchant_name: "X", total_gbp: "123.45" }
    const res = await query<{
      month: string;
      merchant_name: string | null;
      total_gbp: string | null;
    }>(
      `
      SELECT
        to_char(date_trunc('month', payment_date), 'YYYY-MM') AS month,
        merchant_name,
        SUM(amount_gbp)::numeric(10,2) AS total_gbp
      FROM wise_payments
      WHERE payment_date >= (date_trunc('month', CURRENT_DATE) - ($1::int - 1) * interval '1 month')
      GROUP BY 1, merchant_name
      ORDER BY 1 ASC, merchant_name ASC;
      `,
      [months]
    );

    // Also return the unique merchant list for consistent chart series
    const merchantRes = await query<{ merchant_name: string | null }>(
      `
      SELECT DISTINCT merchant_name
      FROM wise_payments
      WHERE merchant_name IS NOT NULL
      ORDER BY merchant_name ASC;
      `
    );

    return NextResponse.json({
      ok: true,
      months,
      rows: res.rows,
      merchants: merchantRes.rows.map((r) => r.merchant_name).filter(Boolean),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
