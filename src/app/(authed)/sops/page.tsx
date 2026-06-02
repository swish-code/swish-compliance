import Link from "next/link";
import { requireUser, canEditSops } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { listSops } from "@/features/sops/repository";
import { SOP_STATUS_LABEL, SOP_STATUS_TONE, type SopStatus } from "@/features/sops/types";

type Search = { search?: string; status?: SopStatus };

export default async function SopsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const { rows, total } = await listSops({
    search: sp.search,
    status: sp.status,
  });

  return (
    <Workspace
      section="Compliance"
      subtitle="Standard Operating Procedures (SOPs) register"
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4 flex flex-wrap items-center gap-3 justify-between">
        <form className="flex items-center gap-2 flex-1 max-w-md" method="get">
          <input
            type="text"
            name="search"
            defaultValue={sp.search ?? ""}
            placeholder="Search by title or code…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All statuses</option>
            {(Object.keys(SOP_STATUS_LABEL) as SopStatus[]).map((s) => (
              <option key={s} value={s}>
                {SOP_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
          >
            Filter
          </button>
        </form>

        {canEditSops(user.role) && (
          <Link
            href="/sops/new"
            className="bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + New SOP
          </Link>
        )}
      </div>

      {/* Table */}
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
              <th className="text-left px-5 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                  No SOPs match the current filters.
                </td>
              </tr>
            )}
            {rows.map((sop) => (
              <tr key={sop.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-xs text-gray-500">
                  {sop.code ?? "—"}
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/sops/${sop.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {sop.title}
                  </Link>
                </td>
                <td className="px-5 py-3 text-gray-600">{sop.brand_name ?? "—"}</td>
                <td className="px-5 py-3 text-gray-600">{sop.department_name ?? "—"}</td>
                <td className="px-5 py-3 text-gray-600">{sop.version}</td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${SOP_STATUS_TONE[sop.status]}`}
                  >
                    {SOP_STATUS_LABEL[sop.status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {new Date(sop.updated_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-400 mt-3 text-right">
        Showing {rows.length} of {total} SOPs
      </div>
    </Workspace>
  );
}
