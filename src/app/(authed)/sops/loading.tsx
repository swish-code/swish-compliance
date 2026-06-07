import { SkeletonShell, ToolbarSkeleton, TableSkeleton } from "@/features/shell/Skeletons";

export default function Loading() {
  return (
    <SkeletonShell
      section="Compliance"
      subtitle="Standard Operating Procedures (SOPs) register"
    >
      <ToolbarSkeleton />
      <TableSkeleton rows={6} columns={7} />
    </SkeletonShell>
  );
}
