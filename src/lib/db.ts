import { Pool, type QueryResultRow } from "pg";
import { env } from "@/lib/env";

const isLocal = /@(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.DATABASE_URL);

// Reuse the pool across hot reloads in dev.
const globalForPg = globalThis as unknown as { __pgPool?: Pool };

export const pool: Pool =
  globalForPg.__pgPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    max: 10,
  });

if (env.NODE_ENV !== "production") {
  globalForPg.__pgPool = pool;
}

/** Run a parameterized query and return all rows. */
export async function queryAll<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool.query<T>(sql, params);
  return res.rows;
}

/** Run a parameterized query and return the first row (or undefined). */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const res = await pool.query<T>(sql, params);
  return res.rows[0];
}

/** Run a write query and return rowsAffected. */
export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<number> {
  const res = await pool.query(sql, params);
  return res.rowCount ?? 0;
}
