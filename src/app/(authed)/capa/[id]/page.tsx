import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, canApproveSops } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { getCapa } from "@/features/capa/repository";
import { transitionCapaAction } from "@/features/capa/actions";
import {
  CAPA_STATUS_LABEL,
  CAPA_STATUS_TONE,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  type CapaStatus,
} from "@/features/capa/types";

export default async function CapaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id: idStr } = await params;
  const id = Number(idStr);
  const capa = await getCapa(id);
  if (!capa) notFound();

  const isAssignee = capa.assigned_to === user.id;
  const canVerify = canApproveSops(user.role);

  const transitions: { label: string; next: CapaStatus; tone: string; show: boolean }[] = [
    {
      label: "Start working",
      next: "in_progress",
      tone: "bg-amber-600 hover:bg-amber-700",
      show: capa.status === "open" && (isAssignee || canVerify),
    },
    {
      label: "Submit for verification",
      next: "submitted",
      tone: "bg-indigo-600 hover:bg-indigo-700",
      show: capa.status === "in_progress" && (isAssignee || canVerify),
    },
    {
      label: "Verify",
      next: "verified",
      tone: "bg-emerald-600 hover:bg-emerald-700",
      show: capa.status === "submitted" && canVerify,
    },
    {
      label: "Close",
      next: "closed",
      tone: "bg-emerald-700 hover:bg-emerald-800",
      show: (capa.status === "verified" || capa.status === "submitted") && canVerify,
    },
    {
      label: "Reject",
      next: "rejected",
      tone: "bg-red-600 hover:bg-red-700",
      show: capa.status === "submitted" && canVerify,
    },
  ];

  return (
    <Workspace
      section="Compliance / CAPA"
      subtitle={capa.title}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{capa.code}</span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${CAPA_STATUS_TONE[capa.status]}`}>
            {CAPA_STATUS_LABEL[capa.status]}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${SEVERITY_TONE[capa.severity]}`}>
            {SEVERITY_LABEL[capa.severity]} severity
          </span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{capa.title}</h2>
        {capa.description && <p className="text-gray-600 whitespace-pre-line mb-4">{capa.description}</p>}

        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <Field label="Brand">{capa.brand_name ?? "—"}</Field>
          <Field label="Department">{capa.department_name ?? "—"}</Field>
          <Field label="Assigned to">{capa.assigned_to_name ?? "—"}</Field>
          <Field label="Due date">{capa.due_date ? new Date(capa.due_date).toLocaleDateString() : "—"}</Field>
          <Field label="Created by">{capa.created_by_name ?? "—"}</Field>
          {capa.source_audit_id && (
            <Field label="From audit">
              <Link href={`/audits/${capa.source_audit_id}`} className="text-brand-700 hover:underline">
                #{capa.source_audit_id}
              </Link>
            </Field>
          )}
          {capa.verified_by_name && <Field label="Verified by">{capa.verified_by_name}</Field>}
          {capa.evidence_url && (
            <Field label="Evidence">
              <a href={capa.evidence_url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">Open ↗</a>
            </Field>
          )}
        </dl>

        {capa.resolution_note && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Resolution note</div>
            {capa.resolution_note}
          </div>
        )}
      </div>

      {/* Transition forms */}
      {transitions.filter((t) => t.show).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Available actions</h3>
          <div className="space-y-3">
            {transitions.filter((t) => t.show).map((t) => (
              <form key={t.next} action={transitionCapaAction} className="border border-gray-200 rounded-lg p-4">
                <input type="hidden" name="id" value={capa.id} />
                <input type="hidden" name="status" value={t.next} />
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{t.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {t.next === "submitted" && "Mark the work as complete and ready for verification."}
                      {t.next === "verified" && "Confirm the fix is correct (does not close the CAPA)."}
                      {t.next === "closed" && "Mark this CAPA as fully resolved."}
                      {t.next === "rejected" && "Send back to assignee — needs more work."}
                      {t.next === "in_progress" && "Acknowledge ownership and start working."}
                    </div>
                  </div>
                  <button type="submit" className={`${t.tone} text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap`}>
                    {t.label}
                  </button>
                </div>
                {(t.next === "submitted" || t.next === "rejected") && (
                  <div className="space-y-2 mt-3">
                    <textarea
                      name="resolution_note"
                      rows={2}
                      placeholder={t.next === "submitted" ? "What did you do to fix it?" : "Why are you rejecting this?"}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {t.next === "submitted" && (
                      <input
                        type="url"
                        name="evidence_url"
                        placeholder="Evidence URL (photo, file, link)"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    )}
                  </div>
                )}
              </form>
            ))}
          </div>
        </div>
      )}

      <Link href="/capa" className="inline-block mt-4 text-sm text-gray-500 hover:text-gray-700">
        ← Back to list
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
