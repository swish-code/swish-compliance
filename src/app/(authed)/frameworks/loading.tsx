import { SkeletonShell, CardGridSkeleton, Bar } from "@/features/shell/Skeletons";

export default function Loading() {
  return (
    <SkeletonShell section="Compliance / Frameworks" subtitle="Compliance programs">
      <Bar className="h-3 w-44 mb-3" />
      <div className="mb-8">
        <CardGridSkeleton count={2} columns={2} />
      </div>
      <Bar className="h-3 w-44 mb-3" />
      <CardGridSkeleton count={4} columns={2} />
    </SkeletonShell>
  );
}
