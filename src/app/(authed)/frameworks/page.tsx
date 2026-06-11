import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { listFrameworks } from "@/features/frameworks/repository";
import { importEcsGrcBundleAction } from "@/features/admin/seeds/actions";
import { queryOne } from "@/lib/db";

export default async function FrameworksPage() {
  const user = await requireUser();
  const frameworks = await listFrameworks();
  const active = frameworks.filter((f) => f.is_active);
  const available = frameworks.filter((f) => !f.is_active);

  // Admin-only: show the ECS GRC Framework bundle importer banner while
  // any of the 24 known framework codes are still missing.
  const isAdmin = user.role === "admin";
  const ecsCount = isAdmin
    ? await queryOne<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM frameworks WHERE code LIKE 'FW-0%'`
      )
    : null;
  const ecsBundleNeedsImport = isAdmin && (ecsCount?.n ?? 0) < 24;

  return (
    <Workspace
      section="Compliance / Frameworks"
      subtitle={`Compliance programs (${active.length} active / ${frameworks.length} available)`}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      {/* ECS GRC bundle importer — visible only to admins, only while
          the 24-framework seed is incomplete. */}
      {ecsBundleNeedsImport && (
        <div className="bg-gradient-to-r from-brand-50 to-emerald-50 border border-brand-200 rounded-2xl p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-700 text-white flex items-center justify-center text-xl shrink-0">
              📥
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-brand-900">
                Import the ECS GRC Framework bundle
              </div>
              <div className="text-xs text-brand-800 mt-0.5">
                One click loads 24 frameworks, 49 controls, and 147 tests from{" "}
                <span className="font-mono">ECS_GRC_Framework_Controls_Tests.xlsx</span>{" "}
                into the system. Safe to re-run — only new records are inserted.
              </div>
              {ecsCount && ecsCount.n > 0 && (
                <div className="text-[11px] text-brand-700 mt-1">
                  {ecsCount.n} of 24 already imported.
                </div>
              )}
            </div>
          </div>
          <form action={importEcsGrcBundleAction} className="shrink-0">
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm"
            >
              ⬆️ Import ECS bundle
            </button>
          </form>
        </div>
      )}
      {/* Active frameworks */}
      <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">
        Active frameworks
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {active.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center text-gray-400 text-sm">
            No active frameworks. Activate one below to start governing controls.
          </div>
        )}
        {active.map((f) => (
          <Card key={f.id} f={f} active />
        ))}
      </div>

      {/* Available */}
      {available.length > 0 && (
        <>
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">
            Available to activate
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {available.map((f) => (
              <Card key={f.id} f={f} />
            ))}
          </div>
        </>
      )}
    </Workspace>
  );
}

function Card({
  f,
  active,
}: {
  f: Awaited<ReturnType<typeof listFrameworks>>[number];
  active?: boolean;
}) {
  return (
    <Link
      href={`/frameworks/${f.id}`}
      className={`block bg-white rounded-2xl border shadow-sm p-6 hover:shadow-md transition-all ${
        active ? "border-emerald-300 ring-1 ring-emerald-200" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{f.code}</span>
        {active && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        )}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{f.name}</h3>
      {f.category && <div className="text-xs text-brand-700 mb-2">{f.category}</div>}
      {f.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{f.description}</p>}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
        <span>{f.control_count} controls</span>
        {f.owner_name && <span>Owner: {f.owner_name}</span>}
      </div>
    </Link>
  );
}
