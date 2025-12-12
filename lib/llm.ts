// lib/llm.ts

export type BillInfo = {
  provider: string | null;
  bill_period_start: string | null;
  bill_period_end: string | null;
  amount: number | null;
  currency: string | null;
  due_date: string | null;
  usage_kwh: number | null;
};

export async function extractBillInfo(emailBody: string): Promise<BillInfo> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set");
  }

    // 🔹 Limit how much of the email we send to the LLM
  const MAX_BODY_CHARS = 4000; // ~1k tokens, well under limits
  const trimmedBody =
    emailBody.length > MAX_BODY_CHARS
      ? emailBody.slice(0, MAX_BODY_CHARS)
      : emailBody;

  const prompt = `
You extract utility bill details from plain text emails.

Return STRICT JSON with exactly these keys:
- provider
- bill_period_start
- bill_period_end
- amount
- currency
- due_date
- usage_kwh

Rules:
- Dates in ISO format: YYYY-MM-DD
- Numbers as raw numbers (no currency symbols, no commas)
- If a field is missing or not clear, use null.

Email text:
"""${emailBody}"""
`;

  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`LLM error: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  const content = data.choices[0]?.message?.content;

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error("Failed to parse LLM JSON");
  }

  return {
    provider: parsed.provider ?? null,
    bill_period_start: parsed.bill_period_start ?? null,
    bill_period_end: parsed.bill_period_end ?? null,
    amount: parsed.amount ?? null,
    currency: parsed.currency ?? null,
    due_date: parsed.due_date ?? null,
    usage_kwh: parsed.usage_kwh ?? null,
  };
}
