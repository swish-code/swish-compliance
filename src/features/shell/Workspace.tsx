import type { ReactNode } from "react";

export default function Workspace({
  section,
  subtitle,
  sessionLabel,
  userLabel,
  children,
}: {
  section: string;
  subtitle: string;
  sessionLabel: string;
  userLabel: string;
  children: ReactNode;
}) {
  return (
    <main className="ml-64 min-h-screen">
      <header className="flex justify-between items-start px-12 pt-8 pb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">
            {section}
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{subtitle}</h1>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">
            {sessionLabel}
          </div>
          <div className="text-sm font-semibold text-gray-900">{userLabel}</div>
        </div>
      </header>
      <div className="px-12 pb-12">{children}</div>
    </main>
  );
}
