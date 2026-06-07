import { SkeletonShell, Card, Bar, KpiGridSkeleton } from "@/features/shell/Skeletons";

export default function Loading() {
  return (
    <SkeletonShell
      section="Workspace / Roadmap"
      subtitle="Program readiness and active blockers across all frameworks"
    >
      <Bar className="h-3 w-44 mb-3" />
      <KpiGridSkeleton count={5} />
      <Bar className="h-3 w-48 mb-3 mt-4" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Bar className="h-5 w-20" />
                <Bar className="h-5 w-48" />
              </div>
              <Bar className="h-8 w-16" />
            </div>
            <Bar className="h-2 w-full mb-2" />
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((__, j) => (
                <Bar key={j} className="h-3 w-20" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </SkeletonShell>
  );
}
