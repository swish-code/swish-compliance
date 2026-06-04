import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { queryAll } from "@/lib/db";
import { createAuditAction } from "@/features/audits/actions";

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
