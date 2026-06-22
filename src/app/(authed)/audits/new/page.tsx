import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { queryAll } from "@/lib/db";
import { createAuditAction } from "@/features/audits/actions";
import AuditScopePicker from "@/features/audits/AuditScopePicker";

export default async function NewAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const presetTemplateId = sp.template ? Number(sp.template) : null;

  const templates = await queryAll<{ id: number; name: string; category: string | null }>(
    `SELECT id, name, category FROM checklist_templates WHERE is_active ORDER BY name`
  );
  const brands = await queryAll<{ id: number; name: string }>(
    `SELECT id, name FROM brands WHERE is_active ORDER BY name`
  );
  const departments = await queryAll<{ id: number; name: string }>(
    `SELECT id, name FROM departments WHERE is_active ORDER BY name`
  );

  // Policies = approved SOPs in this system (the Policies page is just a
  // filtered view over `sops`). We only show approved ones because an audit
  // should be performed against an active, published policy.
  const policies = await queryAll<{
    id: number;
    code: string | null;
    title: string;
    department_name: string | null;
  }>(
    `SELECT s.id, s.code, s.title, d.name AS department_name
     FROM sops s
     LEFT JOIN departments d ON d.id = s.department_id
     WHERE s.status = 'approved'
     ORDER BY s.title
     LIMIT 500`
  );

  // Scope picker dataset — Domain → Framework → Control → Tests.
  // Pre-load all four lists once and let the client component filter the
  // cascade in memory. The volumes are small enough (<2k rows total) that
  // a per-change API round-trip would only hurt UX.
  const scopeDomains = await queryAll<{ id: number; code: string; name: string }>(
    `SELECT id, code, name FROM domains WHERE is_active ORDER BY sort_order, name`
  );
  const scopeFrameworks = await queryAll<{
    id: number;
    code: string;
    name: string;
    domain_id: number | null;
  }>(
    `SELECT id, code, name, domain_id
     FROM frameworks
     WHERE is_active
     ORDER BY code, name`
  );
  const scopeControls = await queryAll<{
    id: number;
    code: string | null;
    name: string;
    framework_id: number | null;
  }>(
    `SELECT id, code, name, framework_id
     FROM controls
     WHERE is_active
     ORDER BY code NULLS LAST, name
     LIMIT 1000`
  );
  const scopeTests = await queryAll<{
    id: number;
    code: string | null;
    name: string;
    control_id: number | null;
  }>(
    `SELECT id, code, name, control_id
     FROM checks
     WHERE is_active
     ORDER BY code NULLS LAST, name
     LIMIT 2000`
  );

  // Assignee dropdown — every active user, grouped by role so picking
  // the right person is easier in larger orgs.
  const assignees = await queryAll<{
    id: number;
    display_name: string;
    role: string;
  }>(
    `SELECT id, display_name, role
     FROM users
     WHERE is_active = TRUE
     ORDER BY role, display_name`
  );

  if (templates.length === 0) {
    return (
      <Workspace
        section="Compliance / Audits"
        subtitle="Start a new audit"
        sessionLabel="Session"
        userLabel={user.displayName}
      >
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-lg font-semibold mb-2">No checklist templates yet</h2>
          <p className="text-sm text-gray-500 mb-5">
            You need to create at least one template before running an audit.
          </p>
          <Link
            href="/checklists/templates/new"
            className="inline-block bg-brand-700 hover:bg-brand-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
          >
            Create a template
          </Link>
        </div>
      </Workspace>
    );
  }

  return (
    <Workspace
      section="Compliance / Audits"
      subtitle="Start a new audit"
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-2xl">
        <form action={createAuditAction} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Checklist template <span className="text-red-500">*</span>
            </label>
            <select
              name="template_id"
              required
              defaultValue={presetTemplateId ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">— Choose a template —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.category ? ` · ${t.category}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Brand</label>
              <select
                name="brand_id"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— None —</option>
                {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Department</label>
              <select
                name="department_id"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— None —</option>
                {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Location</label>
              <input
                name="location"
                placeholder="e.g. Salmiya branch"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Audit date</label>
              <input
                type="date"
                name="audit_date"
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Audit window — when the audit is expected to run. datetime-local
              gives both a date and a time picker in a single native widget. */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Start at
              </label>
              <input
                type="datetime-local"
                name="start_at"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                End at
              </label>
              <input
                type="datetime-local"
                name="end_at"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Assign — pick the user who actually runs this audit. Grouped */}
          {/* by role so larger user lists stay scannable.                 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Assign to
            </label>
            <select
              name="assigned_to"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">— No one yet —</option>
              {Array.from(
                assignees.reduce((acc, u) => {
                  const k = u.role || "other";
                  const arr = acc.get(k) ?? acc.set(k, []).get(k)!;
                  arr.push(u);
                  return acc;
                }, new Map<string, typeof assignees>())
              ).map(([role, list]) => (
                <optgroup
                  key={role}
                  label={role
                    .split("_")
                    .map((w) => w[0]?.toUpperCase() + w.slice(1))
                    .join(" ")}
                >
                  {list.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.display_name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              The assigned user receives a notification with this audit
              link. Leave empty to assign later.
            </p>
          </div>

          {/* ── Audit scope — Domain → Framework → Control → Tests ──── */}
          {/* Cascading picker. The previous standalone Framework dropdown   */}
          {/* is folded into this cascade so the auditor can't pick a        */}
          {/* framework that doesn't belong to the chosen domain.            */}
          <AuditScopePicker
            domains={scopeDomains}
            frameworks={scopeFrameworks}
            controls={scopeControls}
            tests={scopeTests}
          />

          {/* ── Policy / SOP — what governing document this audit checks ── */}
          <div className="border-t border-gray-100 pt-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Policy / SOP
              </label>
              <select
                name="policy_id"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— None —</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code ? `${p.code} · ` : ""}
                    {p.title}
                    {p.department_name ? ` · ${p.department_name}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                Approved SOPs only. Pick the policy this audit verifies compliance with.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="bg-brand-700 hover:bg-brand-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
            >
              Start audit
            </button>
            <Link href="/audits" className="text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </Workspace>
  );
}
