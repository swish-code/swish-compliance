import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, canAccessAdmin } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { getFramework } from "@/features/frameworks/repository";
import { listControls } from "@/features/controls/repository";
import {
  toggleFrameworkAction,
  setFrameworkOwnerAction,
} from "@/features/frameworks/actions";
import { queryAll } from "@/lib/db";
import { HEALTH_LABEL, HEALTH_TONE, HEALTH_DOT } from "@/features/controls/types";

export default async function FrameworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id: idStr } = await params;
  const id = Number(idStr);
  const fw = await getFramework(id);
  if (!fw) notFound();
  const controls = await listControls({ framework_id: id });
  const isAdmin = canAccessAdmin(user.role);

  const users = isAdmin
    ? await queryAll<{ id: number; display_name: string }>(
        `SELECT id, display_name FROM users WHERE is_active ORDER BY display_name`
      )
    : [];

  return (
    <Workspace
      section="Compliance / Frameworks"
      subtitle={fw.name}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      {/* Header */}
      <div className={`bg-white rounded-2xl border shadow-sm p-6 mb-4 ${
        fw.is_active ? "border-emerald-300 ring-1 ring-emerald-200" : "border-gray-200"
      }`}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{fw.code}</span>
              {fw.is_active ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                </span>
              ) : (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>
              )}
              {fw.category && <span className="text-xs text-brand-700">{fw.category}</span>}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{fw.name}</h2>
            {fw.description && <p className="text-sm text-gray-600 max-w-3xl">{fw.description}</p>}
          </div>

          {isAdmin && (
            <form action={toggleFrameworkAction}>
              <input type="hidden" name="id" value={fw.id} />
              <input type="hidden" name="activate" value={fw.is_active ? "" : "true"} />
              <button
                type="submit"
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  fw.is_active
                    ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {fw.is_active ? "Deactivate" : "Activate"}
              </button>
            </form>
          )}
        </div>

        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm pt-3 border-t border-gray-100">
          <Field label="Controls">{fw.control_count} ({fw.active_control_count} active)</Field>
          <Field label="Owner">
            {isAdmin ? (
              <form action={setFrameworkOwnerAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={fw.id} />
                <select
                  name="owner_user_id"
                  defaultValue={fw.owner_user_id ?? ""}
                  className="px-2 py-1 text-xs border border-gray-300 rounded-md"
                >
                  <option value="">—</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.display_name}</option>
                  ))}
                </select>
                <button type="submit" className="text-xs text-brand-700 hover:underline">Save</button>
              </form>
            ) : (
              fw.owner_name ?? "—"
            )}
          </Field>
          <Field label="Review frequency">{fw.review_frequency ?? "—"}</Field>
          <Field label="Activated">
            {fw.activated_at ? new Date(fw.activated_at).toLocaleDateString() : "—"}
            {fw.activated_by_name && <div className="text-xs text-gray-500">by {fw.activated_by_name}</div>}
          </Field>
        </dl>
      </div>

      {/* Reference / scope panel — shown only when populated */}
      {(fw.reference_source || fw.scope) && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4 space-y-4">
          {fw.reference_source && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold mb-1">
                Reference source / standard
              </div>
              <div className="text-sm text-gray-800">{fw.reference_source}</div>
            </div>
          )}
          {fw.scope && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold mb-1">
                Scope / main controls
              </div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{fw.scope}</div>
            </div>
          )}
        </div>
      )}

      {/* Linked controls */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            Controls under this framework ({controls.length})
          </h3>
          <Link
            href={`/controls/new?framework=${fw.id}`}
            className="text-sm text-brand-700 hover:underline"
          >
            + Add control
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Code</th>
              <th className="text-left px-5 py-3 font-medium">Name</th>
              <th className="text-left px-5 py-3 font-medium">Owner</th>
              <th className="text-left px-5 py-3 font-medium">Health</th>
              <th className="text-left px-5 py-3 font-medium">Links</th>
            </tr>
          </thead>
          <tbody>
            {controls.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                  No controls under this framework yet.
                </td>
              </tr>
            )}
            {controls.map((c) => (
              <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-xs text-gray-500">{c.code ?? "—"}</td>
                <td className="px-5 py-3">
                  <Link href={`/controls/${c.id}`} className="font-medium text-brand-700 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-gray-600">{c.owner_name ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${HEALTH_TONE[c.health_status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${HEALTH_DOT[c.health_status]}`} />
                    {HEALTH_LABEL[c.health_status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-gray-500">
                  {c.linked_sops} SOPs · {c.linked_checks} checks · {c.open_capas} open CAPAs
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link href="/frameworks" className="inline-block mt-4 text-sm text-gray-500 hover:text-gray-700">
        ← Back to all frameworks
      </Link>
    </Workspace>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-gray-900">{children}</dd>
    </div>
  );
}
