#!/usr/bin/env node
/**
 * Idempotent migration runner.
 * Reads every .sql file under ./sql/ in lexicographic order and executes it
 * against DATABASE_URL. Also seeds a bootstrap admin user when the users
 * table is empty, using ADMIN_EMAIL and ADMIN_PASSWORD (or sensible defaults).
 */
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1)(:|\/|$)/.test(DATABASE_URL);
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

async function runSqlFiles() {
  const sqlDir = path.resolve(process.cwd(), "sql");
  const entries = (await fs.readdir(sqlDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of entries) {
    const full = path.join(sqlDir, file);
    const sql = await fs.readFile(full, "utf8");
    console.log(`[migrate] applying ${file} ...`);
    await pool.query(sql);
  }
}

async function seedAdmin() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM users");
  if (rows[0].n > 0) {
    console.log("[migrate] users table already has rows — skipping admin seed.");
    return;
  }
  const email = process.env.ADMIN_EMAIL || "admin@swish.local";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const hash = bcrypt.hashSync(password, 10);
  await pool.query(
    `INSERT INTO users (email, password_hash, display_name, role, is_active)
     VALUES ($1, $2, $3, $4, TRUE)`,
    [email, hash, "System Administrator", "admin"]
  );
  console.log(
    process.env.ADMIN_PASSWORD
      ? `[migrate] admin user '${email}' created with ADMIN_PASSWORD from env.`
      : `[migrate] admin user '${email}' created with default password 'admin123'. CHANGE IT after first login.`
  );
}

(async () => {
  try {
    await runSqlFiles();
    await seedAdmin();
    console.log("[migrate] done.");
  } catch (err) {
    console.error("[migrate] FAILED:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
