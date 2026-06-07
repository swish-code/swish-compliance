import { SkeletonShell, KpiGridSkeleton, Card, Bar } from "@/features/shell/Skeletons";

export default function Loading() {
  return (
    <SkeletonShell
      section="Workspace"
      subtitle="Personal work queue for approvals, reviews, rollout work, and remediation"
    >
      <KpiGridSkeleton count={5} />
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Bar className="h-4 w-48" />
          <Bar className="h-4 w-20" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Bar className="h-3 w-24" />
              <Bar className="h-3 flex-1" />
              <Bar className="h-5 w-16 rounded-full" />
              <Bar className="h-3 w-24" />
            </div>
          ))}
        </div>
      </Card>
    </SkeletonShell>
  );
}
