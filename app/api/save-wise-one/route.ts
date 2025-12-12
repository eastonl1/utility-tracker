import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getGmailClient, listMessages, getMessage, extractBody } from "@/lib/gmail";

function getHeader(headers: any[], name: string) {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function extractMerchantFromSubject(subject: string): string | null {
  const m = subject.match(/(?:payment|paid)\s+to\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function extractAmountGBP(text: string): number | null {
  let m = text.match(/£\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/);
  if (m) return Number(m[1].replace(/,/g, ""));

  m = text.match(/\bGBP\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)\b/i);
  if (m) return Number(m[1].replace(/,/g, ""));

  m = text.match(/\b([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)\s*GBP\b/i);
  if (m) return Number(m[1].replace(/,/g, ""));

  return null;
}

export async function GET() {
  try {
    const gmail = await getGmailClient();

    // Use the query you confirmed works (no quotes/parentheses)
    const msgs = await listMessages(gmail, "from:noreply@wise.com subject:Direct Debit");

    if (msgs.length === 0) {
      return NextResponse.json({ ok: false, error: "No Wise DD emails found" });
    }

    const m = msgs[0];
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

    const inserted = await query(
      `INSERT INTO wise_payments
       (email_id, merchant_name, payment_date, amount_gbp, raw_subject, raw_from, raw_date, raw_snippet)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (email_id) DO NOTHING
       RETURNING *`,
      [m.id, merchant_name, payment_date, amount_gbp, subject, from, dateHeader, snippet]
    );

    return NextResponse.json({
      ok: true,
      inserted: inserted.rows?.[0] ?? null,
      parsed: { merchant_name, payment_date, amount_gbp },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
