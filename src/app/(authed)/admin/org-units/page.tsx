import { requireAdmin } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { listOrgUnitsAsTree } from "@/features/org-units/repository";
import {
  createOrgUnitAction,
  updateOrgUnitAction,
  deleteOrgUnitAction,
} from "@/features/org-units/actions";

export default async function OrgUnitsAdminPage() {
  const me = await requireAdmin();
  const rows = await listOrgUnitsAsTree(true);

  // Parent options for the "+ Add unit" form. Indented so the picker
  // reads like a tree even though it's a single <select>.
  const parentOptions = rows
    .filter((r) => r.is_active && r.level < 4) // cap at 4 levels deep for now
    .map((r) => ({
      id: r.id,
      label: `${" ".repeat(Math.max(0, r.level - 1))}${r.code}  ${r.name}`,
    }));

  return (
    <Workspace
      section="Administration / Org Units"
      subtitle="Manage the hierarchical organisation tree"
      sessionLabel="Session"
      userLabel={me.displayName}
    >
      {/* + Add unit */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Add a new org unit
        </h3>
        <form
          action={createOrgUnitAction}
          className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="code"
              required
              placeholder="e.g. A.6 or B.2.1.4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="Display name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Parent
            </label>
            <select
              name="parent_id"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">— Root (no parent) —</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              className="bg-brand-700 hover:bg-brand-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
            >
              + Add unit
            </button>
          </div>
        </form>
        <p className="text-[11px] text-gray-500 mt-3">
          The new unit&rsquo;s level is derived automatically from the parent
          (root = 1). Children of a deleted unit are removed as well (cascade).
        </p>
      </div>

      {/* Tree table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            Org tree ({rows.length} units)
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-medium w-32">Code</th>
              <th className="text-left px-5 py-3 font-medium">Name</th>
              <th className="text-left px-5 py-3 font-medium w-20">Level</th>
              <th className="text-left px-5 py-3 font-medium w-24">Sort</th>
              <th className="text-left px-5 py-3 font-medium w-28">Status</th>
              <th className="text-right px-5 py-3 font-medium w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-gray-400"
                >
                  No org units yet — add the first one above.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const indent = " ".repeat(Math.max(0, row.level - 1));
              return (
                <tr
                  key={row.id}
                  className={`border-t border-gray-100 ${
                    row.is_active ? "" : "bg-gray-50/60 opacity-70"
                  }`}
                >
                  <td className="px-5 py-2.5 font-mono text-xs text-gray-700 whitespace-pre">
                    {indent}
                    {row.code}
                  </td>
                  <td className="px-5 py-2.5">
                    <form
                      action={updateOrgUnitAction}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="id" value={row.id} />
                      <input
                        type="hidden"
                        name="is_active"
                        value={row.is_active ? "on" : ""}
                      />
                      <input
                        type="hidden"
                        name="sort_order"
                        value={row.sort_order}
                      />
                      <input
                        type="text"
                        name="name"
                        defaultValue={row.name}
                        className="px-2 py-1 border border-transparent hover:border-gray-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 rounded text-sm w-full"
                      />
                      <button
                        type="submit"
                        className="text-xs text-brand-700 hover:underline whitespace-nowrap"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="px-5 py-2.5 text-xs text-gray-500 tabular-nums">
                    L{row.level}
                  </td>
                  <td className="px-5 py-2.5">
                    <form
                      action={updateOrgUnitAction}
                      className="flex items-center gap-1"
                    >
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="name" value={row.name} />
                      <input
                        type="hidden"
                        name="is_active"
                        value={row.is_active ? "on" : ""}
                      />
                      <input
                        type="number"
                        name="sort_order"
                        defaultValue={row.sort_order}
                        className="px-2 py-1 w-16 border border-transparent hover:border-gray-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 rounded text-xs tabular-nums"
                      />
                      <button
                        type="submit"
                        className="text-xs text-brand-700 hover:underline"
                      >
                        ↻
                      </button>
                    </form>
                  </td>
                  <td className="px-5 py-2.5">
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
                  <td className="px-5 py-2.5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <form
                        action={updateOrgUnitAction}
                        className="inline-block"
                      >
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="name" value={row.name} />
                        <input
                          type="hidden"
                          name="sort_order"
                          value={row.sort_order}
                        />
                        <input
                          type="hidden"
                          name="is_active"
                          value={row.is_active ? "" : "on"}
                        />
                        <button
                          type="submit"
                          className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                            row.is_active
                              ? "border-gray-300 text-gray-600 hover:bg-gray-100"
                              : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {row.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                      <form
                        action={deleteOrgUnitAction}
                        className="inline-block"
                      >
                        <input type="hidden" name="id" value={row.id} />
                        <button
                          type="submit"
                          className="text-xs px-2.5 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
                          title="Delete this unit and all of its descendants"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Workspace>
  );
}
