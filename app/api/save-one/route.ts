import { NextResponse } from "next/server";
import { getGmailClient, listMessages, getMessage, extractBody } from "@/lib/gmail";
import { extractBillInfo } from "@/lib/llm";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const gmail = await getGmailClient();

    // Look for likely bill emails
    const messages = await listMessages(
      gmail,
      'from:noreply@wise.com subject:Direct Debit paid to'
    );

    if (messages.length === 0) {
      return NextResponse.json({ ok: false, error: "No bill emails found" });
    }

    const m = messages[0];
    const full = await getMessage(gmail, m.id);

    const headers = full.payload?.headers ?? [];
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
        ?.value ?? "";

    const subject = getHeader("Subject");
    const from = getHeader("From");
    const date = getHeader("Date");
    const snippet = full.snippet ?? "";

    const body = extractBody(full);
    const parsed = await extractBillInfo(body);

    // Insert into DB
    const insert = await query(
      `INSERT INTO bills
       (email_id, provider, bill_period_start, bill_period_end,
        amount, currency, due_date, usage_kwh,
        raw_subject, raw_from, raw_date, raw_snippet)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (email_id) DO NOTHING
       RETURNING *`,
      [
        m.id,
        parsed.provider,
        parsed.bill_period_start,
        parsed.bill_period_end,
        parsed.amount,
        parsed.currency,
        parsed.due_date,
        parsed.usage_kwh,
        subject,
        from,
        date,
        snippet,
      ]
    );

    return NextResponse.json({
      ok: true,
      inserted: insert.rows?.[0] ?? null,
      parsed,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
