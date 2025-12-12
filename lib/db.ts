// lib/db.ts
import { Pool, type QueryResultRow } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
) {
  const res = await pool.query<T>(text, params);
  return res;
}
