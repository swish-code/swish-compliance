import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { getAudit, getAuditItems } from "@/features/audits/repository";
import {
  saveResponseAction,
  submitAuditAction,
  closeAuditAction,
} from "@/features/audits/actions";
import {
  AUDIT_STATUS_LABEL,
  AUDIT_STATUS_TONE,
} from "@/features/audits/types";

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id: idStr } = await params;
  const id = Number(idStr);
  const audit = await getAudit(id);
  if (!audit) notFound();
  const items = await getAuditItems(id);

  const isOpen = audit.status === "in_progress";
  const answered = items.filter((i) => i.response).length;
  const failed = items.filter((i) => i.response === "fail").length;

  return (
    <Workspace
      section="Compliance / Audits"
      subtitle={`${audit.template_name} — #${audit.id}`}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${AUDIT_STATUS_TONE[audit.status]}`}
              >
                {AUDIT_STATUS_LABEL[audit.status]}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(audit.audit_date).toLocaleDateString()}
              </span>
              {audit.template_category && (
                <span className="text-xs text-brand-700">{audit.template_category}</span>
              )}
            </div>
            <div className="flex gap-6 text-sm text-gray-600">
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-400">Brand</span>
                <div>{audit.brand_name ?? "—"}</div>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-400">Department</span>
                <div>{audit.department_name ?? "—"}</div>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-400">Location</span>
                <div>{audit.location ?? "—"}</div>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-400">Auditor</span>
                <div>{audit.auditor_name ?? "—"}</div>
              </div>
            </div>
          </div>

          {audit.score !== null && (
            <div className="text-right">
              <div
                className={`text-4xl font-bold ${
                  Number(audit.score) >= 90 ? "text-emerald-600" :
                  Number(audit.score) >= 70 ? "text-amber-600" :
                  "text-red-600"
                }`}
              >
                {Number(audit.score).toFixed(1)}%
              </div>
              <div className="text-xs uppercase tracking-wider text-gray-500">Score</div>
              {audit.critical_failed > 0 && (
                <div className="text-xs text-red-700 mt-1 font-medium">
                  {audit.critical_failed} critical fail{audit.critical_failed > 1 ? "s" : ""}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="text-xs text-gray-500">
          {isOpen
            ? `Answered ${answered} of ${items.length} items${failed > 0 ? ` — ${failed} marked fail` : ""}`
            : audit.summary
              ? <span><span className="font-medium text-gray-700">Summary:</span> {audit.summary}</span>
              : "Submitted with no summary."}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3 mb-4">
        {items.map((item) => {
          const r = item.response;
          return (
            <div
              key={item.item_id}
              className={`bg-white rounded-2xl border shadow-sm p-5 ${
                r === "fail" ? "border-red-200 bg-red-50/30" :
                r === "pass" ? "border-emerald-200 bg-emerald-50/30" :
                "border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="text-xs text-gray-400 font-mono mt-1">{item.sort_order}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {item.question}
                    {item.is_critical && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">
                        CRITICAL
                      </span>
                    )}
                  </div>
                  {item.guidance && (
                    <div className="text-xs text-gray-500 mt-1">{item.guidance}</div>
                  )}
                </div>
                <div className="text-xs text-gray-400">×{item.weight}</div>
              </div>

              {isOpen ? (
                <form action={saveResponseAction} className="space-y-3">
                  <input type="hidden" name="audit_id" value={audit.id} />
                  <input type="hidden" name="item_id" value={item.item_id} />

                  <div className="flex gap-2">
                    {(["pass", "fail", "na"] as const).map((opt) => (
                      <label
                        key={opt}
                        className={`flex-1 text-center text-xs font-medium uppercase tracking-wider px-3 py-2 rounded-lg cursor-pointer transition-colors border ${
                          r === opt
                            ? opt === "pass" ? "bg-emerald-500 text-white border-emerald-500" :
                              opt === "fail" ? "bg-red-500 text-white border-red-500" :
                              "bg-gray-300 text-white border-gray-300"
                            : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <input type="radio" name="response" value={opt} defaultChecked={r === opt} className="sr-only" />
                        {opt === "pass" ? "Pass" : opt === "fail" ? "Fail" : "N/A"}
                      </label>
                    ))}
                  </div>

                  <textarea
                    name="notes"
                    placeholder="Notes (optional)"
                    rows={2}
                    defaultValue={item.notes ?? ""}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />

                  <input
                    type="url"
                    name="evidence_url"
                    placeholder="Evidence URL (photo / file link)"
                    defaultValue={item.evidence_url ?? ""}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="text-xs text-brand-700 hover:text-brand-800 font-medium"
                    >
                      Save response
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-1 pl-7">
                  <div className="text-xs">
                    Response: <span className={
                      r === "pass" ? "text-emerald-700 font-medium" :
                      r === "fail" ? "text-red-700 font-medium" :
                      "text-gray-500"
                    }>{r ? r.toUpperCase() : "Not answered"}</span>
                  </div>
                  {item.notes && <div className="text-xs text-gray-600 italic">"{item.notes}"</div>}
                  {item.evidence_url && (
                    <a href={item.evidence_url} target="_blank" rel="noreferrer" className="text-xs text-brand-700 hover:underline">
                      Evidence ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {isOpen && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Submit audit</h3>
          <form action={submitAuditAction} className="space-y-4">
            <input type="hidden" name="id" value={audit.id} />
            <textarea
              name="summary"
              placeholder="Summary / overall observations (optional)"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <label className="flex items-start gap-3 p-3 border border-amber-200 bg-amber-50 rounded-lg cursor-pointer text-sm">
              <input type="checkbox" name="spawn_capa" defaultChecked className="accent-amber-600 mt-0.5" />
              <div>
                <div className="font-medium text-amber-900">Auto-create CAPAs for failed items</div>
                <div className="text-xs text-amber-700">
                  Each fail (especially critical ones) gets a corrective action with a 7-day default due date.
                </div>
              </div>
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-brand-700 hover:bg-brand-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
              >
                Submit audit
              </button>
              <Link href="/audits" className="text-sm text-gray-500 hover:text-gray-700 self-center">
                Back to list
              </Link>
            </div>
          </form>
        </div>
      )}

      {audit.status === "submitted" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Submitted {audit.submitted_at && new Date(audit.submitted_at).toLocaleString()}.
            Mark as closed when all related CAPAs are addressed.
          </div>
          <form action={closeAuditAction}>
            <input type="hidden" name="id" value={audit.id} />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Close audit
            </button>
          </form>
        </div>
      )}
    </Workspace>
  );
}
