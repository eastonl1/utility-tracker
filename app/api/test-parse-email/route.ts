// app/api/test-parse-email/route.ts
import { NextResponse } from "next/server";
import { getGmailClient, listMessages, getMessage, extractBody } from "@/lib/gmail";
import { extractBillInfo } from "@/lib/llm";

export async function GET() {
  try {
    const gmail = await getGmailClient();

    // Query only bill-like emails to test (adjust for your providers)
    const messages = await listMessages(
      gmail,
      'subject:(bill OR statement OR invoice OR energy)'
    );

    if (messages.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "No bill-like emails found",
      });
    }

    // Just test with the first one
    const first = messages[0];
    const full = await getMessage(gmail, first.id);

    const body = extractBody(full);

    const parsed = await extractBillInfo(body);

    return NextResponse.json({
      ok: true,
      email_id: first.id,
      parsed,
      preview: body.slice(0, 500) + "..." // just for debugging
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
