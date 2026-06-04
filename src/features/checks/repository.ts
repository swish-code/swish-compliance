import "server-only";
import { queryAll, queryOne, execute } from "@/lib/db";
import type { Check, CheckResult, CheckStatus, CheckFrequency } from "./types";

const CHECK_SELECT = `
  ch.id, ch.code, ch.name, ch.description,
  ch.control_id, c.name AS control_name,
  ch.owner_user_id, u.display_name AS owner_name,
  ch.frequency, ch.is_active, ch.last_status, ch.last_result_at, ch.next_due_date,
  ch.created_at, ch.updated_at,
  (SELECT COUNT(*)::int FROM check_results r WHERE r.check_id = ch.id) AS result_count
FROM checks ch
LEFT JOIN controls c ON c.id = ch.control_id
LEFT JOIN users    u ON u.id = ch.owner_user_id
`;

export async function listChecks(filters: { status?: CheckStatus } = {}): Promise<Check[]> {
  if (filters.status) {
    return queryAll<Check>(
      `SELECT ${CHECK_SELECT} WHERE ch.last_status = $1
       ORDER BY ch.next_due_date NULLS FIRST, ch.name`,
      [filters.status]
    );
  }
  return queryAll<Check>(
    `SELECT ${CHECK_SELECT}
     ORDER BY
       CASE ch.last_status WHEN 'failing' THEN 0 WHEN 'pending_review' THEN 1 WHEN 'accepted_risk' THEN 2 WHEN 'passing' THEN 3 ELSE 4 END,
       ch.next_due_date NULLS LAST, ch.name`
  );
}

export async function getCheck(id: number): Promise<Check | undefined> {
  return queryOne<Check>(`SELECT ${CHECK_SELECT} WHERE ch.id = $1`, [id]);
}

export async function listCheckResults(checkId: number, limit = 25): Promise<CheckResult[]> {
  return queryAll<CheckResult>(
    `SELECT r.id, r.check_id, r.status, r.notes, r.evidence_url,
            r.performed_by, u.display_name AS performed_by_name, r.created_at
     FROM check_results r
     LEFT JOIN users u ON u.id = r.performed_by
     WHERE r.check_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2`,
    [checkId, limit]
  );
}

export async function createCheck(input: {
  code?: string | null;
  name: string;
  description?: string | null;
  control_id?: number | null;
  owner_user_id?: number | null;
  frequency: CheckFrequency;
}): Promise<number> {
  const row = await queryOne<{ id: number }>(
    `INSERT INTO checks (code, name, description, control_id, owner_user_id, frequency)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      input.code ?? null,
      input.name,
      input.description ?? null,
      input.control_id ?? null,
      input.owner_user_id ?? null,
      input.frequency,
    ]
  );
  return row!.id;
}

function nextDueFor(frequency: CheckFrequency): string | null {
  const now = new Date();
  const days: Record<CheckFrequency, number | null> = {
    daily: 1, weekly: 7, monthly: 30, quarterly: 90, annual: 365, on_demand: null,
  };
  const d = days[frequency];
  if (d == null) return null;
  const next = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
  return next.toISOString().split("T")[0];
}

export async function recordResult(input: {
  check_id: number;
  status: CheckStatus;
  notes?: string | null;
  evidence_url?: string | null;
  performed_by: number;
}): Promise<number> {
  const row = await queryOne<{ id: number }>(
    `INSERT INTO check_results (check_id, status, notes, evidence_url, performed_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [input.check_id, input.status, input.notes ?? null, input.evidence_url ?? null, input.performed_by]
  );

  // Update cached fields on the check itself
  const check = await getCheck(input.check_id);
  const next = check ? nextDueFor(check.frequency) : null;
  await execute(
    `UPDATE checks SET last_status = $2, last_result_at = NOW(), next_due_date = $3 WHERE id = $1`,
    [input.check_id, input.status, next]
  );

  return row!.id;
}
