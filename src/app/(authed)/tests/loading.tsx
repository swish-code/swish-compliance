import { SkeletonShell, Bar, Card, TableSkeleton } from "@/features/shell/Skeletons";

export default function Loading() {
  return (
    <SkeletonShell section="Workspace / Tests" subtitle="Compliance tests">
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bar key={i} className="h-7 w-28 rounded-full" />
        ))}
      </div>
      <TableSkeleton rows={6} columns={6} />
      <div className="mt-4">
        <Card className="p-6">
          <Bar className="h-4 w-48 mb-4" />
          <Bar className="h-10 w-full mb-3" />
          <Bar className="h-10 w-full" />
        </Card>
      </div>
    </SkeletonShell>
  );
}
