import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import {
  getDomain,
  listFrameworksForDomain,
} from "@/features/domains/repository";

export default async function DomainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id: idStr } = await params;
  const id = Number(idStr);
  const domain = await getDomain(id);
  if (!domain) notFound();
  const frameworks = await listFrameworksForDomain(id);

  return (
    <Workspace
      section="Compliance / Domains"
      subtitle={domain.name}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      {/* Domain header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold mb-1">
              Domain · {domain.code}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {domain.name}
            </h2>
            {domain.description && (
              <p className="text-sm text-gray-600 max-w-3xl">
                {domain.description}
              </p>
            )}
          </div>
          <Link
            href="/domains"
            className="shrink-0 text-sm text-gray-500 hover:text-gray-700"
          >
            ← All domains
          </Link>
        </div>
      </div>

      {/* Frameworks table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            Frameworks ({frameworks.length})
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-medium w-40">Code</th>
              <th className="text-left px-5 py-3 font-medium">Name</th>
              <th className="text-left px-5 py-3 font-medium w-40">Category</th>
              <th className="text-left px-5 py-3 font-medium w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {frameworks.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-12 text-center text-gray-400"
                >
                  No frameworks linked to this domain yet.
                </td>
              </tr>
            )}
            {frameworks.map((fw) => (
              <tr
                key={fw.id}
                className={`border-t border-gray-100 hover:bg-gray-50 ${
                  fw.is_active ? "" : "opacity-60"
                }`}
              >
                <td className="px-5 py-3 font-mono text-xs text-gray-700">
                  {fw.code}
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/frameworks/${fw.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {fw.name}
                  </Link>
                  {fw.description && (
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {fw.description}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-gray-600">
                  {fw.category ?? "—"}
                </td>
                <td className="px-5 py-3">
                  {fw.is_active ? (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Workspace>
  );
}
