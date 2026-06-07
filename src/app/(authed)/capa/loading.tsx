import { SkeletonShell, ToolbarSkeleton, TableSkeleton } from "@/features/shell/Skeletons";

export default function Loading() {
  return (
    <SkeletonShell section="Compliance / Corrective Actions" subtitle="CAPA register">
      <ToolbarSkeleton />
      <TableSkeleton rows={6} columns={7} />
    </SkeletonShell>
  );
}
