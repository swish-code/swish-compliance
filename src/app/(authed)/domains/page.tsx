import Link from "next/link";
import { requireUser, canEditSops, canDeleteOrArchive } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import {
  listDomains,
  listFrameworksByDomain,
  listSopsByDomain,
} from "@/features/domains/repository";
import { getUserScope } from "@/lib/auth/access";
import DomainAccordionGrid from "@/features/domains/DomainAccordionGrid";

export default async function DomainsPage() {
  const user = await requireUser();
  const [allDomains, frameworksByDomain, sopsByDomain] = await Promise.all([
    listDomains(),
    listFrameworksByDomain(),
    listSopsByDomain(),
  ]);

  // Access scoping: non-privileged users only see their mapped domains.
  const scope = await getUserScope(user.id, user.role);
  const domains = scope.full
    ? allDomains
    : allDomains.filter((d) => scope.domainIds.includes(d.id));

  // Assemble each domain's expand-in-place data once here, server-side,
  // so DomainAccordionGrid only ever renders — it never fetches.
  const domainsWithDetail = domains.map((d) => {
    const sops = sopsByDomain.get(d.id) ?? [];
    const departments = [
      ...new Map(
        sops
          .filter((s) => s.department_id != null)
          .map((s) => [s.department_id as number, { id: s.department_id as number, name: s.department_name! }])
      ).values(),
    ].sort((a, b) => a.name.localeCompare(b.name));

    return {
      ...d,
      frameworks: frameworksByDomain.get(d.id) ?? [],
      sops,
      departments,
    };
  });

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
          expand it and see every framework, SOP and department linked to it.
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

      <DomainAccordionGrid
        domains={domainsWithDetail}
        canEdit={canEditSops(user.role)}
        canDelete={canDeleteOrArchive(user.role)}
      />
    </Workspace>
  );
}
