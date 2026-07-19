import "server-only";
import { queryAll } from "@/lib/db";

/**
 * Access scoping (user spec 2026-07-09): non-privileged users only see the
 * departments + domains they are mapped to. admin / compliance /
 * business_excellence have full visibility.
 *
 * Department scope comes from user_departments (falling back to the legacy
 * users.department_id), domain scope from user_domains, brand scope from
 * user_brands. Everything else (frameworks/controls/tests/questions) is
 * scoped through its domain; SOPs/audits/CAPAs through department.
 */

const FULL_VISIBILITY_ROLES = ["admin", "compliance", "business_excellence"];

export function hasFullVisibility(role: string): boolean {
  return FULL_VISIBILITY_ROLES.includes(role);
}

export type UserScope = {
  full: boolean;
  departmentIds: number[];
  domainIds: number[];
  brandIds: number[];
};

/**
 * Resolve a user's access scope from the mapping tables. Full-visibility
 * roles short-circuit (no filtering). One round-trip.
 */
export async function getUserScope(
  userId: number,
  role: string
): Promise<UserScope> {
  if (hasFullVisibility(role)) {
    return { full: true, departmentIds: [], domainIds: [], brandIds: [] };
  }
  const rows = await queryAll<{ kind: string; id: number }>(
    `SELECT 'dept' AS kind, department_id AS id FROM user_departments WHERE user_id = $1
     UNION ALL
     SELECT 'dept', department_id FROM users WHERE id = $1 AND department_id IS NOT NULL
     UNION ALL
     SELECT 'domain', domain_id FROM user_domains WHERE user_id = $1
     UNION ALL
     SELECT 'brand', brand_id FROM user_brands WHERE user_id = $1`,
    [userId]
  );
  const dep = new Set<number>();
  const dom = new Set<number>();
  const br = new Set<number>();
  for (const r of rows) {
    if (r.kind === "dept") dep.add(r.id);
    else if (r.kind === "domain") dom.add(r.id);
    else if (r.kind === "brand") br.add(r.id);
  }
  return {
    full: false,
    departmentIds: [...dep],
    domainIds: [...dom],
    brandIds: [...br],
  };
}

/**
 * Build a SQL "IN (...)" fragment for a scoped id list, or a guaranteed-empty
 * predicate when the user has no ids of that kind. Returns null when access
 * is full (caller should apply no filter). The column is trusted (caller
 * supplies a literal), ids are numbers so safe to inline.
 */
export function scopeInClause(
  column: string,
  ids: number[],
  scope: UserScope
): string | null {
  if (scope.full) return null;
  if (ids.length === 0) return `${column} = -1`; // empty set → nothing matches
  return `${column} IN (${ids.map((n) => Number(n)).join(",")})`;
}
