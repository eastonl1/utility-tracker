// app/api/test-gmail/route.ts
import { NextResponse } from "next/server";
import { getGmailClient, listMessages, getMessage } from "@/lib/gmail";

export async function GET() {
  try {
    const gmail = await getGmailClient();

    // For now, no special search – just latest emails
    const messages = await listMessages(gmail, ""); // empty query = all mail

    const results: any[] = [];

    for (const m of messages) {
      if (!m.id) continue;
      const full = await getMessage(gmail, m.id);

      const headers = full.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
          ?.value ?? "";

      results.push({
        id: m.id,
        subject: getHeader("Subject"),
        from: getHeader("From"),
        date: getHeader("Date"),
      });
    }

    return NextResponse.json({ ok: true, messages: results });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
