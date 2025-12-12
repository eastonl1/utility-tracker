// lib/llm_wise.ts

export type WisePaymentInfo = {
  merchant_name: string | null;
  payment_date: string | null;
  amount_gbp: number | null;
};

export async function extractWisePayment(body: string): Promise<WisePaymentInfo> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set");
  }

  // Keep body small (max 4000 chars)
  const MAX = 4000;
  const trimmed = body.slice(0, MAX);

  const prompt = `
You analyze Wise Direct Debit notification emails.

Extract ONLY these three fields:

1. merchant_name: The name of the business or person after the phrase "Your Direct Debit payment to".
2. payment_date: The date the email was received (ISO format YYYY-MM-DD).
3. amount_gbp: The amount charged in GBP (numeric).

Rules:
- Return STRICT JSON only.
- If something is missing, return null.
- amount_gbp must be a number (no currency symbol).
- merchant_name is the text that appears directly after “Your Direct Debit payment to”.
- Do NOT infer anything not stated.

Email text:
"""${trimmed}"""
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
      temperature: 0.1
    }),
  });

  if (!resp.ok) {
    throw new Error("LLM request failed");
  }

  const json = await resp.json();
  const parsed = JSON.parse(json.choices[0].message.content);

  return {
    merchant_name: parsed.merchant_name ?? null,
    payment_date: parsed.payment_date ?? null,
    amount_gbp: parsed.amount_gbp ?? null
  };
}
