// app/bills/page.tsx
import { query } from "@/lib/db";
import type { QueryResultRow } from "pg";

type BillRow = QueryResultRow & {
  id: number;
  provider: string | null;
  bill_period_start: string | null;
  bill_period_end: string | null;
  amount: string | null;
  currency: string | null;
  due_date: string | null;
};


export default async function BillsPage() {
  const res = await query<BillRow>(
    "SELECT * FROM bills ORDER BY id DESC LIMIT 50"
  );
  const bills = res.rows;

  return (
    <main className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Utility Bills</h1>

      {bills.length === 0 ? (
        <p className="text-sm text-gray-500">No bills yet.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Provider</th>
              <th className="text-left py-2">Amount</th>
              <th className="text-left py-2">Currency</th>
              <th className="text-left py-2">Raw Subject</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id} className="border-b">
                <td className="py-2">{b.provider ?? "-"}</td>
                <td className="py-2">{b.amount ?? "-"}</td>
                <td className="py-2">{b.currency ?? "-"}</td>
                <td className="py-2">{/* we didn't type this, so ignore for now */}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
