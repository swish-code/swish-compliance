import { SkeletonShell, ToolbarSkeleton, TableSkeleton } from "@/features/shell/Skeletons";

export default function Loading() {
  return (
    <SkeletonShell section="Administration / Users" subtitle="Manage system users">
      <ToolbarSkeleton />
      <TableSkeleton rows={6} columns={7} />
    </SkeletonShell>
  );
}
