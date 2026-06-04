import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { queryAll, queryOne } from "@/lib/db";

export default async function ReportsPage() {
  const user = await requireUser();

  const overview = await queryOne<{
    total_sops: number;
    approved_sops: number;
    total_audits: number;
    avg_score: string | null;
    total_capas: number;
    open_capas: number;
    closed_capas: number;
    overdue_capas: number;
    total_checks: number;
    failing_checks: number;
    total_controls: number;
    healthy_controls: number;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM sops)                                            AS total_sops,
       (SELECT COUNT(*)::int FROM sops WHERE status = 'approved')                  AS approved_sops,
       (SELECT COUNT(*)::int FROM audits WHERE status IN ('submitted','closed'))   AS total_audits,
       (SELECT ROUND(AVG(score)::numeric, 1)::text FROM audits WHERE score IS NOT NULL) AS avg_score,
       (SELECT COUNT(*)::int FROM corrective_actions)                              AS total_capas,
       (SELECT COUNT(*)::int FROM corrective_actions
         WHERE status IN ('open','in_progress','submitted'))                       AS open_capas,
       (SELECT COUNT(*)::int FROM corrective_actions WHERE status = 'closed')      AS closed_capas,
       (SELECT COUNT(*)::int FROM corrective_actions
         WHERE due_date < CURRENT_DATE
           AND status IN ('open','in_progress','submitted'))                       AS overdue_capas,
       (SELECT COUNT(*)::int FROM checks WHERE is_active)                          AS total_checks,
       (SELECT COUNT(*)::int FROM checks WHERE last_status = 'failing')            AS failing_checks,
       (SELECT COUNT(*)::int FROM controls WHERE is_active)                        AS total_controls,
       (SELECT COUNT(*)::int FROM controls WHERE health_status = 'healthy')        AS healthy_controls`
  );

  // Audit score by brand (averaged over submitted+closed)
  const byBrand = await queryAll<{
    brand_name: string | null;
    audits: number;
    avg_score: string | null;
    critical: number;
  }>(
    `SELECT
       b.name AS brand_name,
       COUNT(a.*)::int                                            AS audits,
       ROUND(AVG(a.score)::numeric, 1)::text                      AS avg_score,
       COALESCE(SUM(a.critical_failed),0)::int                    AS critical
     FROM audits a
     LEFT JOIN brands b ON b.id = a.brand_id
     WHERE a.status IN ('submitted','closed') AND a.score IS NOT NULL
     GROUP BY b.name
     ORDER BY avg_score ASC NULLS LAST`
  );

  // CAPA by status
  const capaByStatus = await queryAll<{ status: string; n: number }>(
    `SELECT status, COUNT(*)::int AS n FROM corrective_actions GROUP BY status ORDER BY n DESC`
  );

  // Top failing controls (most open CAPAs linked)
  const topFailingControls = await queryAll<{
    id: number;
    name: string;
    code: string | null;
    open_capas: number;
    health_status: string;
  }>(
    `SELECT c.id, c.name, c.code, c.health_status,
       (SELECT COUNT(*)::int FROM corrective_actions ca
        JOIN control_links cl ON cl.entity_type = 'capa' AND cl.entity_id = ca.id
        WHERE cl.control_id = c.id AND ca.status IN ('open','in_progress','submitted')) AS open_capas
     FROM controls c
     WHERE c.is_active AND c.health_status IN ('failing','at_risk')
     ORDER BY c.health_status = 'failing' DESC, open_capas DESC
     LIMIT 10`
  );

  const closureRate = overview && overview.total_capas > 0
    ? Math.round((overview.closed_capas / overview.total_capas) * 100)
    : 0;
  const controlHealthRate = overview && overview.total_controls > 0
    ? Math.round((overview.healthy_controls / overview.total_controls) * 100)
    : 0;

  return (
    <Workspace
      section="Workspace / Reports"
      subtitle="Executive rollups across SOPs, audits, CAPAs, checks and controls"
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      {/* Top-level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="Approved SOPs" value={`${overview?.approved_sops ?? 0} / ${overview?.total_sops ?? 0}`} />
        <Kpi label="Audits performed" value={overview?.total_audits ?? 0} sub={overview?.avg_score ? `avg score ${overview.avg_score}%` : undefined} />
        <Kpi label="Healthy controls" value={`${controlHealthRate}%`} sub={`${overview?.healthy_controls ?? 0} of ${overview?.total_controls ?? 0}`} tone={controlHealthRate >= 70 ? "good" : controlHealthRate >= 40 ? "warn" : "bad"} />
        <Kpi label="CAPA closure rate" value={`${closureRate}%`} sub={`${overview?.closed_capas ?? 0} closed of ${overview?.total_capas ?? 0}`} tone={closureRate >= 70 ? "good" : closureRate >= 40 ? "warn" : "bad"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <Kpi label="Open CAPAs" value={overview?.open_capas ?? 0} tone="warn" />
        <Kpi label="Overdue CAPAs" value={overview?.overdue_capas ?? 0} tone={overview?.overdue_capas && overview.overdue_capas > 0 ? "bad" : "neutral"} />
        <Kpi label="Failing checks" value={overview?.failing_checks ?? 0} tone={overview?.failing_checks && overview.failing_checks > 0 ? "bad" : "good"} />
      </div>

      {/* By brand */}
      <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Audit performance by brand</h3>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Brand</th>
              <th className="text-left px-5 py-3 font-medium">Audits</th>
              <th className="text-left px-5 py-3 font-medium">Avg score</th>
              <th className="text-left px-5 py-3 font-medium">Critical fails</th>
            </tr>
          </thead>
          <tbody>
            {byBrand.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No completed audits yet.</td></tr>
            )}
            {byBrand.map((r, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-5 py-3 font-medium">{r.brand_name ?? "Unassigned"}</td>
                <td className="px-5 py-3 text-gray-600">{r.audits}</td>
                <td className="px-5 py-3">
                  <span className={`font-semibold ${
                    r.avg_score && Number(r.avg_score) >= 90 ? "text-emerald-700" :
                    r.avg_score && Number(r.avg_score) >= 70 ? "text-amber-700" :
                    r.avg_score ? "text-red-700" : "text-gray-400"
                  }`}>
                    {r.avg_score ? `${r.avg_score}%` : "—"}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">{r.critical}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CAPA breakdown + Failing controls — 2 column */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Corrective actions by status</h3>
          {capaByStatus.length === 0 ? (
            <div className="text-sm text-gray-400">No CAPAs yet.</div>
          ) : (
            <ul className="space-y-2">
              {capaByStatus.map((r) => (
                <li key={r.status} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-gray-700">{r.status.replace("_", " ")}</span>
                  <span className="font-semibold">{r.n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Controls needing attention</h3>
          {topFailingControls.length === 0 ? (
            <div className="text-sm text-gray-400">All controls are healthy or not yet measured.</div>
          ) : (
            <ul className="space-y-2">
              {topFailingControls.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/controls/${c.id}`} className="text-gray-800 hover:text-brand-700 hover:underline flex-1 truncate">
                    {c.name}
                  </Link>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    c.health_status === "failing" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                  }`}>{c.health_status}</span>
                  <span className="text-xs text-gray-500">{c.open_capas} CAPAs</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Workspace>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  const tones = {
    good: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warn: "border-amber-200 bg-amber-50 text-amber-700",
    bad: "border-red-200 bg-red-50 text-red-700",
    neutral: "border-gray-200 bg-white text-gray-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs opacity-60 mt-1">{sub}</div>}
    </div>
  );
}
