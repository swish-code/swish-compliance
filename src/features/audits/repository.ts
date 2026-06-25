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
  a.submitted_at, a.closed_at, a.created_at, a.updated_at,
  a.policy_id, p.title AS policy_title, p.code AS policy_code,
  a.framework_id, f.name AS framework_name, f.code AS framework_code
FROM audits a
JOIN checklist_templates t ON t.id = a.template_id
LEFT JOIN brands       b ON b.id = a.brand_id
LEFT JOIN departments  d ON d.id = a.department_id
LEFT JOIN users        u ON u.id = a.auditor_id
LEFT JOIN sops         p ON p.id = a.policy_id
LEFT JOIN frameworks   f ON f.id = a.framework_id
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
  // The auditable items come from TWO places, unioned:
  //   1. Legacy: every item under the audit's checklist_template_id.
  //      Some older audits were created with a single template attached.
  //   2. New (migration 038): items linked to any test in audit_tests,
  //      via the check_checklist_items junction. This is the path the
  //      new /audits/new flow uses since it no longer asks for a
  //      template up-front.
  // An audit may carry both. UNION dedupes so an item that satisfies
  // both paths shows up exactly once.
  return queryAll(
    `SELECT
       i.id, i.template_id, i.sort_order, i.question, i.guidance, i.weight, i.is_critical,
       COALESCE(r.id, 0)         AS id,
       $1::int                   AS audit_id,
       i.id                      AS item_id,
       r.response, r.notes, r.evidence_url, r.evidence_name, r.evidence_mime
     FROM checklist_items i
     LEFT JOIN audit_responses r ON r.item_id = i.id AND r.audit_id = $1
     WHERE i.id IN (
       SELECT ci.id FROM checklist_items ci
       WHERE ci.template_id = (SELECT template_id FROM audits WHERE id = $1)
       UNION
       SELECT cci.checklist_item_id
       FROM audit_tests at
       JOIN check_checklist_items cci ON cci.check_id = at.check_id
       WHERE at.audit_id = $1
     )
     ORDER BY i.template_id NULLS LAST, i.sort_order ASC, i.id ASC`,
    [auditId]
  );
}

export async function createAudit(input: {
  /** Optional since migration 038 — audits now scope by tests, not a
   *  single template. Kept around so legacy audits keep working. */
  template_id?: number | null;
  brand_id?: number | null;
  department_id?: number | null;
  location?: string | null;
  auditor_id: number;
  audit_date?: string | null;
  policy_id?: number | null;
  framework_id?: number | null;
  /** Audit scope — domain → framework → control. Added in migration 028. */
  domain_id?: number | null;
  control_id?: number | null;
  /** Planned execution window + assignee. Added in migration 029. */
  start_at?: string | null;
  end_at?: string | null;
  assigned_to?: number | null;
}): Promise<number> {
  const row = await queryOne<{ id: number }>(
    `INSERT INTO audits
       (template_id, brand_id, department_id, location, auditor_id, audit_date,
        policy_id, framework_id, domain_id, control_id,
        start_at, end_at, assigned_to)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7, $8, $9, $10, $11, $12, $13)
     RETURNING id`,
    [
      input.template_id ?? null,
      input.brand_id ?? null,
      input.department_id ?? null,
      input.location ?? null,
      input.auditor_id,
      input.audit_date ?? null,
      input.policy_id ?? null,
      input.framework_id ?? null,
      input.domain_id ?? null,
      input.control_id ?? null,
      input.start_at ?? null,
      input.end_at ?? null,
      input.assigned_to ?? null,
    ]
  );
  return row!.id;
}

/**
 * Upsert a response.
 *
 * The evidence columns are write-PROTECTED by default:
 *   - When `update_evidence` is false (or omitted), the SQL keeps the old
 *     evidence_url / evidence_name / evidence_mime even if the caller passes
 *     nulls. This is what lets the auto-save flow re-fire on every Pass /
 *     Fail / notes-blur without wiping the file the user already attached.
 *   - When `update_evidence` is true, the caller is explicitly replacing the
 *     evidence with whatever values are passed (including null = remove).
 */
export async function upsertResponse(input: {
  audit_id: number;
  item_id: number;
  response: "pass" | "fail" | "na" | null;
  notes?: string | null;
  evidence_url?: string | null;
  evidence_name?: string | null;
  evidence_mime?: string | null;
  update_evidence?: boolean;
}): Promise<void> {
  const updateEv = !!input.update_evidence;
  await execute(
    `INSERT INTO audit_responses
       (audit_id, item_id, response, notes, evidence_url, evidence_name, evidence_mime)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (audit_id, item_id) DO UPDATE SET
       response      = EXCLUDED.response,
       notes         = EXCLUDED.notes,
       evidence_url  = CASE WHEN $8 THEN EXCLUDED.evidence_url  ELSE audit_responses.evidence_url  END,
       evidence_name = CASE WHEN $8 THEN EXCLUDED.evidence_name ELSE audit_responses.evidence_name END,
       evidence_mime = CASE WHEN $8 THEN EXCLUDED.evidence_mime ELSE audit_responses.evidence_mime END`,
    [
      input.audit_id,
      input.item_id,
      input.response,
      input.notes ?? null,
      input.evidence_url ?? null,
      input.evidence_name ?? null,
      input.evidence_mime ?? null,
      updateEv,
    ]
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
    // Same union as listItemsWithResponses — score over the full set of
    // items the audit covers (legacy template + new test links), not just
    // the template. Otherwise audits created from the new tests-first
    // flow would always score 0.
    `SELECT
       COALESCE(SUM(CASE WHEN r.response IN ('pass','fail') THEN i.weight ELSE 0 END), 0)::int AS total_weight,
       COALESCE(SUM(CASE WHEN r.response = 'pass' THEN i.weight ELSE 0 END), 0)::int          AS earned_weight,
       COALESCE(SUM(CASE WHEN r.response = 'fail' AND i.is_critical THEN 1 ELSE 0 END), 0)::int AS critical_failed
     FROM checklist_items i
     LEFT JOIN audit_responses r ON r.item_id = i.id AND r.audit_id = $1
     WHERE i.id IN (
       SELECT ci.id FROM checklist_items ci
       WHERE ci.template_id = (SELECT template_id FROM audits WHERE id = $1)
       UNION
       SELECT cci.checklist_item_id
       FROM audit_tests at
       JOIN check_checklist_items cci ON cci.check_id = at.check_id
       WHERE at.audit_id = $1
     )`,
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

/**
 * Reopen a submitted audit back to 'in_progress' so the auditor can edit
 * responses. Clears the computed score / submitted_at fields — they'll be
 * recomputed the next time the audit is submitted. Responses themselves are
 * preserved untouched.
 */
export async function reopenAudit(id: number): Promise<void> {
  await execute(
    `UPDATE audits SET
       status          = 'in_progress',
       score           = NULL,
       max_score       = NULL,
       critical_failed = 0,
       submitted_at    = NULL
     WHERE id = $1 AND status = 'submitted'`,
    [id]
  );
}
