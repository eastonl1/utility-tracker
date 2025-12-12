import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const monthsParam = searchParams.get("months");
    const months = monthsParam ? Math.max(1, Math.min(24, Number(monthsParam))) : 6;

    // monthly totals for last N months (including current month)
    const res = await query(
      `
      SELECT
        to_char(date_trunc('month', payment_date), 'YYYY-MM') AS month,
        SUM(amount_gbp)::numeric(10,2) AS total_gbp,
        COUNT(*)::int AS payments
      FROM wise_payments
      WHERE payment_date >= (date_trunc('month', CURRENT_DATE) - ($1::int - 1) * interval '1 month')
      GROUP BY 1
      ORDER BY 1 DESC;
      `,
      [months]
    );

    const totalRes = await query(
      `
      SELECT
        SUM(amount_gbp)::numeric(10,2) AS total_gbp,
        COUNT(*)::int AS payments
      FROM wise_payments;
      `
    );

    return NextResponse.json({
      ok: true,
      months,
      all_time: totalRes.rows[0],
      monthly: res.rows,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
