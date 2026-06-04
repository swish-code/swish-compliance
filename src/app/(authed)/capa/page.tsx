import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { listCapas } from "@/features/capa/repository";
import {
  CAPA_STATUS_LABEL,
  CAPA_STATUS_TONE,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  type CapaStatus,
} from "@/features/capa/types";

export default async function CapaPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: CapaStatus }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const items = await listCapas({ search: sp.search, status: sp.status });

  const today = new Date().toISOString().split("T")[0];

  return (
    <Workspace
      section="Compliance / Corrective Actions"
      subtitle={`CAPA register (${items.length})`}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4 flex items-center gap-3 justify-between">
        <form method="get" className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            name="search"
            defaultValue={sp.search ?? ""}
            placeholder="Search by title or code…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All statuses</option>
            {(Object.keys(CAPA_STATUS_LABEL) as CapaStatus[]).map((s) => (
              <option key={s} value={s}>{CAPA_STATUS_LABEL[s]}</option>
            ))}
          </select>
          <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
            Filter
          </button>
        </form>
        <Link
          href="/capa/new"
          className="bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + New CAPA
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Code</th>
              <th className="text-left px-5 py-3 font-medium">Title</th>
              <th className="text-left px-5 py-3 font-medium">Severity</th>
              <th className="text-left px-5 py-3 font-medium">Brand / Dept</th>
              <th className="text-left px-5 py-3 font-medium">Assignee</th>
              <th className="text-left px-5 py-3 font-medium">Due</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                  No corrective actions yet.
                </td>
              </tr>
            )}
            {items.map((c) => {
              const overdue =
                c.due_date && c.due_date < today &&
                !["verified", "closed", "rejected"].includes(c.status);
              return (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{c.code}</td>
                  <td className="px-5 py-3">
                    <Link href={`/capa/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {c.title}
                    </Link>
                    {c.source_audit_id && (
                      <div className="text-[11px] text-gray-400">From audit #{c.source_audit_id}</div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${SEVERITY_TONE[c.severity]}`}>
                      {SEVERITY_LABEL[c.severity]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs">
                    {c.brand_name ?? "—"}
                    {c.department_name && <div className="text-gray-400">{c.department_name}</div>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{c.assigned_to_name ?? "—"}</td>
                  <td className="px-5 py-3 text-xs">
                    {c.due_date ? (
                      <span className={overdue ? "text-red-700 font-medium" : "text-gray-500"}>
                        {new Date(c.due_date).toLocaleDateString()}
                        {overdue && <span className="block text-[10px] uppercase tracking-wider">Overdue</span>}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${CAPA_STATUS_TONE[c.status]}`}>
                      {CAPA_STATUS_LABEL[c.status]}
                    </span>
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
