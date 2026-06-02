import { requireUser } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { queryOne } from "@/lib/db";

export default async function MyWorkPage() {
  const user = await requireUser();

  const stats = await queryOne<{
    pending_review: number;
    my_sops: number;
    approved: number;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'pending_review')::int AS pending_review,
       COUNT(*) FILTER (WHERE owner_id = $1 OR created_by = $1)::int AS my_sops,
       COUNT(*) FILTER (WHERE status = 'approved')::int AS approved
     FROM sops`,
    [user.id]
  );

  return (
    <Workspace
      section="Workspace"
      subtitle="Personal work queue for approvals, reviews, rollout work, and remediation"
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="SOPs awaiting review" value={stats?.pending_review ?? 0} tone="amber" />
        <StatCard label="My SOPs" value={stats?.my_sops ?? 0} tone="brand" />
        <StatCard label="Approved SOPs" value={stats?.approved ?? 0} tone="emerald" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center text-gray-500">
        <p className="text-sm">
          Your personal task queue will appear here once SOPs, audits, and CAPAs
          start flowing through the system.
        </p>
      </div>
    </Workspace>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "brand" | "emerald";
}) {
  const tones: Record<typeof tone, string> = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    brand: "bg-brand-50 text-brand-700 border-brand-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <div className={`rounded-2xl border ${tones[tone]} p-5`}>
      <div className="text-xs uppercase tracking-widest opacity-70 mb-2">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
