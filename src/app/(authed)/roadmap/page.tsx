import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { queryAll, queryOne } from "@/lib/db";

type FrameworkRow = {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  total_controls: number;
  healthy: number;
  at_risk: number;
  failing: number;
  unknown: number;
  open_capas: number;
  draft_sops: number;
};

export default async function RoadmapPage() {
  const user = await requireUser();

  // Per-framework readiness (projection over controls / CAPAs / SOPs)
  const frameworks = await queryAll<FrameworkRow>(
    `SELECT
       f.id, f.code, f.name, f.is_active,
       COALESCE(SUM(CASE WHEN c.is_active THEN 1 ELSE 0 END), 0)::int AS total_controls,
       COALESCE(SUM(CASE WHEN c.health_status = 'healthy' THEN 1 ELSE 0 END), 0)::int AS healthy,
       COALESCE(SUM(CASE WHEN c.health_status = 'at_risk' THEN 1 ELSE 0 END), 0)::int AS at_risk,
       COALESCE(SUM(CASE WHEN c.health_status = 'failing' THEN 1 ELSE 0 END), 0)::int AS failing,
       COALESCE(SUM(CASE WHEN c.health_status = 'unknown' THEN 1 ELSE 0 END), 0)::int AS unknown,
       (SELECT COUNT(*)::int FROM corrective_actions ca
        JOIN control_links cl ON cl.entity_type = 'capa' AND cl.entity_id = ca.id
        JOIN controls cc ON cc.id = cl.control_id
        WHERE cc.framework_id = f.id AND ca.status IN ('open','in_progress','submitted')) AS open_capas,
       (SELECT COUNT(*)::int FROM sops s
        JOIN control_links cl ON cl.entity_type = 'sop' AND cl.entity_id = s.id
        JOIN controls cc ON cc.id = cl.control_id
        WHERE cc.framework_id = f.id AND s.status IN ('draft','pending_review')) AS draft_sops
     FROM frameworks f
     LEFT JOIN controls c ON c.framework_id = f.id
     GROUP BY f.id
     ORDER BY f.is_active DESC, f.name`
  );

  // Cross-program blockers
  const blockers = await queryOne<{
    overdue_capas: number;
    overdue_checks: number;
    critical_capas: number;
    pending_sops: number;
    failing_checks: number;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM corrective_actions
         WHERE due_date < CURRENT_DATE AND status IN ('open','in_progress','submitted'))    AS overdue_capas,
       (SELECT COUNT(*)::int FROM checks
         WHERE next_due_date < CURRENT_DATE AND is_active)                                  AS overdue_checks,
       (SELECT COUNT(*)::int FROM corrective_actions
         WHERE severity = 'critical' AND status IN ('open','in_progress','submitted'))      AS critical_capas,
       (SELECT COUNT(*)::int FROM sops WHERE status = 'pending_review')                     AS pending_sops,
       (SELECT COUNT(*)::int FROM checks WHERE last_status = 'failing')                     AS failing_checks`
  );

  return (
    <Workspace
      section="Workspace / Roadmap"
      subtitle="Program readiness and active blockers across all frameworks"
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      {/* Blockers strip */}
      <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Top blockers right now</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <Block href="/capa?status=open" label="Critical CAPAs open" value={blockers?.critical_capas ?? 0} tone="red" />
        <Block href="/capa" label="Overdue CAPAs" value={blockers?.overdue_capas ?? 0} tone="red" />
        <Block href="/tests?status=failing" label="Failing checks" value={blockers?.failing_checks ?? 0} tone="red" />
        <Block href="/tests" label="Overdue checks" value={blockers?.overdue_checks ?? 0} tone="amber" />
        <Block href="/sops?status=pending_review" label="SOPs awaiting approval" value={blockers?.pending_sops ?? 0} tone="amber" />
      </div>

      {/* Per-framework readiness */}
      <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Framework readiness</h3>
      <div className="space-y-3">
        {frameworks.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center text-gray-400 text-sm">
            No frameworks defined. Add one from <Link href="/frameworks" className="text-brand-700 hover:underline">Frameworks</Link>.
          </div>
        )}
        {frameworks.map((f) => {
          const total = f.healthy + f.at_risk + f.failing + f.unknown;
          const measured = f.healthy + f.at_risk + f.failing;
          const readinessPct = measured > 0 ? Math.round((f.healthy / measured) * 100) : 0;
          return (
            <Link
              key={f.id}
              href={`/frameworks/${f.id}`}
              className={`block bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-all ${
                f.is_active ? "border-gray-200" : "border-gray-200 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between mb-3 gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{f.code}</span>
                  <h4 className="text-base font-semibold text-gray-900">{f.name}</h4>
                  {!f.is_active && <span className="text-xs text-gray-400">(inactive)</span>}
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    readinessPct >= 80 ? "text-emerald-600" :
                    readinessPct >= 50 ? "text-amber-600" :
                    "text-red-600"
                  }`}>{readinessPct}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">Healthy controls</div>
                </div>
              </div>

              {/* Stacked progress bar */}
              {total > 0 ? (
                <>
                  <div className="flex h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                    {f.healthy > 0 && <div className="bg-emerald-500" style={{ width: `${(f.healthy / total) * 100}%` }} />}
                    {f.at_risk > 0 && <div className="bg-amber-500" style={{ width: `${(f.at_risk / total) * 100}%` }} />}
                    {f.failing > 0 && <div className="bg-red-500" style={{ width: `${(f.failing / total) * 100}%` }} />}
                    {f.unknown > 0 && <div className="bg-gray-300" style={{ width: `${(f.unknown / total) * 100}%` }} />}
                  </div>
                  <div className="flex gap-3 text-xs text-gray-600 flex-wrap">
                    <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />{f.healthy} healthy</span>
                    <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />{f.at_risk} at risk</span>
                    <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />{f.failing} failing</span>
                    <span><span className="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1" />{f.unknown} not measured</span>
                    {f.open_capas > 0 && <span className="text-red-700 font-medium">· {f.open_capas} open CAPAs</span>}
                    {f.draft_sops > 0 && <span className="text-amber-700">· {f.draft_sops} draft SOPs</span>}
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-400">No controls under this framework yet.</div>
              )}
            </Link>
          );
        })}
      </div>
    </Workspace>
  );
}

function Block({
  href, label, value, tone,
}: {
  href: string; label: string; value: number; tone: "red" | "amber" | "brand";
}) {
  const tones = {
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    brand: "border-brand-200 bg-brand-50 text-brand-700",
  };
  return (
    <Link href={href} className={`block rounded-xl border p-4 hover:shadow-md transition-shadow ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </Link>
  );
}
