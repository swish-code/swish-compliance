import { SkeletonShell, ToolbarSkeleton, TableSkeleton } from "@/features/shell/Skeletons";

export default function Loading() {
  return (
    <SkeletonShell section="Compliance Library / Controls" subtitle="Reusable compliance controls">
      <ToolbarSkeleton />
      <TableSkeleton rows={6} columns={6} />
    </SkeletonShell>
  );
}
