import { requireUser } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { queryAll } from "@/lib/db";
import { getUserScope, getScopedIds } from "@/lib/auth/access";
import { createAuditAction } from "@/features/audits/actions";
import NewAuditForm from "@/features/audits/NewAuditForm";
import { loadScopeGraph } from "@/features/audits/scope";

/**
 * New audit — SOP-first.
 *
 * The auditor scopes the audit by picking a Policy and a scope type; the
 * controls, tests, checklists and questions underneath load automatically.
 * Nothing below the framework is ever chosen by hand.
 */
export default async function NewAuditPage() {
  const user = await requireUser();
  // Access scoping (user spec): whoever creates audits only sees the
  // brands / departments / domains (and their frameworks/controls/tests)
  // they have access to. Full-visibility roles see everything.
  const scope = await getUserScope(user.id, user.role);
  const scopedIds = await getScopedIds(scope);

  const [allBrands, allDepartments, policies, assignees, fullGraph] =
    await Promise.all([
      queryAll<{ id: number; name: string }>(
        `SELECT id, name FROM brands WHERE is_active ORDER BY name`
      ),
      queryAll<{ id: number; name: string }>(
        `SELECT id, name FROM departments WHERE is_active ORDER BY name`
      ),
      // Policies = approved SOPs. An audit is always run against a
      // published policy, never a draft.
      queryAll<{
        id: number;
        code: string | null;
        title: string;
        department_id: number | null;
      }>(
        `SELECT id, code, title, department_id
         FROM sops
         WHERE status = 'approved'
         ORDER BY code NULLS LAST, title
         LIMIT 500`
      ),
      queryAll<{ id: number; display_name: string; role: string }>(
        `SELECT id, display_name, role
         FROM users
         WHERE is_active = TRUE
         ORDER BY role, display_name`
      ),
      loadScopeGraph(),
    ]);

  const brands = scope.full
    ? allBrands
    : allBrands.filter((b) => scope.brandIds.includes(b.id));
  const departments = scope.full
    ? allDepartments
    : allDepartments.filter((d) => scope.departmentIds.includes(d.id));

  // Narrow the scope graph to what this user may audit. The picker walks
  // SOP → domain → framework → control → test entirely off this graph, so
  // trimming it here is what keeps out-of-scope branches out of the
  // dropdowns AND out of the preview counts.
  const graph = scopedIds
    ? {
        domains: fullGraph.domains.filter((d) =>
          scopedIds.domainIds.includes(d.id)
        ),
        frameworks: fullGraph.frameworks.filter((f) =>
          scopedIds.frameworkIds.includes(f.id)
        ),
        controls: fullGraph.controls.filter(
          (c) =>
            c.framework_id != null &&
            scopedIds.frameworkIds.includes(c.framework_id)
        ),
        tests: fullGraph.tests.filter(
          (t) =>
            t.control_id != null && scopedIds.controlIds.includes(t.control_id)
        ),
      }
    : fullGraph;

  return (
    <Workspace
      section="Compliance / Audits"
      subtitle="Start a new audit"
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h1 className="text-lg font-semibold text-gray-900 mb-5">
            Start a new audit
          </h1>
          <NewAuditForm
            action={createAuditAction}
            departments={departments}
            users={assignees}
            brands={brands}
            policies={policies}
            graph={graph}
            today={new Date().toISOString().split("T")[0]}
          />
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              How audit scoping works
            </h2>
            <ol className="space-y-2">
              {[
                ["SOP", "Policy / SOP"],
                ["Scope Type", "Full SOP / Domain / Framework"],
                ["Domain", "if applicable"],
                ["Framework", "if Framework Audit"],
                ["Controls / Tests", "auto loaded"],
              ].map(([title, sub], i) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold grid place-items-center">
                    {i + 1}
                  </span>
                  <span className="text-xs">
                    <span className="font-medium text-gray-800">{title}</span>
                    <span className="text-gray-400"> · {sub}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
              Based on your selection, everything below it is pulled in
              automatically:{" "}
              <span className="font-medium text-gray-700">
                Controls → Tests → Checklists → Questions
              </span>
              .
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Scope types
            </h2>
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="font-medium text-gray-800">1. Full SOP Audit</dt>
                <dd className="text-gray-500 mt-0.5">
                  Reviews the whole SOP for the audited department — every
                  domain and framework beneath it.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-800">
                  2. Framework Audit{" "}
                  <span className="text-brand-700 font-normal">· default</span>
                </dt>
                <dd className="text-gray-500 mt-0.5">
                  Reviews one framework inside the SOP.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-800">
                  3. Domain Audit{" "}
                  <span className="text-amber-600 font-normal">· optional</span>
                </dt>
                <dd className="text-gray-500 mt-0.5">
                  Reviews an entire domain. Only for large thematic reviews.
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">
              Important notes
            </h2>
            <ul className="space-y-1.5 text-[11px] text-gray-600">
              {[
                "Controls, Tests and Checklists are never picked by hand when creating an audit.",
                "Everything is loaded automatically from the scope you select.",
                "Each audit is tied to exactly one department.",
                "If a SOP spans several departments, create a separate audit per department.",
                "Framework is the deepest level you can scope to.",
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-green-600 shrink-0" aria-hidden="true">
                    ✓
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </Workspace>
  );
}
