"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Section = {
  label: string;
  items: { href: string; label: string; dot?: boolean }[];
};

const WORKSPACE: Section = {
  label: "Workspace",
  items: [
    { href: "/my-work", label: "My Work", dot: true },
    { href: "/roadmap", label: "Roadmap" },
    { href: "/tests", label: "Tests" },
    { href: "/reports", label: "Reports" },
  ],
};

const COMPLIANCE: Section = {
  label: "Compliance",
  items: [
    { href: "/sops", label: "SOPs" },
    { href: "/checklists/templates", label: "Checklists" },
    { href: "/audits", label: "Audits" },
    { href: "/capa", label: "Corrective Actions" },
    { href: "/frameworks", label: "Frameworks" },
    { href: "/controls", label: "Controls" },
    { href: "/policies", label: "Policies" },
  ],
};

const ADMINISTRATION: Section = {
  label: "Administration",
  items: [
    { href: "/admin", label: "Admin Home" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/brands", label: "Brands" },
    { href: "/admin/departments", label: "Departments" },
    { href: "/admin/config", label: "Config" },
    { href: "/admin/audit-logs", label: "Audit Logs" },
  ],
};

export default function Sidebar({
  displayName,
  role,
}: {
  displayName: string;
  role: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Only admins see the Administration section
  const sections: Section[] = [WORKSPACE, COMPLIANCE];
  if (role === "admin") sections.push(ADMINISTRATION);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-brand-800 text-gray-100 flex flex-col">
      {/* Brand header */}
      <div className="px-5 pt-6 pb-8">
        <div className="bg-white rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-700 flex items-center justify-center font-black text-white text-base">
            S
          </div>
          <div className="text-brand-900">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-brand-600">
              Swish
            </div>
            <div className="text-sm font-bold leading-tight">
              Compliance<br />App
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <nav className="flex-1 overflow-y-auto px-3">
        {sections.map((section) => (
          <div key={section.label} className="mb-4">
            <div className="px-3 text-[10px] uppercase tracking-widest text-brand-100/60 mb-1.5">
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-brand-500 text-white font-medium"
                          : "text-gray-200 hover:bg-brand-700/60"
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.dot && !active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-100" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-brand-700/50">
        <div className="px-3 pb-1 text-xs text-brand-100/70 truncate">{displayName}</div>
        <div className="px-3 pb-3 text-[10px] uppercase tracking-widest text-brand-100/50">
          {role.replace("_", " ")}
        </div>
        <button
          onClick={signOut}
          className="w-full bg-brand-700/60 hover:bg-brand-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
