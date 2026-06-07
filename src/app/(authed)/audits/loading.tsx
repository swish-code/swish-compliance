import { SkeletonShell, ToolbarSkeleton, TableSkeleton } from "@/features/shell/Skeletons";

export default function Loading() {
  return (
    <SkeletonShell section="Compliance / Audits" subtitle="Audit executions">
      <ToolbarSkeleton />
      <TableSkeleton rows={6} columns={8} />
    </SkeletonShell>
  );
}
