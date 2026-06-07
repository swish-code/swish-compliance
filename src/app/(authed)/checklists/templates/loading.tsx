import { SkeletonShell, ToolbarSkeleton, CardGridSkeleton } from "@/features/shell/Skeletons";

export default function Loading() {
  return (
    <SkeletonShell section="Compliance / Checklists" subtitle="Audit checklist templates">
      <ToolbarSkeleton />
      <CardGridSkeleton count={6} columns={3} />
    </SkeletonShell>
  );
}
