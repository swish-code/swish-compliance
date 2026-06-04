import Link from "next/link";
import { requireUser, canEditSops } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { listSops } from "@/features/sops/repository";
import { SOP_STATUS_LABEL, SOP_STATUS_TONE, type SopStatus } from "@/features/sops/types";

/**
 * Per the SWiSH ECS PDF §9.4 the Policies module shares the same governed
 * parent/version model as SOPs. Until we split them into a separate table,
 * the Policies page is a clean view over the same `sops` register with a
 * different framing: focused on approved/published items that an employee
 * audience should be able to read.
 */
export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: SopStatus }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const { rows, total } = await listSops({
    search: sp.search,
    status: sp.status ?? "approved",
  });

  return (
    <Workspace
      section="Compliance / Policies"
      subtitle={`Approved policies and SOPs (${total} total)`}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4 flex items-center gap-3 justify-between">
        <form method="get" className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            name="search"
            defaultValue={sp.search ?? ""}
            placeholder="Search policies / SOPs…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            name="status"
            defaultValue={sp.status ?? "approved"}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="approved">Approved only</option>
            <option value="">All statuses</option>
            <option value="pending_review">Pending review</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Filter</button>
        </form>
        {canEditSops(user.role) && (
          <Link
            href="/sops/new"
            className="bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + New Policy
          </Link>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-3 px-2">
        Policies and SOPs share the same governed register. Open the SOPs page to manage drafts and approvals.
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Code</th>
              <th className="text-left px-5 py-3 font-medium">Title</th>
              <th className="text-left px-5 py-3 font-medium">Brand</th>
              <th className="text-left px-5 py-3 font-medium">Department</th>
              <th className="text-left px-5 py-3 font-medium">Version</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="text-left px-5 py-3 font-medium">Approved</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                  No policies match the filter.
                </td>
              </tr>
            )}
            {rows.map((sop) => (
              <tr key={sop.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-xs text-gray-500">{sop.code ?? "—"}</td>
                <td className="px-5 py-3">
                  <Link href={`/sops/${sop.id}`} className="font-medium text-brand-700 hover:underline">
                    {sop.title}
                  </Link>
                </td>
                <td className="px-5 py-3 text-gray-600">{sop.brand_name ?? "—"}</td>
                <td className="px-5 py-3 text-gray-600">{sop.department_name ?? "—"}</td>
                <td className="px-5 py-3 text-gray-600">{sop.version}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${SOP_STATUS_TONE[sop.status]}`}>
                    {SOP_STATUS_LABEL[sop.status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-gray-500">
                  {sop.approved_at ? new Date(sop.approved_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Workspace>
  );
}
