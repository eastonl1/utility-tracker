import { NextResponse } from "next/server";
import { getGmailClient, listMessages, getMessage, extractBody } from "@/lib/gmail";

function getHeader(headers: any[], name: string) {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function extractMerchantFromSubject(subject: string): string | null {
  const m = subject.match(/(?:payment|paid)\s+to\s+(.+)$/i);
  return m ? m[1].trim() : null;
}


function extractAmountGBP(text: string): number | null {
  // Try £12.34
  let m = text.match(/£\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/);
  if (m) {
    const n = Number(m[1].replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  // Try "GBP 12.34"
  m = text.match(/\bGBP\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)\b/i);
  if (m) {
    const n = Number(m[1].replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  // Try "12.34 GBP"
  m = text.match(/\b([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)\s*GBP\b/i);
  if (m) {
    const n = Number(m[1].replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

export async function GET() {
  try {
    const gmail = await getGmailClient();

    const msgs = await listMessages(
      gmail,
      "from:noreply@wise.com subject:Direct Debit payment to"
    );

    if (msgs.length === 0) {
      return NextResponse.json({ ok: false, error: "No Wise DD emails found" });
    }

    const first = msgs[0];
    const email = await getMessage(gmail, first.id);

    const headers = email.payload?.headers ?? [];
    const subject = getHeader(headers, "Subject");
    const dateHeader = getHeader(headers, "Date");

    const body = extractBody(email);

    const merchant_name = extractMerchantFromSubject(subject);
    const amount_gbp = extractAmountGBP(body);

    const payment_date = dateHeader
      ? new Date(dateHeader).toISOString().slice(0, 10)
      : null;

    return NextResponse.json({
      ok: true,
      parsed: { merchant_name, payment_date, amount_gbp },
      debug: { subject, amount_found: amount_gbp !== null },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
