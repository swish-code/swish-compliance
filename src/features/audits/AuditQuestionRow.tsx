"use client";

import { useAuditAnswers, type AnswerValue } from "./AuditAnswersContext";

/**
 * One question row: Yes / No / N/A radios plus an optional note.
 *
 * Deliberately has no Save button of its own — every answer lives in
 * AuditAnswersProvider and is written by the single "Save all answers"
 * bar at the end of the questions (or by Submit, which flushes first).
 * An unsaved row is marked instead, so the auditor can see at a glance
 * what the next save will write.
 */
export default function AuditQuestionRow({
  itemId,
  question,
  weight,
  isCritical,
  itemNo,
}: {
  itemId: number;
  question: string;
  weight: number;
  isCritical: boolean;
  itemNo: number;
}) {
  const { get, setResponse, setNotes, canEdit, dirtyIds, saving } =
    useAuditAnswers();

  const { response, notes } = get(itemId);
  const isDirty = dirtyIds.includes(itemId);

  // pass/fail/na is the DB enum; Yes/No/N/A is what the auditor reads.
  const labels: Record<AnswerValue, string> = {
    pass: "Yes",
    fail: "No",
    na: "N/A",
  };

  return (
    <tr
      className={`border-t border-gray-100 align-top ${
        isDirty ? "bg-amber-50/40" : ""
      }`}
    >
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
        <div className="flex flex-wrap items-center gap-2">
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
                  onChange={() => setResponse(itemId, r)}
                  disabled={!canEdit || saving}
                  className="accent-brand-700"
                />
                <span className="font-medium">{labels[r]}</span>
              </label>
            ))}
          </div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(itemId, e.target.value)}
            placeholder="Note (optional)"
            disabled={!canEdit || saving}
            className="flex-1 min-w-[140px] px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
          />
          {isDirty && (
            <span className="text-[10px] text-amber-700 whitespace-nowrap">
              Unsaved
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
