import { Pool } from "pg";

const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export async function query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}
