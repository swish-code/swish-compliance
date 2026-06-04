import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, canEditSops } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import {
  getTemplate,
  listTemplateItems,
} from "@/features/checklists/repository";
import {
  updateTemplateAction,
  addItemAction,
  deleteItemAction,
} from "@/features/checklists/actions";
import { CHECKLIST_CATEGORIES } from "@/features/checklists/types";

export default async function ChecklistTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id: idStr } = await params;
  const id = Number(idStr);
  const tpl = await getTemplate(id);
  if (!tpl) notFound();
  const items = await listTemplateItems(id);
  const canEdit = canEditSops(user.role);

  return (
    <Workspace
      section="Compliance / Checklists"
      subtitle={tpl.name}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <form action={updateTemplateAction} className="space-y-4">
          <input type="hidden" name="id" value={tpl.id} />
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Name</label>
              <input
                name="name"
                defaultValue={tpl.name}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
              <select
                name="category"
                defaultValue={tpl.category ?? ""}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
              >
                <option value="">— None —</option>
                {CHECKLIST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
            <textarea
              name="description"
              defaultValue={tpl.description ?? ""}
              rows={2}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
            />
          </div>
          {canEdit && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_active" defaultChecked={tpl.is_active} className="accent-brand-700" />
                Active
              </label>
              <button
                type="submit"
                className="ml-auto bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Save header
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            Items ({items.length})
          </h3>
          <Link
            href={`/audits/new?template=${tpl.id}`}
            className="text-sm text-brand-700 hover:underline"
          >
            Run audit with this template →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-medium w-12">#</th>
              <th className="text-left px-5 py-3 font-medium">Question</th>
              <th className="text-left px-5 py-3 font-medium w-24">Weight</th>
              <th className="text-left px-5 py-3 font-medium w-28">Critical?</th>
              {canEdit && <th className="text-right px-5 py-3 font-medium w-20"></th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-5 py-8 text-center text-gray-400">
                  No items yet. Add the first question below.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-t border-gray-100">
                <td className="px-5 py-3 text-xs text-gray-400">{item.sort_order}</td>
                <td className="px-5 py-3">
                  <div className="text-gray-900">{item.question}</div>
                  {item.guidance && (
                    <div className="text-xs text-gray-500 mt-1">{item.guidance}</div>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-600">×{item.weight}</td>
                <td className="px-5 py-3">
                  {item.is_critical ? (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded">
                      Critical
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                {canEdit && (
                  <td className="px-5 py-3 text-right">
                    <form action={deleteItemAction} className="inline">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="template_id" value={tpl.id} />
                      <button
                        type="submit"
                        className="text-xs text-red-600 hover:text-red-800 hover:underline"
                      >
                        Remove
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add item */}
      {canEdit && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Add a new item</h3>
          <form action={addItemAction} className="space-y-3">
            <input type="hidden" name="template_id" value={tpl.id} />
            <div>
              <input
                name="question"
                required
                placeholder="Question / criterion"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <input
                name="guidance"
                placeholder="Optional guidance for the auditor"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-end gap-3">
              <div className="w-28">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Weight</label>
                <input
                  type="number"
                  name="weight"
                  min={1}
                  max={10}
                  defaultValue={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm pb-2">
                <input type="checkbox" name="is_critical" className="accent-brand-700" />
                Mark as critical
              </label>
              <button
                type="submit"
                className="ml-auto bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                + Add item
              </button>
            </div>
          </form>
        </div>
      )}
    </Workspace>
  );
}
