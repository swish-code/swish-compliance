import type { ReactNode } from "react";
import NotificationBell from "@/features/notifications/NotificationBell";

/**
 * Page shell used by every (authed) page. On desktop the sidebar sits in
 * its fixed left rail, so the main column is offset by `md:ml-64`. On
 * mobile the sidebar is a slide-in drawer instead, so we remove the left
 * margin and add top padding to clear the mobile top bar from Sidebar.tsx.
 */
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
    <main className="app-main md:ml-64 min-h-screen pt-14 md:pt-0">
      <header className="flex justify-between items-start px-4 sm:px-8 md:px-12 pt-5 md:pt-8 pb-4 md:pb-6 gap-4 md:gap-6">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 mb-1.5 md:mb-2 truncate">
            {section}
          </div>
          <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
            {subtitle}
          </h1>
        </div>
        <div className="flex items-start gap-3 md:gap-4 shrink-0">
          <NotificationBell />
          {/* User card — hide the label-stack on phones to save room; the
              sidebar drawer already shows who's signed in. */}
          <div className="text-right hidden sm:block">
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">
              {sessionLabel}
            </div>
            <div className="text-sm font-semibold text-gray-900">{userLabel}</div>
          </div>
        </div>
      </header>
      <div className="px-4 sm:px-8 md:px-12 pb-8 md:pb-12">{children}</div>
    </main>
  );
}
