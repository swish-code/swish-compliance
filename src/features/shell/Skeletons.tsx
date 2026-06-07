/**
 * Skeleton primitives used by loading.tsx files.
 * Pure CSS — no client JS, no data. Renders instantly while the real
 * server component is still being prepared, so the user always sees
 * something happening instead of waiting on a blank screen.
 */

import type { ReactNode } from "react";

export function SkeletonShell({
  section,
  subtitle,
  children,
}: {
  section: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="md:ml-64 min-h-screen pt-14 md:pt-0">
      <header className="flex justify-between items-start px-4 sm:px-8 md:px-12 pt-5 md:pt-8 pb-4 md:pb-6 gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 mb-1.5 md:mb-2 truncate">
            {section}
          </div>
          <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">{subtitle}</h1>
        </div>
        <div className="text-right hidden sm:block shrink-0">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">
            Session
          </div>
          <div className="h-4 w-32 bg-gray-200 rounded skeleton-pulse" />
        </div>
      </header>
      <div className="px-4 sm:px-8 md:px-12 pb-8 md:pb-12">{children}</div>
    </main>
  );
}

export function Bar({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-200 rounded skeleton-pulse ${className}`} />;
}

export function Card({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex gap-6">
        {Array.from({ length: columns }).map((_, i) => (
          <Bar key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="border-t border-gray-100 px-5 py-3.5 flex gap-6 items-center">
            {Array.from({ length: columns }).map((__, c) => (
              <Bar
                key={c}
                className={`h-3 ${c === 0 ? "w-20" : c === 1 ? "flex-[2]" : "flex-1"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ToolbarSkeleton() {
  return (
    <Card className="p-4 mb-4 flex items-center gap-3 justify-between">
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <Bar className="h-10 flex-1" />
        <Bar className="h-10 w-32" />
      </div>
      <Bar className="h-10 w-28" />
    </Card>
  );
}

export function KpiGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <Bar className="h-3 w-24 mb-3" />
          <Bar className="h-8 w-16" />
        </Card>
      ))}
    </div>
  );
}

export function CardGridSkeleton({
  count = 6,
  columns = 3,
}: {
  count?: number;
  columns?: 2 | 3 | 4;
}) {
  const colClass =
    columns === 2 ? "md:grid-cols-2" :
    columns === 3 ? "md:grid-cols-3" :
    "md:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={`grid grid-cols-1 ${colClass} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-6">
          <Bar className="h-3 w-16 mb-3" />
          <Bar className="h-5 w-3/4 mb-2" />
          <Bar className="h-3 w-1/2 mb-4" />
          <Bar className="h-2 w-full mb-1" />
          <Bar className="h-2 w-4/5" />
        </Card>
      ))}
    </div>
  );
}
