import { SkeletonShell, Bar, Card } from "@/features/shell/Skeletons";

/**
 * Generic loading fallback used by any route that doesn't have its own
 * loading.tsx. Renders a faint structural skeleton so the screen never
 * appears blank during navigation.
 */
export default function Loading() {
  return (
    <SkeletonShell section="Loading" subtitle="Please wait…">
      <Card className="p-6 mb-4">
        <Bar className="h-4 w-1/3 mb-3" />
        <Bar className="h-3 w-full mb-2" />
        <Bar className="h-3 w-4/5 mb-2" />
        <Bar className="h-3 w-3/5" />
      </Card>
      <Card className="p-6">
        <Bar className="h-3 w-1/4 mb-4" />
        <div className="space-y-2">
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-11/12" />
          <Bar className="h-3 w-10/12" />
          <Bar className="h-3 w-9/12" />
        </div>
      </Card>
    </SkeletonShell>
  );
}
