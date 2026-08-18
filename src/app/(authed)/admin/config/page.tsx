import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import UsersTabContent from "@/features/admin/users/UsersTabContent";
import BrandsTabContent from "@/features/admin/reference/BrandsTabContent";
import DepartmentsTabContent from "@/features/admin/reference/DepartmentsTabContent";
import OrgUnitsTabContent from "@/features/org-units/OrgUnitsTabContent";
import ConfigTabContent from "@/features/config/ConfigTabContent";

const TABS = [
  { key: "users", label: "Users" },
  { key: "brands", label: "Brands" },
  { key: "departments", label: "Departments" },
  { key: "org-units", label: "Org Units" },
  { key: "config", label: "Config" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function isTabKey(v: string | undefined): v is TabKey {
  return TABS.some((t) => t.key === v);
}

/**
 * Administration, consolidated into one page (user spec 2026-08-17):
 * Users, Brands, Departments, Org Units and Config used to be five
 * separate routes with their own sidebar entries. Same content, same
 * server actions — just switched between via a tab bar and a `?tab=`
 * query param instead of five page loads, so managing them all stays on
 * one screen. /admin/users/new and /admin/users/[id] are unaffected;
 * only the list/management views moved here.
 */
export default async function AdminConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string }>;
}) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const tab: TabKey = isTabKey(sp.tab) ? sp.tab : "users";

  return (
    <Workspace
      section="Administration"
      subtitle="Users, Brands, Departments, Org Units & Config"
      sessionLabel="Session"
      userLabel={me.displayName}
    >
      <div className="border-b border-gray-200 mb-5">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Administration sections">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Link
                key={t.key}
                href={`/admin/config?tab=${t.key}`}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? "border-brand-700 text-brand-700"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {tab === "users" && <UsersTabContent meId={me.id} search={sp.search} />}
      {tab === "brands" && <BrandsTabContent />}
      {tab === "departments" && <DepartmentsTabContent />}
      {tab === "org-units" && <OrgUnitsTabContent />}
      {tab === "config" && <ConfigTabContent />}
    </Workspace>
  );
}
