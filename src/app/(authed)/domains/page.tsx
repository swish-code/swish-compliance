import Link from "next/link";
import { requireUser, canEditSops } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { listDomains } from "@/features/domains/repository";
import { getUserScope } from "@/lib/auth/access";

export default async function DomainsPage() {
  const user = await requireUser();
  const allDomains = await listDomains();
  // Access scoping: non-privileged users only see their mapped domains.
  const scope = await getUserScope(user.id, user.role);
  const domains = scope.full
    ? allDomains
    : allDomains.filter((d) => scope.domainIds.includes(d.id));

  return (
    <Workspace
      section="Compliance / Domains"
      subtitle={`Compliance domains (${domains.length})`}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <p className="text-sm text-gray-600 max-w-2xl">
          Domains group frameworks by responsibility area. Click a domain to
          see every framework that belongs to it.
        </p>
        {canEditSops(user.role) && (
          <Link
            href="/domains/new"
            className="shrink-0 inline-flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + New Domain
          </Link>
        )}
      </div>

      {domains.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center text-gray-400">
          No domains yet. Create the first one to start grouping frameworks by
          responsibility area.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {domains.map((d) => (
          <Link
            key={d.id}
            href={`/domains/${d.id}`}
            className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all p-6 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold mb-1">
                  {d.code}
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-700">
                  {d.name}
                </h3>
              </div>
              <div className="shrink-0 w-12 h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm">
                {d.framework_count}
              </div>
            </div>
            {d.description && (
              <p className="text-sm text-gray-600 line-clamp-3">
                {d.description}
              </p>
            )}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100 mt-auto">
              <span>
                {d.framework_count} framework
                {d.framework_count === 1 ? "" : "s"}
              </span>
              <span className="text-brand-700 group-hover:underline">
                View frameworks →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Workspace>
  );
}
