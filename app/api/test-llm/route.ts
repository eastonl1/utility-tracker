// app/api/test-llm/route.ts
import { NextResponse } from "next/server";
import { extractBillInfo } from "@/lib/llm";

export async function GET() {
  try {
    const fakeEmail = `
Hi Easton,

Your Octopus Energy electricity statement is now ready.

Billing period: 01 November 2025 to 30 November 2025
Total electricity used: 245 kWh
Amount due: £83.50
Payment due date: 10 December 2025

Thanks for being with Octopus Energy!

Love and power,
Octopus Energy
`;

    const info = await extractBillInfo(fakeEmail);

    return NextResponse.json({ ok: true, info });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
