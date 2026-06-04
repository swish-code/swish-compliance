import Link from "next/link";
import { requireUser, canEditSops } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { listChecks } from "@/features/checks/repository";
import { CHECK_STATUS_LABEL, CHECK_STATUS_TONE, FREQUENCY_LABEL, type CheckStatus } from "@/features/checks/types";
import { queryAll } from "@/lib/db";
import { createCheckAction } from "@/features/checks/actions";

export default async function TestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: CheckStatus }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const checks = await listChecks({ status: sp.status });
  const canEdit = canEditSops(user.role);
  const controls = canEdit
    ? await queryAll<{ id: number; name: string }>(
        `SELECT id, name FROM controls WHERE is_active ORDER BY name`
      )
    : [];

  const today = new Date().toISOString().split("T")[0];

  return (
    <Workspace
      section="Workspace / Tests"
      subtitle={`Compliance tests (${checks.length})`}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      {/* Filter chips */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["failing", "pending_review", "passing", "accepted_risk"] as CheckStatus[]).map((s) => (
          <Link
            key={s}
            href={sp.status === s ? "/tests" : `/tests?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              sp.status === s
                ? CHECK_STATUS_TONE[s]
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {CHECK_STATUS_LABEL[s]}
          </Link>
        ))}
        {sp.status && <Link href="/tests" className="text-xs text-gray-500 self-center hover:text-gray-700">Clear</Link>}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Name</th>
              <th className="text-left px-5 py-3 font-medium">Control</th>
              <th className="text-left px-5 py-3 font-medium">Frequency</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="text-left px-5 py-3 font-medium">Last run</th>
              <th className="text-left px-5 py-3 font-medium">Due</th>
            </tr>
          </thead>
          <tbody>
            {checks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                  No checks yet. {canEdit && "Use the form below to create the first one."}
                </td>
              </tr>
            )}
            {checks.map((ch) => {
              const overdue = ch.next_due_date && ch.next_due_date < today;
              return (
                <tr key={ch.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/tests/${ch.id}`} className="font-medium text-brand-700 hover:underline">
                      {ch.name}
                    </Link>
                    {ch.code && <div className="text-[11px] font-mono text-gray-400">{ch.code}</div>}
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs">{ch.control_name ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-600 text-xs">{FREQUENCY_LABEL[ch.frequency]}</td>
                  <td className="px-5 py-3">
                    {ch.last_status ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CHECK_STATUS_TONE[ch.last_status]}`}>
                        {CHECK_STATUS_LABEL[ch.last_status]}
                      </span>
                    ) : <span className="text-xs text-gray-400">Never run</span>}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{ch.last_result_at ? new Date(ch.last_result_at).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-3 text-xs">
                    {ch.next_due_date ? (
                      <span className={overdue ? "text-red-700 font-medium" : "text-gray-600"}>
                        {new Date(ch.next_due_date).toLocaleDateString()}
                        {overdue && <span className="block text-[10px] uppercase tracking-wider">Overdue</span>}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Inline create */}
      {canEdit && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Create a new check</h3>
          <form action={createCheckAction} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <input name="code" placeholder="Code (CHK-FS-01)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <input name="name" required placeholder="Name * (e.g. Weekly fridge temperature log)" className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <input name="description" placeholder="Description (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <div className="grid grid-cols-3 gap-3">
              <select name="control_id" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">— No control —</option>
                {controls.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <select name="frequency" defaultValue="monthly" required className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
                <option value="on_demand">On demand</option>
              </select>
              <button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-sm font-medium">+ Create check</button>
            </div>
          </form>
        </div>
      )}
    </Workspace>
  );
}
