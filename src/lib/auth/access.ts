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

export type ScopedIds = {
  departmentIds: number[];
  domainIds: number[];
  frameworkIds: number[];
  controlIds: number[];
};

/**
 * Resolve the concrete id sets a scoped user may see across the GRC tree:
 * frameworks whose domain is in scope, and controls under those frameworks.
 * Returns null for full-visibility users (no filtering). Lets list pages
 * filter their already-fetched rows in memory by id / framework_id /
 * control_id / department_id without editing every repository select.
 */
export async function getScopedIds(scope: UserScope): Promise<ScopedIds | null> {
  if (scope.full) return null;
  const frameworks = scope.domainIds.length
    ? await queryAll<{ id: number }>(
        `SELECT id FROM frameworks WHERE domain_id = ANY($1)`,
        [scope.domainIds]
      )
    : [];
  const frameworkIds = frameworks.map((r) => r.id);
  const controls = frameworkIds.length
    ? await queryAll<{ id: number }>(
        `SELECT id FROM controls WHERE framework_id = ANY($1)`,
        [frameworkIds]
      )
    : [];
  return {
    departmentIds: scope.departmentIds,
    domainIds: scope.domainIds,
    frameworkIds,
    controlIds: controls.map((r) => r.id),
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
