"use client";

import { useRef, useState, useTransition } from "react";
import { importGrcWorkbookAction } from "./actions";
import type { ImportResult } from "@/lib/grcImport/importWorkbook";

/**
 * Two-step upload: "Preview only" is checked by default, so the first
 * submit always rolls back and just reports what would happen (counts +
 * warnings). Unchecking it and re-submitting the SAME file commits for
 * real. There's nothing clever behind that — the browser just resends
 * the file the admin already picked; the checkbox alone decides whether
 * the transaction commits or rolls back.
 */
export default function ImportWorkbookForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("dry_run", dryRun ? "true" : "false");

    startTransition(async () => {
      const r = await importGrcWorkbookAction(fd);
      setResult(r);
      // A successful commit clears the picker so a stray re-submit can't
      // accidentally re-run the same import twice in a row.
      if (r.committed) {
        setDryRun(true);
        if (fileRef.current) fileRef.current.value = "";
        setFileName(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Workbook file (.xlsx)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            className="w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:text-sm file:font-medium hover:file:bg-brand-100"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Same sheet layout as SOP_GRC_Department_Branch: Departments, SOPs,
            Domains, Frameworks, Controls, Tests &amp; Evidences, Checklists,
            Questions (HTML Maps optional).
          </p>
        </div>

        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="mt-0.5 accent-brand-700"
          />
          <div>
            <div className="text-sm font-medium text-gray-900">
              Preview only (recommended first run)
            </div>
            <div className="text-xs text-gray-500">
              Runs the whole import and reports what would happen, then rolls
              back — nothing is saved. Uncheck this and re-upload the same
              file once the preview looks right.
            </div>
          </div>
        </label>

        <button
          type="submit"
          disabled={pending || !fileName}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed ${
            dryRun ? "bg-brand-700 hover:bg-brand-800" : "bg-amber-600 hover:bg-amber-700"
          }`}
        >
          {pending ? "Running…" : dryRun ? "Preview import" : "Import for real"}
        </button>
      </form>

      {result && (
        <div
          className={`rounded-xl border p-4 space-y-3 ${
            result.error
              ? "border-red-200 bg-red-50"
              : result.committed
              ? "border-emerald-200 bg-emerald-50"
              : "border-blue-200 bg-blue-50"
          }`}
        >
          <div className="text-sm font-semibold">
            {result.error
              ? "Import failed"
              : result.committed
              ? "Imported — saved to the database"
              : "Preview — nothing was saved"}
          </div>

          {result.error && (
            <p className="text-sm text-red-800">{result.error}</p>
          )}

          {result.log.length > 0 && (
            <ul className="text-xs text-gray-700 font-mono space-y-0.5">
              {result.log.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}

          {result.warnings.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide mb-1">
                Warnings
              </div>
              <ul className="text-xs text-amber-800 space-y-0.5">
                {result.warnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          )}

          {!result.error && !result.committed && (
            <p className="text-xs text-blue-800">
              Looks good? Uncheck &quot;Preview only&quot; above and submit again
              with the same file to save it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
