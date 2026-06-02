import { requireAdmin } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { queryAll } from "@/lib/db";
import {
  createDepartmentAction,
  renameDepartmentAction,
  toggleDepartmentAction,
} from "@/features/admin/reference/actions";

type Row = { id: number; name: string; is_active: boolean; created_at: string };

export default async function DepartmentsAdminPage() {
  const me = await requireAdmin();
  const rows = await queryAll<Row>(
    `SELECT id, name, is_active, created_at FROM departments ORDER BY name`
  );

  return (
    <Workspace
      section="Administration / Departments"
      subtitle="Manage company departments"
      sessionLabel="Session"
      userLabel={me.displayName}
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <form action={createDepartmentAction} className="flex items-end gap-3 max-w-2xl">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              New department name
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Logistics"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            className="bg-brand-700 hover:bg-brand-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap"
          >
            + Add Department
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-medium w-16">ID</th>
              <th className="text-left px-5 py-3 font-medium">Name</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="text-right px-5 py-3 font-medium w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-gray-400">
                  No departments yet — add the first one above.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100">
                <td className="px-5 py-3 font-mono text-xs text-gray-400">{row.id}</td>
                <td className="px-5 py-3">
                  <form action={renameDepartmentAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <input
                      type="text"
                      name="name"
                      defaultValue={row.name}
                      className="px-2 py-1 border border-transparent hover:border-gray-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 rounded text-sm w-full"
                    />
                    <button type="submit" className="text-xs text-brand-700 hover:underline whitespace-nowrap">
                      Save
                    </button>
                  </form>
                </td>
                <td className="px-5 py-3">
                  {row.is_active ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <form action={toggleDepartmentAction} className="inline-block">
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="is_active" value={row.is_active ? "" : "on"} />
                    <button
                      type="submit"
                      className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                        row.is_active
                          ? "border-gray-300 text-gray-600 hover:bg-gray-100"
                          : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {row.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Workspace>
  );
}
