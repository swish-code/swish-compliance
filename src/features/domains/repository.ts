import "server-only";
import { queryAll, queryOne } from "@/lib/db";
import type { Domain, DomainFramework } from "./types";

const DOMAIN_SELECT = `
  d.id, d.code, d.name, d.description, d.sort_order,
  d.is_active, d.created_at, d.updated_at,
  (SELECT COUNT(*)::int FROM frameworks f WHERE f.domain_id = d.id) AS framework_count
FROM domains d
`;

export async function listDomains(includeInactive = false): Promise<Domain[]> {
  const where = includeInactive ? "" : "WHERE d.is_active";
  return queryAll<Domain>(
    `SELECT ${DOMAIN_SELECT} ${where} ORDER BY d.sort_order, d.name`
  );
}

export async function getDomain(id: number): Promise<Domain | undefined> {
  return queryOne<Domain>(
    `SELECT ${DOMAIN_SELECT} WHERE d.id = $1`,
    [id]
  );
}

export async function createDomain(input: {
  code: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  /** SOP-first audit scoping (migration 046) — a domain names at most one
   *  SOP + department, so the audit scope picker can walk SOP → domain. */
  sop_id: number | null;
  department_id: number | null;
}): Promise<number> {
  const row = await queryOne<{ id: number }>(
    `INSERT INTO domains (code, name, description, sort_order, sop_id, department_id, is_active)
     VALUES ($1, $2, $3, COALESCE($4, 0), $5, $6, TRUE)
     RETURNING id`,
    [
      input.code,
      input.name,
      input.description,
      input.sort_order,
      input.sop_id,
      input.department_id,
    ]
  );
  return row!.id;
}

/**
 * All frameworks attached to a given domain, ordered by code so the
 * numeric suffix (FW-001, FW-002, …) reads naturally on the page.
 */
export async function listFrameworksForDomain(
  domainId: number
): Promise<DomainFramework[]> {
  return queryAll<DomainFramework>(
    `SELECT id, code, name, description, category, is_active
     FROM frameworks
     WHERE domain_id = $1
     ORDER BY code, name`,
    [domainId]
  );
}
