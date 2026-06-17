import "server-only";
import { queryAll, queryOne, execute } from "@/lib/db";
import type { Capa, CapaSeverity, CapaStatus } from "./types";

const CAPA_SELECT = `
  c.id, c.code, c.title, c.description, c.severity, c.status,
  c.source_audit_id, c.source_item_id,
  c.brand_id, b.name AS brand_name,
  c.department_id, d.name AS department_name,
  c.assigned_to, u_a.display_name AS assigned_to_name,
  c.created_by, u_c.display_name AS created_by_name,
  c.verified_by, u_v.display_name AS verified_by_name,
  c.due_date, c.resolution_note, c.evidence_url,
  c.submitted_at, c.verified_at, c.closed_at,
  c.created_at, c.updated_at
FROM corrective_actions c
LEFT JOIN brands       b   ON b.id = c.brand_id
LEFT JOIN departments  d   ON d.id = c.department_id
LEFT JOIN users        u_a ON u_a.id = c.assigned_to
LEFT JOIN users        u_c ON u_c.id = c.created_by
LEFT JOIN users        u_v ON u_v.id = c.verified_by
`;

export async function listCapas(filters: {
  status?: CapaStatus;
  assigned_to?: number;
  search?: string;
} = {}): Promise<Capa[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`c.status = $${params.length}`);
  }
  if (filters.assigned_to) {
    params.push(filters.assigned_to);
    conditions.push(`c.assigned_to = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(c.title ILIKE $${params.length} OR c.code ILIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return queryAll<Capa>(
    `SELECT ${CAPA_SELECT} ${where}
     ORDER BY
       CASE c.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'submitted' THEN 2 ELSE 3 END,
       c.due_date NULLS LAST, c.id DESC
     LIMIT 200`,
    params
  );
}

export async function getCapa(id: number): Promise<Capa | undefined> {
  return queryOne<Capa>(`SELECT ${CAPA_SELECT} WHERE c.id = $1`, [id]);
}

export async function createCapa(input: {
  title: string;
  description?: string | null;
  severity: CapaSeverity;
  source_audit_id?: number | null;
  source_item_id?: number | null;
  brand_id?: number | null;
  department_id?: number | null;
  assigned_to?: number | null;
  due_date?: string | null;
  created_by: number;
}): Promise<number> {
  const code = `CAPA-${Date.now().toString().slice(-8)}`;
  const row = await queryOne<{ id: number }>(
    `INSERT INTO corrective_actions
       (code, title, description, severity, source_audit_id, source_item_id,
        brand_id, department_id, assigned_to, due_date, created_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'open')
     RETURNING id`,
    [
      code,
      input.title,
      input.description ?? null,
      input.severity,
      input.source_audit_id ?? null,
      input.source_item_id ?? null,
      input.brand_id ?? null,
      input.department_id ?? null,
      input.assigned_to ?? null,
      input.due_date ?? null,
      input.created_by,
    ]
  );
  return row!.id;
}

export async function transitionCapa(
  id: number,
  next: CapaStatus,
  data: {
    resolution_note?: string | null;
    evidence_url?: string | null;
    verified_by?: number | null;
  } = {}
): Promise<void> {
  if (next === "submitted") {
    await execute(
      `UPDATE corrective_actions SET
         status = 'submitted',
         resolution_note = COALESCE($2, resolution_note),
         evidence_url = COALESCE($3, evidence_url),
         submitted_at = NOW()
       WHERE id = $1`,
      [id, data.resolution_note ?? null, data.evidence_url ?? null]
    );
  } else if (next === "verified" || next === "closed") {
    // $2 is used twice — once assigned to status (VARCHAR(30)) and once
    // compared against a TEXT literal ('closed'). Without the explicit
    // ::text cast Postgres throws 42P08 "inconsistent types deduced for
    // parameter" because it can't tell whether $2 should be VARCHAR or
    // TEXT. Casting both sides to text makes the type unambiguous; the
    // assignment then implicitly coerces back to VARCHAR(30).
    await execute(
      `UPDATE corrective_actions SET
         status = $2::text,
         verified_by = $3,
         verified_at = COALESCE(verified_at, NOW()),
         closed_at = CASE WHEN $2::text = 'closed' THEN NOW() ELSE closed_at END
       WHERE id = $1`,
      [id, next, data.verified_by ?? null]
    );
  } else if (next === "rejected") {
    await execute(
      `UPDATE corrective_actions SET
         status = 'rejected',
         resolution_note = COALESCE($2, resolution_note)
       WHERE id = $1`,
      [id, data.resolution_note ?? null]
    );
  } else if (next === "in_progress") {
    await execute(
      `UPDATE corrective_actions SET status = 'in_progress' WHERE id = $1`,
      [id]
    );
  } else if (next === "open") {
    await execute(`UPDATE corrective_actions SET status = 'open' WHERE id = $1`, [id]);
  }
}

export async function pendingCapaCount(): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM corrective_actions WHERE status IN ('open','in_progress','submitted')`
  );
  return row?.n ?? 0;
}
