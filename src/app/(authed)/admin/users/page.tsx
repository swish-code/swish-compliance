import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { listUsers } from "@/features/admin/users/repository";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  business_excellence: "Business Excellence",
  compliance: "Compliance",
  auditor: "Auditor",
  branch_manager: "Branch Manager",
  viewer: "Viewer",
};

const ROLE_TONE: Record<string, string> = {
  admin: "bg-rose-50 text-rose-700 border-rose-200",
  business_excellence: "bg-indigo-50 text-indigo-700 border-indigo-200",
  compliance: "bg-emerald-50 text-emerald-700 border-emerald-200",
  auditor: "bg-amber-50 text-amber-700 border-amber-200",
  branch_manager: "bg-sky-50 text-sky-700 border-sky-200",
  viewer: "bg-gray-50 text-gray-600 border-gray-200",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const users = await listUsers(sp.search);

  return (
    <Workspace
      section="Administration / Users"
      subtitle={`Manage system users (${users.length})`}
      sessionLabel="Session"
      userLabel={me.displayName}
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4 flex items-center gap-3 justify-between">
        <form method="get" className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            name="search"
            defaultValue={sp.search ?? ""}
            placeholder="Search by email or name…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
            Filter
          </button>
        </form>
        <Link
          href="/admin/users/new"
          className="bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + New User
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Email</th>
              <th className="text-left px-5 py-3 font-medium">Name</th>
              <th className="text-left px-5 py-3 font-medium">Role</th>
              <th className="text-left px-5 py-3 font-medium">Brand</th>
              <th className="text-left px-5 py-3 font-medium">Department</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="text-left px-5 py-3 font-medium">Last Login</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {u.email}
                  </Link>
                  {u.id === me.id && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded">
                      You
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-700">{u.display_name}</td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ROLE_TONE[u.role] ?? ROLE_TONE.viewer}`}
                  >
                    {ROLE_LABEL[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">{u.brand_name ?? "—"}</td>
                <td className="px-5 py-3 text-gray-600">{u.department_name ?? "—"}</td>
                <td className="px-5 py-3">
                  {u.is_active ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-gray-500">
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Workspace>
  );
}
