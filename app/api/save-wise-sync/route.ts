import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  getGmailClient,
  listMessages,
  getMessage,
  extractBody,
} from "@/lib/gmail";

export const runtime = "nodejs";

function getHeader(headers: any[], name: string) {
  return (
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
    ""
  );
}

function extractMerchantFromSubject(subject: string): string | null {
  const m = subject.match(/(?:payment|paid)\s+to\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function extractAmountGBP(text: string): number | null {
  let m = text.match(/£\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/);
  if (m) {
    const n = Number(m[1].replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  m = text.match(/\bGBP\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)\b/i);
  if (m) {
    const n = Number(m[1].replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  m = text.match(/\b([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)\s*GBP\b/i);
  if (m) {
    const n = Number(m[1].replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const gmail = await getGmailClient();

    // Find the most recent payment date we have saved
    const last = await query(
      `SELECT MAX(payment_date) AS last_date FROM wise_payments`
    );
    const lastDate: string | Date | null = last.rows?.[0]?.last_date ?? null;

    // Gmail search supports "after:YYYY/MM/DD" (date-only)
    let after = "";

if (lastDate) {
  const d =
    lastDate instanceof Date
      ? lastDate
      : new Date(lastDate);

  after = ` after:${d.toISOString().slice(0, 10).replace(/-/g, "/")}`;
}



    const q = `from:noreply@wise.com subject:Direct Debit paid to${after}`;

    const messages = await listMessages(gmail, q);

    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get("dryRun") === "1";

    let inserted = 0;
    let skipped = 0;
    let parse_failed = 0;

    for (const m of messages) {
      if (!m.id) continue;

      const email = await getMessage(gmail, m.id);

      const headers = email.payload?.headers ?? [];
      const subject = getHeader(headers, "Subject");
      const from = getHeader(headers, "From");
      const dateHeader = getHeader(headers, "Date");
      const snippet = email.snippet ?? "";

      const payment_date = dateHeader
        ? new Date(dateHeader).toISOString().slice(0, 10)
        : null;

      const body = extractBody(email);
      const merchant_name = extractMerchantFromSubject(subject);
      const amount_gbp = extractAmountGBP(body);

      if (!merchant_name || !amount_gbp || !payment_date) {
        parse_failed++;
      }

      if (dryRun) {
        skipped++;
        continue;
      }

      const res = await query(
        `INSERT INTO wise_payments
         (email_id, merchant_name, payment_date, amount_gbp, raw_subject, raw_from, raw_date, raw_snippet)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (email_id) DO NOTHING
         RETURNING email_id`,
        [
          m.id,
          merchant_name,
          payment_date,
          amount_gbp,
          subject,
          from,
          dateHeader,
          snippet,
        ]
      );

      if (res.rowCount === 1) inserted++;
      else skipped++;
    }

    return NextResponse.json({
      ok: true,
      query: q,
      lastDate,
      total_found: messages.length,
      dryRun,
      inserted,
      skipped,
      parse_failed,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
