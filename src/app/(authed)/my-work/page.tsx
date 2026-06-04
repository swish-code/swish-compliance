import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { queryOne, queryAll } from "@/lib/db";

type Row = {
  pending_sops: number;
  my_capas: number;
  overdue_capas: number;
  audits_in_progress: number;
  failed_critical_today: number;
};

type CapaItem = {
  id: number;
  code: string;
  title: string;
  status: string;
  due_date: string | null;
  severity: string;
};

export default async function MyWorkPage() {
  const user = await requireUser();

  const stats = await queryOne<Row>(
    `SELECT
       (SELECT COUNT(*)::int FROM sops WHERE status = 'pending_review')                        AS pending_sops,
       (SELECT COUNT(*)::int FROM corrective_actions
        WHERE assigned_to = $1 AND status IN ('open','in_progress'))                            AS my_capas,
       (SELECT COUNT(*)::int FROM corrective_actions
        WHERE assigned_to = $1 AND due_date < CURRENT_DATE
          AND status IN ('open','in_progress','submitted'))                                     AS overdue_capas,
       (SELECT COUNT(*)::int FROM audits WHERE auditor_id = $1 AND status = 'in_progress')      AS audits_in_progress,
       (SELECT COUNT(*)::int FROM audits
        WHERE submitted_at::date = CURRENT_DATE AND critical_failed > 0)                        AS failed_critical_today`,
    [user.id]
  );

  const myCapas = await queryAll<CapaItem>(
    `SELECT id, code, title, status, due_date, severity
     FROM corrective_actions
     WHERE assigned_to = $1 AND status IN ('open','in_progress','submitted')
     ORDER BY due_date NULLS LAST, id DESC LIMIT 8`,
    [user.id]
  );

  return (
    <Workspace
      section="Workspace"
      subtitle="Personal work queue for approvals, reviews, rollout work, and remediation"
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="SOPs awaiting review" value={stats?.pending_sops ?? 0} href="/sops?status=pending_review" tone="amber" />
        <StatCard label="My open CAPAs" value={stats?.my_capas ?? 0} href="/capa" tone="indigo" />
        <StatCard label="Overdue CAPAs" value={stats?.overdue_capas ?? 0} href="/capa" tone="red" emphasize />
        <StatCard label="Audits in progress" value={stats?.audits_in_progress ?? 0} href="/audits?status=in_progress" tone="brand" />
        <StatCard label="Critical fails today" value={stats?.failed_critical_today ?? 0} href="/audits" tone="red" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">My corrective actions</h2>
          <Link href="/capa" className="text-sm text-brand-700 hover:underline">View all →</Link>
        </div>
        {myCapas.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-sm">
            🎉 No CAPAs assigned to you. Good job!
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {myCapas.map((c) => {
              const today = new Date().toISOString().split("T")[0];
              const overdue = c.due_date && c.due_date < today;
              return (
                <li key={c.id} className="py-3 flex items-center gap-4">
                  <span className="font-mono text-xs text-gray-400 w-24">{c.code}</span>
                  <Link href={`/capa/${c.id}`} className="flex-1 text-sm text-gray-900 hover:text-brand-700 hover:underline">
                    {c.title}
                  </Link>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.severity === "critical" ? "bg-red-100 text-red-700" :
                    c.severity === "high" ? "bg-orange-100 text-orange-700" :
                    c.severity === "medium" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {c.severity}
                  </span>
                  {c.due_date && (
                    <span className={`text-xs ${overdue ? "text-red-700 font-medium" : "text-gray-500"}`}>
                      {overdue ? "Overdue · " : "Due "}{new Date(c.due_date).toLocaleDateString()}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Workspace>
  );
}

function StatCard({
  label,
  value,
  href,
  tone,
  emphasize,
}: {
  label: string;
  value: number;
  href: string;
  tone: "amber" | "indigo" | "red" | "brand";
  emphasize?: boolean;
}) {
  const tones: Record<typeof tone, string> = {
    amber: "border-amber-200 text-amber-700 bg-amber-50",
    indigo: "border-indigo-200 text-indigo-700 bg-indigo-50",
    red: "border-red-200 text-red-700 bg-red-50",
    brand: "border-brand-200 text-brand-700 bg-brand-50",
  };
  return (
    <Link
      href={href}
      className={`block rounded-2xl border p-4 hover:shadow-md transition-shadow ${tones[tone]} ${
        emphasize && value > 0 ? "ring-2 ring-red-300 ring-offset-2" : ""
      }`}
    >
      <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1.5">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </Link>
  );
}
