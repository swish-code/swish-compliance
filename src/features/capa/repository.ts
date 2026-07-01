import "server-only";
import { queryAll, queryOne, execute } from "@/lib/db";
import type {
  Capa,
  CapaSeverity,
  CapaStatus,
  AuditFinding,
} from "./types";

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
  c.created_at, c.updated_at,
  c.start_date, c.assignment_note,
  c.reviewer_id, u_r.display_name AS reviewer_name
FROM corrective_actions c
LEFT JOIN brands       b   ON b.id = c.brand_id
LEFT JOIN departments  d   ON d.id = c.department_id
LEFT JOIN users        u_a ON u_a.id = c.assigned_to
LEFT JOIN users        u_c ON u_c.id = c.created_by
LEFT JOIN users        u_v ON u_v.id = c.verified_by
LEFT JOIN users        u_r ON u_r.id = c.reviewer_id
`;

export async function listCapas(filters: {
  status?: CapaStatus;
  assigned_to?: number;
  search?: string;
  /** When set, restricts to CAPAs in this department. Used for the DM
   *  role on the main register. */
  scopedToDepartmentId?: number;
  /** When set, restricts to CAPAs assigned to OR created by this user.
   *  Used for non-privileged roles so they only see their own work. */
  scopedToUserId?: number;
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
  if (filters.scopedToDepartmentId) {
    params.push(filters.scopedToDepartmentId);
    conditions.push(`c.department_id = $${params.length}`);
  }
  if (filters.scopedToUserId) {
    params.push(filters.scopedToUserId);
    conditions.push(
      `(c.assigned_to = $${params.length} OR c.created_by = $${params.length})`
    );
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

/** Change who a CAPA is assigned to. The notify on the action layer */
/** picks up the new assignee separately. */
export async function setCapaAssignee(
  id: number,
  assigneeId: number | null
): Promise<void> {
  await execute(
    `UPDATE corrective_actions SET assigned_to = $2 WHERE id = $1`,
    [id, assigneeId]
  );
}

export async function getCapa(id: number): Promise<Capa | undefined> {
  return queryOne<Capa>(`SELECT ${CAPA_SELECT} WHERE c.id = $1`, [id]);
}

/**
 * Every failed audit finding, joined with its scope chain and the CAPA
 * currently linked to it (if any). Returns one row per failed
 * checklist item. The page groups them into Audit → Control → Test →
 * Item cards.
 *
 * The check → item link uses check_checklist_items so we can attribute
 * each failed question to the SPECIFIC test that surfaced it. When an
 * item isn't linked to a test yet (legacy template-only audits),
 * test_id comes back NULL and the UI renders it under a "No test"
 * bucket.
 */
export async function listAuditFindings(filters: {
  audit_id?: number;
  department_id?: number;
  brand_id?: number;
  severity?: CapaSeverity;
  status?: CapaStatus | "unassigned";
  assigned_to?: number;
  due_date_before?: string;
  location?: string;
} = {}): Promise<AuditFinding[]> {
  const cond: string[] = ["r.response = 'fail'"];
  const params: unknown[] = [];

  if (filters.audit_id) {
    params.push(filters.audit_id);
    cond.push(`a.id = $${params.length}`);
  }
  if (filters.department_id) {
    params.push(filters.department_id);
    cond.push(`a.department_id = $${params.length}`);
  }
  if (filters.brand_id) {
    params.push(filters.brand_id);
    cond.push(`a.brand_id = $${params.length}`);
  }
  if (filters.severity) {
    params.push(filters.severity);
    cond.push(`ca.severity = $${params.length}`);
  }
  if (filters.status === "unassigned") {
    cond.push(`(ca.id IS NULL OR ca.assigned_to IS NULL)`);
  } else if (filters.status) {
    params.push(filters.status);
    cond.push(`ca.status = $${params.length}`);
  }
  if (filters.assigned_to) {
    params.push(filters.assigned_to);
    cond.push(`ca.assigned_to = $${params.length}`);
  }
  if (filters.due_date_before) {
    params.push(filters.due_date_before);
    cond.push(`ca.due_date <= $${params.length}`);
  }
  if (filters.location) {
    params.push(`%${filters.location}%`);
    cond.push(`a.location ILIKE $${params.length}`);
  }

  return queryAll<AuditFinding>(
    `SELECT
       a.id      AS audit_id,
       a.status  AS audit_status,
       a.score::text AS audit_score,
       a.audit_date,
       b.name    AS audit_brand_name,
       a.department_id AS audit_department_id,
       d.name    AS audit_department_name,
       a.location AS audit_location,
       f.code    AS framework_code, f.name AS framework_name,
       ctrl.id   AS control_id, ctrl.code AS control_code, ctrl.name AS control_name,
       -- Pick the FIRST test that links to this item for this audit. A
       -- question could theoretically appear under two tests; the audit
       -- resolves it once. First subquery just uses at.check_id so we
       -- don't need to JOIN checks (that was the bug); the other two
       -- do JOIN because they need code + name off checks.
       (SELECT at.check_id
        FROM audit_tests at
        JOIN check_checklist_items cci ON cci.check_id = at.check_id
        WHERE at.audit_id = a.id AND cci.checklist_item_id = i.id
        ORDER BY at.check_id LIMIT 1) AS test_id,
       (SELECT ch.code FROM audit_tests at
        JOIN check_checklist_items cci ON cci.check_id = at.check_id
        JOIN checks ch ON ch.id = at.check_id
        WHERE at.audit_id = a.id AND cci.checklist_item_id = i.id
        ORDER BY ch.id LIMIT 1) AS test_code,
       (SELECT ch.name FROM audit_tests at
        JOIN check_checklist_items cci ON cci.check_id = at.check_id
        JOIN checks ch ON ch.id = at.check_id
        WHERE at.audit_id = a.id AND cci.checklist_item_id = i.id
        ORDER BY ch.id LIMIT 1) AS test_name,
       i.id AS item_id, i.code AS item_code, i.question, i.is_critical,
       r.notes        AS auditor_note,
       r.evidence_url, r.evidence_name, r.evidence_mime,
       ca.id          AS capa_id,
       ca.code        AS capa_code,
       ca.status      AS capa_status,
       ca.severity    AS capa_severity,
       ca.assigned_to AS capa_assigned_to,
       u.display_name AS capa_assigned_to_name,
       ca.due_date    AS capa_due_date
     FROM audit_responses r
     JOIN audits             a    ON a.id  = r.audit_id
     JOIN checklist_items    i    ON i.id  = r.item_id
     LEFT JOIN brands        b    ON b.id  = a.brand_id
     LEFT JOIN departments   d    ON d.id  = a.department_id
     LEFT JOIN frameworks    f    ON f.id  = a.framework_id
     LEFT JOIN controls      ctrl ON ctrl.id = a.control_id
     LEFT JOIN corrective_actions ca
       ON ca.source_audit_id = a.id AND ca.source_item_id = i.id
     LEFT JOIN users         u    ON u.id  = ca.assigned_to
     WHERE ${cond.join(" AND ")}
       AND a.status IN ('submitted','closed')
     ORDER BY a.id DESC, ctrl.id NULLS LAST, i.sort_order, i.id
     LIMIT 500`,
    params
  );
}

/**
 * Create OR update the CAPA linked to a specific (audit, item) pair.
 * The upsert key is (source_audit_id, source_item_id) — a finding can
 * only ever have ONE CAPA row.
 *
 * New CAPAs get an AUD-scoped code (CAPA-AUD<id>-NNN) so ops teams can
 * eyeball the audit each CAPA came from without opening it.
 */
export async function upsertCapaFromFinding(input: {
  audit_id: number;
  item_id: number;
  title: string;
  severity: CapaSeverity;
  brand_id?: number | null;
  department_id?: number | null;
  assigned_to: number;
  reviewer_id?: number | null;
  start_date?: string | null;
  due_date?: string | null;
  assignment_note?: string | null;
  created_by: number;
}): Promise<{ id: number; code: string; created: boolean }> {
  const existing = await queryOne<{ id: number; code: string | null }>(
    `SELECT id, code FROM corrective_actions
     WHERE source_audit_id = $1 AND source_item_id = $2`,
    [input.audit_id, input.item_id]
  );

  if (existing) {
    await execute(
      `UPDATE corrective_actions SET
         title           = $2,
         severity        = $3,
         brand_id        = COALESCE($4, brand_id),
         department_id   = COALESCE($5, department_id),
         assigned_to     = $6,
         reviewer_id     = $7,
         start_date      = $8,
         due_date        = $9,
         assignment_note = $10,
         status          = CASE
                             WHEN status = 'open' AND $6 IS NOT NULL THEN 'in_progress'
                             ELSE status
                           END
       WHERE id = $1`,
      [
        existing.id,
        input.title,
        input.severity,
        input.brand_id ?? null,
        input.department_id ?? null,
        input.assigned_to,
        input.reviewer_id ?? null,
        input.start_date ?? null,
        input.due_date ?? null,
        input.assignment_note ?? null,
      ]
    );
    return {
      id: existing.id,
      code: existing.code ?? `CAPA-${existing.id}`,
      created: false,
    };
  }

  // New CAPA. Code = CAPA-AUD<audit>-<seq> where seq is 1-based across
  // CAPAs for the same audit, including the row we're about to insert.
  const seqRow = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int + 1 AS n
       FROM corrective_actions WHERE source_audit_id = $1`,
    [input.audit_id]
  );
  const seq = (seqRow?.n ?? 1).toString().padStart(3, "0");
  const code = `CAPA-AUD${input.audit_id}-${seq}`;

  const row = await queryOne<{ id: number }>(
    `INSERT INTO corrective_actions
       (code, title, description, severity, source_audit_id, source_item_id,
        brand_id, department_id, assigned_to, reviewer_id,
        start_date, due_date, assignment_note, created_by, status)
     VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'in_progress')
     RETURNING id`,
    [
      code,
      input.title,
      input.severity,
      input.audit_id,
      input.item_id,
      input.brand_id ?? null,
      input.department_id ?? null,
      input.assigned_to,
      input.reviewer_id ?? null,
      input.start_date ?? null,
      input.due_date ?? null,
      input.assignment_note ?? null,
      input.created_by,
    ]
  );
  return { id: row!.id, code, created: true };
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
