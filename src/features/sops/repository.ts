import "server-only";
import { queryAll, queryOne, execute } from "@/lib/db";
import type { Sop, SopStatus } from "./types";

const SOP_SELECT = `
  s.id, s.code, s.title, s.description, s.version, s.status, s.file_url,
  s.attachment_data_url, s.attachment_name, s.attachment_mime,
  s.brand_id, b.name AS brand_name,
  s.department_id, d.name AS department_name,
  s.owner_id, u_o.display_name AS owner_name,
  s.created_by, u_c.display_name AS created_by_name,
  s.approved_by, u_a.display_name AS approved_by_name,
  s.approved_at, s.effective_date, s.review_date, s.created_at, s.updated_at,
  s.brand_is_function, s.is_all_departments,
  s.purpose, s.scope, s.process_flow, s.roles_responsibilities,
  s.inputs_outputs, s.tools_forms, s.kpis,
  s.ownership_review, s.appendices, s.signatures_approval
FROM sops s
LEFT JOIN brands       b   ON b.id   = s.brand_id
LEFT JOIN departments  d   ON d.id   = s.department_id
LEFT JOIN users        u_o ON u_o.id = s.owner_id
LEFT JOIN users        u_c ON u_c.id = s.created_by
LEFT JOIN users        u_a ON u_a.id = s.approved_by
`;

export type ListFilters = {
  status?: SopStatus;
  search?: string;
  brandId?: number;
  departmentId?: number;
  limit?: number;
  offset?: number;
};

export async function listSops(f: ListFilters = {}): Promise<{ rows: Sop[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (f.status) {
    params.push(f.status);
    conditions.push(`s.status = $${params.length}`);
  }
  if (f.search) {
    params.push(`%${f.search}%`);
    conditions.push(`(s.title ILIKE $${params.length} OR s.code ILIKE $${params.length})`);
  }
  if (f.brandId) {
    params.push(f.brandId);
    conditions.push(`s.brand_id = $${params.length}`);
  }
  if (f.departmentId) {
    params.push(f.departmentId);
    conditions.push(`s.department_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const limit = f.limit ?? 50;
  const offset = f.offset ?? 0;
  params.push(limit, offset);

  const rows = await queryAll<Sop>(
    `SELECT ${SOP_SELECT} ${where}
     ORDER BY s.updated_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const totalRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM sops s ${where}`,
    params.slice(0, params.length - 2)
  );

  return { rows, total: totalRow?.total ?? 0 };
}

export async function getSopById(id: number): Promise<Sop | undefined> {
  return queryOne<Sop>(`SELECT ${SOP_SELECT} WHERE s.id = $1`, [id]);
}

export type CreateSopInput = {
  code?: string | null;
  title: string;
  description?: string | null;
  version?: string;
  file_url?: string | null;
  attachment_data_url?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  brand_id?: number | null;
  department_id?: number | null;
  owner_id?: number | null;
  effective_date?: string | null;
  review_date?: string | null;
  created_by: number;
  // Scope flags (migration 020) — TRUE overrides the corresponding _id.
  brand_is_function?: boolean;
  is_all_departments?: boolean;
  // 10 structured sections - all optional
  purpose?: string | null;
  scope?: string | null;
  process_flow?: string | null;
  roles_responsibilities?: string | null;
  inputs_outputs?: string | null;
  tools_forms?: string | null;
  kpis?: string | null;
  ownership_review?: string | null;
  appendices?: string | null;
  signatures_approval?: string | null;
};

export async function createSop(input: CreateSopInput): Promise<number> {
  // brand_id is meaningless when brand_is_function is true (the SOP spans
  // every brand); same logic for is_all_departments. Force the *_id columns
  // to NULL in those cases so the data on disk doesn't disagree with the
  // semantic flag.
  const brandId = input.brand_is_function ? null : input.brand_id ?? null;
  const departmentId = input.is_all_departments ? null : input.department_id ?? null;

  const row = await queryOne<{ id: number }>(
    `INSERT INTO sops
      (code, title, description, version, status, file_url,
       attachment_data_url, attachment_name, attachment_mime,
       brand_id, department_id, owner_id, created_by, effective_date, review_date,
       brand_is_function, is_all_departments,
       purpose, scope, process_flow, roles_responsibilities,
       inputs_outputs, tools_forms, kpis,
       ownership_review, appendices, signatures_approval)
     VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
             $15, $16,
             $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
     RETURNING id`,
    [
      input.code ?? null,
      input.title,
      input.description ?? null,
      input.version ?? "1.0",
      input.file_url ?? null,
      input.attachment_data_url ?? null,
      input.attachment_name ?? null,
      input.attachment_mime ?? null,
      brandId,
      departmentId,
      input.owner_id ?? input.created_by,
      input.created_by,
      input.effective_date ?? null,
      input.review_date ?? null,
      input.brand_is_function ?? false,
      input.is_all_departments ?? false,
      input.purpose ?? null,
      input.scope ?? null,
      input.process_flow ?? null,
      input.roles_responsibilities ?? null,
      input.inputs_outputs ?? null,
      input.tools_forms ?? null,
      input.kpis ?? null,
      input.ownership_review ?? null,
      input.appendices ?? null,
      input.signatures_approval ?? null,
    ]
  );
  return row!.id;
}

export async function setSopAttachment(
  id: number,
  dataUrl: string | null,
  name: string | null,
  mime: string | null
): Promise<void> {
  await execute(
    `UPDATE sops SET attachment_data_url = $2, attachment_name = $3, attachment_mime = $4 WHERE id = $1`,
    [id, dataUrl, name, mime]
  );
}

export type SopEvent = {
  id: number;
  action: string;
  user_email: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

/** Workflow / change history for a SOP, read from audit_logs. */
export async function listSopEvents(sopId: number): Promise<SopEvent[]> {
  return queryAll<SopEvent>(
    `SELECT id, action, user_email, details, created_at
     FROM audit_logs
     WHERE entity = 'sop' AND entity_id = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [sopId]
  );
}

export async function setSopStatus(
  id: number,
  status: SopStatus,
  approverId: number | null
): Promise<void> {
  if (status === "approved") {
    await execute(
      `UPDATE sops SET status = 'approved', approved_by = $1, approved_at = NOW() WHERE id = $2`,
      [approverId, id]
    );
  } else {
    await execute(`UPDATE sops SET status = $1 WHERE id = $2`, [status, id]);
  }
}
