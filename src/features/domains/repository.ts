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
