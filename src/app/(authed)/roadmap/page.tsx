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

type TestResultEvent = {
  id: number;
  check_id: number;
  check_code: string | null;
  check_name: string;
  control_code: string | null;
  control_name: string | null;
  framework_code: string | null;
  framework_name: string | null;
  status: "passing" | "failing" | "pending_review" | "accepted_risk";
  notes: string | null;
  performed_by_name: string | null;
  created_at: string;
};

// Default window for the timeline when the user hasn't picked dates.
const DEFAULT_DAYS_BACK = 30;

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  // Default to the last 30 days when no range is picked. We render the
  // ISO strings back into the date inputs so the form remembers state.
  const today = new Date();
  const defaultFrom = new Date(today.getTime() - DEFAULT_DAYS_BACK * 86400e3);
  const fromStr = sp.from || defaultFrom.toISOString().split("T")[0];
  const toStr = sp.to || today.toISOString().split("T")[0];

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

  // Test results timeline — every check_result inside the chosen window,
  // joined back to its check / control / framework so the row can show
  // the full lineage without per-row follow-ups. Order newest first.
  // toStr + " 23:59:59" makes the upper bound inclusive of the whole day.
  const testEvents = await queryAll<TestResultEvent>(
    `SELECT
       r.id, r.check_id,
       ch.code AS check_code, ch.name AS check_name,
       ctrl.code AS control_code, ctrl.name AS control_name,
       f.code   AS framework_code, f.name AS framework_name,
       r.status, r.notes,
       u.display_name AS performed_by_name,
       r.created_at
     FROM check_results r
     JOIN checks      ch   ON ch.id   = r.check_id
     LEFT JOIN controls    ctrl ON ctrl.id = ch.control_id
     LEFT JOIN frameworks  f    ON f.id    = ctrl.framework_id
     LEFT JOIN users       u    ON u.id    = r.performed_by
     WHERE r.created_at >= $1::timestamptz
       AND r.created_at <  ($2::date + INTERVAL '1 day')
     ORDER BY r.created_at DESC
     LIMIT 200`,
    [fromStr, toStr]
  );

  // Group events by date for the timeline render — heading per day with
  // its rows clustered underneath. Sort keys descending so today is up.
  const eventsByDay = new Map<string, TestResultEvent[]>();
  for (const ev of testEvents) {
    const day = new Date(ev.created_at).toISOString().split("T")[0];
    const list = eventsByDay.get(day) ?? [];
    list.push(ev);
    eventsByDay.set(day, list);
  }
  const dayKeys = Array.from(eventsByDay.keys()).sort().reverse();

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

      {/* ─── Test results timeline ─── */}
      <div className="flex items-center justify-between mt-10 mb-3 gap-3 flex-wrap">
        <h3 className="text-xs uppercase tracking-widest text-gray-500">
          Test results timeline
        </h3>
        <form method="get" className="flex items-end gap-2">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">
              From
            </label>
            <input
              type="date"
              name="from"
              defaultValue={fromStr}
              className="px-2 py-1 text-xs border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">
              To
            </label>
            <input
              type="date"
              name="to"
              defaultValue={toStr}
              className="px-2 py-1 text-xs border border-gray-300 rounded-md"
            />
          </div>
          <button
            type="submit"
            className="bg-brand-700 hover:bg-brand-800 text-white text-xs px-3 py-1.5 rounded-md"
          >
            Apply
          </button>
          {(sp.from || sp.to) && (
            <Link
              href="/roadmap"
              className="text-xs text-gray-500 hover:text-gray-700 self-center"
            >
              Reset
            </Link>
          )}
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {testEvents.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            No test results in this range. Pick a wider date window to see
            history.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {dayKeys.map((day) => {
              const dayEvents = eventsByDay.get(day) ?? [];
              return (
                <div key={day}>
                  <div className="bg-gray-50 px-5 py-2 text-[11px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-100 flex items-center justify-between">
                    <span>
                      {new Date(day).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-gray-400">
                      {dayEvents.length} result
                      {dayEvents.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul>
                    {dayEvents.map((ev) => {
                      const tone =
                        ev.status === "passing"
                          ? {
                              dot: "bg-emerald-500",
                              chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
                              label: "PASS",
                            }
                          : ev.status === "failing"
                          ? {
                              dot: "bg-red-500",
                              chip: "bg-red-50 text-red-700 border-red-200",
                              label: "FAIL",
                            }
                          : ev.status === "pending_review"
                          ? {
                              dot: "bg-amber-500",
                              chip: "bg-amber-50 text-amber-700 border-amber-200",
                              label: "REVIEW",
                            }
                          : {
                              dot: "bg-indigo-500",
                              chip: "bg-indigo-50 text-indigo-700 border-indigo-200",
                              label: "RISK",
                            };
                      return (
                        <li
                          key={ev.id}
                          className="px-5 py-3 hover:bg-gray-50 flex items-start gap-3 group"
                        >
                          <span
                            className={`shrink-0 w-2.5 h-2.5 rounded-full mt-1.5 ${tone.dot}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${tone.chip}`}
                              >
                                {tone.label}
                              </span>
                              <Link
                                href={`/tests/${ev.check_id}`}
                                className="text-sm font-medium text-gray-900 group-hover:text-brand-700 truncate"
                              >
                                {ev.check_name}
                              </Link>
                              {ev.check_code && (
                                <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {ev.check_code}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
                              {ev.framework_code && (
                                <span className="text-emerald-700 font-mono">
                                  {ev.framework_code}
                                </span>
                              )}
                              {ev.control_code && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <span className="text-amber-700 font-mono">
                                    {ev.control_code}
                                  </span>
                                </>
                              )}
                              <span className="text-gray-300">·</span>
                              <span>{ev.performed_by_name ?? "—"}</span>
                              <span className="text-gray-300">·</span>
                              <span>
                                {new Date(ev.created_at).toLocaleTimeString(
                                  undefined,
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </span>
                            </div>
                            {ev.notes && (
                              <div className="text-xs text-gray-600 mt-1 italic truncate">
                                &ldquo;{ev.notes}&rdquo;
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
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
