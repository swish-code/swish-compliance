import "server-only";
import { queryAll, queryOne, execute } from "@/lib/db";
import type { Audit, AuditResponse, AuditStatus } from "./types";
import type { ChecklistItem } from "../checklists/types";

const AUDIT_SELECT = `
  a.id, a.template_id, t.name AS template_name, t.category AS template_category,
  a.brand_id, b.name AS brand_name,
  a.department_id, d.name AS department_name,
  a.location, a.auditor_id, u.display_name AS auditor_name,
  a.audit_date, a.status, a.score, a.max_score, a.critical_failed, a.summary,
  a.submitted_at, a.closed_at, a.created_at, a.updated_at
FROM audits a
JOIN checklist_templates t ON t.id = a.template_id
LEFT JOIN brands       b ON b.id = a.brand_id
LEFT JOIN departments  d ON d.id = a.department_id
LEFT JOIN users        u ON u.id = a.auditor_id
`;

export async function listAudits(filters: {
  search?: string;
  status?: AuditStatus;
  brandId?: number;
} = {}): Promise<Audit[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(t.name ILIKE $${params.length} OR a.location ILIKE $${params.length})`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`a.status = $${params.length}`);
  }
  if (filters.brandId) {
    params.push(filters.brandId);
    conditions.push(`a.brand_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return queryAll<Audit>(
    `SELECT ${AUDIT_SELECT} ${where} ORDER BY a.audit_date DESC, a.id DESC LIMIT 100`,
    params
  );
}

export async function getAudit(id: number): Promise<Audit | undefined> {
  return queryOne<Audit>(`SELECT ${AUDIT_SELECT} WHERE a.id = $1`, [id]);
}

export async function getAuditItems(
  auditId: number
): Promise<(ChecklistItem & AuditResponse)[]> {
  return queryAll(
    `SELECT
       i.id, i.template_id, i.sort_order, i.question, i.guidance, i.weight, i.is_critical,
       COALESCE(r.id, 0)         AS id,
       $1::int                   AS audit_id,
       i.id                      AS item_id,
       r.response, r.notes, r.evidence_url
     FROM checklist_items i
     LEFT JOIN audit_responses r ON r.item_id = i.id AND r.audit_id = $1
     WHERE i.template_id = (SELECT template_id FROM audits WHERE id = $1)
     ORDER BY i.sort_order ASC, i.id ASC`,
    [auditId]
  );
}

export async function createAudit(input: {
  template_id: number;
  brand_id?: number | null;
  department_id?: number | null;
  location?: string | null;
  auditor_id: number;
  audit_date?: string | null;
}): Promise<number> {
  const row = await queryOne<{ id: number }>(
    `INSERT INTO audits (template_id, brand_id, department_id, location, auditor_id, audit_date)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE)) RETURNING id`,
    [
      input.template_id,
      input.brand_id ?? null,
      input.department_id ?? null,
      input.location ?? null,
      input.auditor_id,
      input.audit_date ?? null,
    ]
  );
  return row!.id;
}

export async function upsertResponse(input: {
  audit_id: number;
  item_id: number;
  response: "pass" | "fail" | "na" | null;
  notes?: string | null;
  evidence_url?: string | null;
}): Promise<void> {
  await execute(
    `INSERT INTO audit_responses (audit_id, item_id, response, notes, evidence_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (audit_id, item_id) DO UPDATE SET
       response     = EXCLUDED.response,
       notes        = EXCLUDED.notes,
       evidence_url = EXCLUDED.evidence_url`,
    [input.audit_id, input.item_id, input.response, input.notes ?? null, input.evidence_url ?? null]
  );
}

/** Compute score (% of weighted passes excluding N/A) and critical fails. */
export async function computeAuditScore(auditId: number): Promise<{
  scorePct: number;
  maxScore: number;
  criticalFailed: number;
}> {
  const row = await queryOne<{
    total_weight: number;
    earned_weight: number;
    critical_failed: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN r.response IN ('pass','fail') THEN i.weight ELSE 0 END), 0)::int AS total_weight,
       COALESCE(SUM(CASE WHEN r.response = 'pass' THEN i.weight ELSE 0 END), 0)::int          AS earned_weight,
       COALESCE(SUM(CASE WHEN r.response = 'fail' AND i.is_critical THEN 1 ELSE 0 END), 0)::int AS critical_failed
     FROM checklist_items i
     LEFT JOIN audit_responses r ON r.item_id = i.id AND r.audit_id = $1
     WHERE i.template_id = (SELECT template_id FROM audits WHERE id = $1)`,
    [auditId]
  );
  const total = row?.total_weight ?? 0;
  const earned = row?.earned_weight ?? 0;
  const scorePct = total > 0 ? Math.round((earned / total) * 100 * 100) / 100 : 0;
  return {
    scorePct,
    maxScore: total,
    criticalFailed: row?.critical_failed ?? 0,
  };
}

export async function submitAudit(
  id: number,
  summary: string | null
): Promise<{ scorePct: number; criticalFailed: number; failedItemIds: number[] }> {
  const { scorePct, maxScore, criticalFailed } = await computeAuditScore(id);

  await execute(
    `UPDATE audits SET
       status       = 'submitted',
       score        = $2,
       max_score    = $3,
       critical_failed = $4,
       summary      = $5,
       submitted_at = NOW()
     WHERE id = $1`,
    [id, scorePct, maxScore, criticalFailed, summary]
  );

  // Return the failed item IDs so the caller can spawn CAPAs.
  const failed = await queryAll<{ item_id: number }>(
    `SELECT item_id FROM audit_responses WHERE audit_id = $1 AND response = 'fail'`,
    [id]
  );
  return {
    scorePct,
    criticalFailed,
    failedItemIds: failed.map((r) => r.item_id),
  };
}

export async function closeAudit(id: number): Promise<void> {
  await execute(
    `UPDATE audits SET status = 'closed', closed_at = NOW() WHERE id = $1`,
    [id]
  );
}
