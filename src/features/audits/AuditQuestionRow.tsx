"use client";

import { useState, useTransition } from "react";
import { saveResponseAction } from "./actions";

type Response = "pass" | "fail" | "na" | null;

/**
 * Lightweight per-question row matching the checklist-template UX
 * (Yes / No / N/A radios + optional Note + Save). Used in the new
 * Test → Checklist → Questions audit layout.
 *
 * The same item can appear under multiple tests (one row each) — they
 * all share the same audit_responses row because the UNIQUE constraint
 * is (audit_id, item_id). Saving one updates the underlying response;
 * the others reflect it on next page refresh.
 */
export default function AuditQuestionRow({
  auditId,
  itemId,
  question,
  weight,
  isCritical,
  itemNo,
  initialResponse,
  initialNotes,
  canEdit,
}: {
  auditId: number;
  itemId: number;
  question: string;
  weight: number;
  isCritical: boolean;
  itemNo: number;
  initialResponse: Response;
  initialNotes: string | null;
  canEdit: boolean;
}) {
  const [response, setResponse] = useState<Response>(initialResponse);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!response) {
      setError("Pick Yes, No, or N/A first.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.append("audit_id", String(auditId));
    fd.append("item_id", String(itemId));
    fd.append("response", response);
    fd.append("notes", notes);
    startTransition(async () => {
      try {
        await saveResponseAction(fd);
        setSavedAt(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  // pass/fail/na is the DB enum; Yes/No/N/A is what the auditor reads.
  const labels: Record<NonNullable<Response>, string> = {
    pass: "Yes",
    fail: "No",
    na: "N/A",
  };

  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="px-3 py-2.5 text-xs text-gray-400 w-12">{itemNo}</td>
      <td className="px-3 py-2.5">
        <div className="text-sm text-gray-900">
          {question}
          {isCritical && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">
              CRITICAL
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-gray-500 w-16 tabular-nums">
        ×{weight}
      </td>
      <td className="px-3 py-2.5 min-w-[360px]">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-start gap-2">
          <div className="flex items-center gap-1">
            {(["pass", "fail", "na"] as const).map((r) => (
              <label
                key={r}
                className={`inline-flex items-center gap-1 px-2 py-1 border rounded cursor-pointer text-xs transition-colors ${
                  response === r
                    ? r === "pass"
                      ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                      : r === "fail"
                      ? "bg-red-50 border-red-400 text-red-800"
                      : "bg-gray-100 border-gray-400 text-gray-800"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                } ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <input
                  type="radio"
                  name={`r-${itemId}`}
                  value={r}
                  checked={response === r}
                  onChange={() => setResponse(r)}
                  disabled={!canEdit || pending}
                  className="accent-brand-700"
                />
                <span className="font-medium">{labels[r]}</span>
              </label>
            ))}
          </div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Note (optional)"
            disabled={!canEdit || pending}
            className="flex-1 min-w-[140px] px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
          />
          {canEdit && (
            <button
              type="submit"
              disabled={pending}
              className="bg-brand-700 hover:bg-brand-800 text-white px-3 py-1 rounded text-xs font-medium disabled:opacity-60"
            >
              {pending ? "…" : "Save"}
            </button>
          )}
          {savedAt && !pending && !error && (
            <span className="text-[10px] text-emerald-600 self-center">Saved ✓</span>
          )}
          {error && (
            <span className="text-[10px] text-red-600 self-center">{error}</span>
          )}
        </form>
      </td>
    </tr>
  );
}
