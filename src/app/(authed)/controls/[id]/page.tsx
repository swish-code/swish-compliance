import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, canEditSops } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import {
  getControl,
  listControlLinks,
} from "@/features/controls/repository";
import {
  linkControlAction,
  unlinkControlAction,
} from "@/features/controls/actions";
import {
  HEALTH_LABEL,
  HEALTH_TONE,
  HEALTH_DOT,
} from "@/features/controls/types";
import { queryAll } from "@/lib/db";

export default async function ControlDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id: idStr } = await params;
  const id = Number(idStr);
  const ctrl = await getControl(id);
  if (!ctrl) notFound();
  const links = await listControlLinks(id);
  const canEdit = canEditSops(user.role);

  const sops = canEdit
    ? await queryAll<{ id: number; title: string }>(
        `SELECT id, title FROM sops WHERE id NOT IN (
           SELECT entity_id FROM control_links WHERE control_id = $1 AND entity_type = 'sop'
         ) ORDER BY title LIMIT 50`,
        [id]
      )
    : [];
  const checks = canEdit
    ? await queryAll<{ id: number; name: string }>(
        `SELECT id, name FROM checks WHERE id NOT IN (
           SELECT entity_id FROM control_links WHERE control_id = $1 AND entity_type = 'check'
         ) ORDER BY name LIMIT 50`,
        [id]
      )
    : [];

  const linksByType = {
    sop: links.filter((l) => l.entity_type === "sop"),
    check: links.filter((l) => l.entity_type === "check"),
    audit: links.filter((l) => l.entity_type === "audit"),
    capa: links.filter((l) => l.entity_type === "capa"),
  };

  return (
    <Workspace
      section="Compliance / Controls"
      subtitle={ctrl.name}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {ctrl.code && <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{ctrl.code}</span>}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${HEALTH_TONE[ctrl.health_status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${HEALTH_DOT[ctrl.health_status]}`} />
                {HEALTH_LABEL[ctrl.health_status]}
              </span>
              {ctrl.framework_code && (
                <Link href={`/frameworks/${ctrl.framework_id}`} className="text-xs text-brand-700 hover:underline">
                  {ctrl.framework_code}
                </Link>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{ctrl.name}</h2>
            {ctrl.description && <p className="text-sm text-gray-600 max-w-3xl">{ctrl.description}</p>}
          </div>
        </div>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm pt-3 border-t border-gray-100">
          <Field label="Owner">{ctrl.owner_name ?? "—"}</Field>
          <Field label="Category">{ctrl.category ?? "—"}</Field>
          <Field label="Linked SOPs">{ctrl.linked_sops}</Field>
          <Field label="Linked checks">{ctrl.linked_checks}</Field>
          <Field label="Open CAPAs">{ctrl.open_capas}</Field>
          <Field label="Health updated">{ctrl.health_updated_at ? new Date(ctrl.health_updated_at).toLocaleString() : "Never"}</Field>
        </dl>
      </div>

      {/* Linked things */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <LinkPanel title="SOPs" type="sop" links={linksByType.sop} controlId={ctrl.id} canEdit={canEdit} />
        <LinkPanel title="Checks (Tests)" type="check" links={linksByType.check} controlId={ctrl.id} canEdit={canEdit} />
        <LinkPanel title="Audits" type="audit" links={linksByType.audit} controlId={ctrl.id} canEdit={false} />
        <LinkPanel title="Corrective Actions" type="capa" links={linksByType.capa} controlId={ctrl.id} canEdit={false} />
      </div>

      {/* Add new links */}
      {canEdit && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Link new records</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sops.length > 0 && (
              <form action={linkControlAction} className="flex items-end gap-2">
                <input type="hidden" name="control_id" value={ctrl.id} />
                <input type="hidden" name="entity_type" value="sop" />
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Add SOP</label>
                  <select name="entity_id" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {sops.map((s) => (<option key={s.id} value={s.id}>{s.title}</option>))}
                  </select>
                </div>
                <button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white px-3 py-2 rounded-lg text-sm">Link</button>
              </form>
            )}
            {checks.length > 0 && (
              <form action={linkControlAction} className="flex items-end gap-2">
                <input type="hidden" name="control_id" value={ctrl.id} />
                <input type="hidden" name="entity_type" value="check" />
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Add check</label>
                  <select name="entity_id" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {checks.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white px-3 py-2 rounded-lg text-sm">Link</button>
              </form>
            )}
          </div>
        </div>
      )}

      <Link href="/controls" className="inline-block mt-2 text-sm text-gray-500 hover:text-gray-700">
        ← Back to all controls
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

function LinkPanel({
  title,
  type,
  links,
  controlId,
  canEdit,
}: {
  title: string;
  type: "sop" | "check" | "audit" | "capa";
  links: { id: number; entity_id: number; label: string | null; status: string | null }[];
  controlId: number;
  canEdit: boolean;
}) {
  const hrefBase: Record<typeof type, string> = {
    sop: "/sops", check: "/tests", audit: "/audits", capa: "/capa",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-3">{title} ({links.length})</h4>
      {links.length === 0 ? (
        <div className="text-xs text-gray-400 italic">No links yet.</div>
      ) : (
        <ul className="space-y-1.5">
          {links.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
              <Link href={`${hrefBase[type]}/${l.entity_id}`} className="text-gray-800 hover:text-brand-700 hover:underline truncate">
                {l.label ?? `#${l.entity_id}`}
              </Link>
              <div className="flex items-center gap-2">
                {l.status && <span className="text-[10px] uppercase tracking-wider text-gray-500">{l.status}</span>}
                {canEdit && (
                  <form action={unlinkControlAction}>
                    <input type="hidden" name="link_id" value={l.id} />
                    <input type="hidden" name="control_id" value={controlId} />
                    <button type="submit" className="text-xs text-red-500 hover:underline">remove</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
