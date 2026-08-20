import { SkeletonShell, Card, Bar } from "@/features/shell/Skeletons";

export default function Loading() {
  return (
    <SkeletonShell section="Workspace / Notifications" subtitle="Notifications">
      <Card className="p-4 mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Bar className="h-7 w-16 rounded-full" />
          <Bar className="h-7 w-20 rounded-full" />
        </div>
        <Bar className="h-4 w-24" />
      </Card>
      <Card className="overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-t border-gray-100 first:border-t-0 px-5 py-4 flex gap-4">
            <Bar className="w-2.5 h-2.5 rounded-full mt-2" />
            <div className="flex-1 space-y-2">
              <Bar className="h-3 w-3/4" />
              <Bar className="h-2 w-1/2" />
            </div>
          </div>
        ))}
      </Card>
    </SkeletonShell>
  );
}
