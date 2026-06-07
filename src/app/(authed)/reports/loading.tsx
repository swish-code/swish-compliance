import { SkeletonShell, Card, Bar, KpiGridSkeleton, TableSkeleton } from "@/features/shell/Skeletons";

export default function Loading() {
  return (
    <SkeletonShell
      section="Workspace / Reports"
      subtitle="Executive rollups across SOPs, audits, CAPAs, checks and controls"
    >
      <KpiGridSkeleton count={4} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Bar className="h-3 w-20 mb-2" />
            <Bar className="h-7 w-12" />
          </Card>
        ))}
      </div>
      <Bar className="h-3 w-44 mb-3" />
      <TableSkeleton rows={4} columns={4} />
    </SkeletonShell>
  );
}
