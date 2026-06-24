import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, canEditSops } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import {
  getTemplate,
  listTemplateItems,
  listLatestAnswersForTemplate,
} from "@/features/checklists/repository";
import {
  updateTemplateAction,
  addItemAction,
  deleteItemAction,
  recordChecklistItemAnswerAction,
} from "@/features/checklists/actions";
import { CHECKLIST_CATEGORIES_FALLBACK } from "@/features/checklists/types";
import { listOptions } from "@/features/config/repository";

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
  const [items, latestAnswers] = await Promise.all([
    listTemplateItems(id),
    listLatestAnswersForTemplate(id),
  ]);
  const answerByItem = new Map(latestAnswers.map((a) => [a.item_id, a]));
  const canEdit = canEditSops(user.role);
  // Renaming a template, rewording its description, switching category, or
  // deactivating it cascades to every audit that ever used it. Lock those
  // header fields to admins only — non-admins can still answer items and
  // (if they have canEditSops) add/remove items.
  const isAdmin = user.role === "admin";

  const dbCategories = await listOptions("checklist_category", true);
  const categories =
    dbCategories.length > 0
      ? dbCategories.map((o) => o.label)
      : CHECKLIST_CATEGORIES_FALLBACK;

  return (
    <Workspace
      section="Compliance / Checklists"
      subtitle={tpl.name}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      {/* Header — admin-only. Non-admin viewers see the same info as a   */}
      {/* read-only summary; the edit form is hidden entirely so the      */}
      {/* "Save header" button can never sit unused.                       */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        {isAdmin ? (
          <form action={updateTemplateAction} className="space-y-4">
            <input type="hidden" name="id" value={tpl.id} />
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Name</label>
                <input
                  name="name"
                  defaultValue={tpl.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
                <select
                  name="category"
                  defaultValue={tpl.category ?? ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
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
          </form>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <div className="text-xs font-medium text-gray-500 mb-0.5">Name</div>
                <div className="text-sm text-gray-900">{tpl.name}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-0.5">Category</div>
                <div className="text-sm text-gray-700">{tpl.category ?? "—"}</div>
              </div>
            </div>
            {tpl.description && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-0.5">Description</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{tpl.description}</div>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${
                  tpl.is_active
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    tpl.is_active ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                />
                {tpl.is_active ? "Active" : "Inactive"}
              </span>
              <span className="text-gray-300">·</span>
              <span>
                Only an admin can rename or edit this template&rsquo;s header.
              </span>
            </div>
          </div>
        )}
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
              <th className="text-left px-5 py-3 font-medium w-20">Weight</th>
              <th className="text-left px-5 py-3 font-medium w-24">Critical?</th>
              <th className="text-left px-5 py-3 font-medium">Answer</th>
              {canEdit && <th className="text-right px-5 py-3 font-medium w-20"></th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="px-5 py-8 text-center text-gray-400">
                  No items yet. Add the first question below.
                </td>
              </tr>
            )}
            {items.map((item, idx) => {
              const latest = answerByItem.get(item.id);
              return (
                <tr key={item.id} className="border-t border-gray-100 align-top">
                  {/* # is the visible row position (1..N), not sort_order.
                      sort_order has gaps after deletions; the displayed
                      number should always be 1, 2, 3, … so the column
                      reads naturally to the auditor. */}
                  <td className="px-5 py-3 text-xs text-gray-400">{idx + 1}</td>
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
                  <td className="px-5 py-3 min-w-[360px]">
                    {latest && (
                      <div
                        className={`mb-2 p-2 rounded-lg border text-xs ${
                          latest.answer === "yes"
                            ? "bg-emerald-50 border-emerald-200"
                            : latest.answer === "no"
                            ? "bg-red-50 border-red-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              latest.answer === "yes"
                                ? "bg-emerald-600 text-white"
                                : latest.answer === "no"
                                ? "bg-red-600 text-white"
                                : "bg-gray-500 text-white"
                            }`}
                          >
                            {latest.answer === "na" ? "N/A" : latest.answer}
                          </span>
                          <span className="text-gray-600">
                            {latest.answered_by_name ?? "—"}
                          </span>
                          <span className="text-gray-400">
                            · {new Date(latest.answered_at).toLocaleString()}
                          </span>
                        </div>
                        {latest.note && (
                          <div className="text-gray-700 whitespace-pre-wrap mt-1">
                            {latest.note}
                          </div>
                        )}
                      </div>
                    )}
                    <form
                      action={recordChecklistItemAnswerAction}
                      className="flex flex-wrap items-start gap-2"
                    >
                      <input type="hidden" name="item_id" value={item.id} />
                      <input type="hidden" name="template_id" value={tpl.id} />
                      <div className="flex items-center gap-2">
                        {(["yes", "no", "na"] as const).map((a) => (
                          <label
                            key={a}
                            className="inline-flex items-center gap-1 px-2 py-1 border border-gray-200 rounded cursor-pointer text-xs has-checked:bg-brand-50 has-checked:border-brand-400"
                          >
                            <input
                              type="radio"
                              name="answer"
                              value={a}
                              required
                              className="accent-brand-700"
                            />
                            <span className="font-medium">
                              {a === "na" ? "N/A" : a === "yes" ? "Yes" : "No"}
                            </span>
                          </label>
                        ))}
                      </div>
                      <input
                        name="note"
                        placeholder="Note (optional)"
                        className="flex-1 min-w-[140px] px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        type="submit"
                        className="bg-brand-700 hover:bg-brand-800 text-white px-3 py-1 rounded text-xs font-medium"
                      >
                        Save
                      </button>
                    </form>
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
              );
            })}
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
