import { SkeletonShell, ToolbarSkeleton, TableSkeleton } from "@/features/shell/Skeletons";

export default function Loading() {
  return (
    <SkeletonShell section="Compliance / Policies" subtitle="Approved policies and SOPs">
      <ToolbarSkeleton />
      <TableSkeleton rows={6} columns={7} />
    </SkeletonShell>
  );
}
