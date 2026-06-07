import { SkeletonShell, CardGridSkeleton } from "@/features/shell/Skeletons";

export default function Loading() {
  return (
    <SkeletonShell section="Administration" subtitle="Admin Home">
      <CardGridSkeleton count={6} columns={2} />
    </SkeletonShell>
  );
}
