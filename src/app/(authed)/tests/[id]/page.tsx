import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import Workspace from "@/features/shell/Workspace";
import { getCheck, listCheckResults } from "@/features/checks/repository";
import { recordResultAction } from "@/features/checks/actions";
import FilePicker from "@/features/sops/FilePicker";
import {
  CHECK_STATUS_LABEL,
  CHECK_STATUS_TONE,
  FREQUENCY_LABEL,
} from "@/features/checks/types";

export default async function CheckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id: idStr } = await params;
  const id = Number(idStr);
  const check = await getCheck(id);
  if (!check) notFound();
  const results = await listCheckResults(id, 50);

  return (
    <Workspace
      section="Workspace / Tests"
      subtitle={check.name}
      sessionLabel="Session"
      userLabel={user.displayName}
    >
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <div className="flex items-center gap-3 mb-2">
          {check.code && <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{check.code}</span>}
          {check.last_status ? (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${CHECK_STATUS_TONE[check.last_status]}`}>
              {CHECK_STATUS_LABEL[check.last_status]}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs text-gray-500 bg-gray-100">Never run</span>
          )}
          <span className="text-xs text-gray-500">{FREQUENCY_LABEL[check.frequency]}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{check.name}</h2>
        {check.description && <p className="text-sm text-gray-600 mb-3">{check.description}</p>}
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm pt-3 border-t border-gray-100">
          <Field label="Control">
            {check.control_id ? (
              <Link href={`/controls/${check.control_id}`} className="text-brand-700 hover:underline">{check.control_name}</Link>
            ) : "—"}
          </Field>
          <Field label="Owner">{check.owner_name ?? "—"}</Field>
          <Field label="Results recorded">{check.result_count}</Field>
          <Field label="Next due">{check.next_due_date ? new Date(check.next_due_date).toLocaleDateString() : "—"}</Field>
        </dl>
      </div>

      {/* Record new result */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Record a new result</h3>
        <form action={recordResultAction} className="space-y-4">
          <input type="hidden" name="check_id" value={check.id} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(["passing", "failing", "pending_review", "accepted_risk"] as const).map((s) => (
              <label key={s} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 has-checked:border-brand-500 has-checked:bg-brand-50">
                <input type="radio" name="status" value={s} required className="accent-brand-700" />
                <span className="text-sm font-medium">{CHECK_STATUS_LABEL[s]}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              name="notes"
              required
              rows={3}
              placeholder="Describe what you observed and any context for this result. Required."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Evidence (photo / file)
            </label>
            <FilePicker name="evidence_file" />
            <p className="text-[11px] text-gray-400 mt-1">
              PDF, Word, Excel, PowerPoint, image or text up to 10 MB.
            </p>
          </div>
          <label className="flex items-start gap-3 p-3 border border-amber-200 bg-amber-50 rounded-lg cursor-pointer text-sm">
            <input type="checkbox" name="spawn_capa" defaultChecked className="accent-amber-600 mt-0.5" />
            <div>
              <div className="font-medium text-amber-900">Auto-create CAPA on failure</div>
              <div className="text-xs text-amber-700">If status = failing, open a high-severity corrective action with a 7-day due date.</div>
            </div>
          </label>
          <button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium">Record result</button>
        </form>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Result history ({results.length})</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 font-medium">When</th>
              <th className="text-left px-5 py-3 font-medium">By</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="text-left px-5 py-3 font-medium">Notes</th>
              <th className="text-left px-5 py-3 font-medium">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No results recorded yet.</td></tr>
            )}
            {results.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-5 py-3 text-gray-600">{r.performed_by_name ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CHECK_STATUS_TONE[r.status]}`}>
                    {CHECK_STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600 text-xs max-w-md truncate">{r.notes ?? "—"}</td>
                <td className="px-5 py-3 text-xs">
                  {r.evidence_url ? (
                    <a
                      href={r.evidence_url}
                      target="_blank"
                      rel="noreferrer"
                      download={r.evidence_name ?? undefined}
                      className="text-brand-700 hover:underline inline-flex items-center gap-1"
                      title={r.evidence_name ?? "Evidence"}
                    >
                      <span>{iconForMime(r.evidence_mime)}</span>
                      <span className="truncate max-w-[180px]">
                        {r.evidence_name ?? "Open"}
                      </span>
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link href="/tests" className="inline-block mt-4 text-sm text-gray-500 hover:text-gray-700">
        ← Back to all tests
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

function iconForMime(mime: string | null): string {
  if (!mime) return "📎";
  if (mime.startsWith("image/")) return "🖼️";
  if (mime === "application/pdf") return "📄";
  if (mime.includes("word")) return "📝";
  if (mime.includes("excel") || mime.includes("spreadsheet")) return "📊";
  if (mime.includes("powerpoint") || mime.includes("presentation")) return "📑";
  if (mime.startsWith("text/")) return "📃";
  return "📎";
}
