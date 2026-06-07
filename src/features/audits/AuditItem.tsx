"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveResponseAction } from "./actions";

type Response = "pass" | "fail" | "na" | null;

export type AuditItemProps = {
  auditId: number;
  itemId: number;
  sortOrder: number;
  question: string;
  guidance: string | null;
  weight: number;
  isCritical: boolean;
  initialResponse: Response;
  initialNotes: string | null;
  initialEvidenceUrl: string | null;
  canEdit: boolean;
};

export default function AuditItem(props: AuditItemProps) {
  const [response, setResponse] = useState<Response>(props.initialResponse);
  const [notes, setNotes] = useState<string>(props.initialNotes ?? "");
  const [evidenceUrl, setEvidenceUrl] = useState<string>(props.initialEvidenceUrl ?? "");

  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Last saved values so we don't re-submit unchanged data on blur.
  const lastSavedRef = useRef({
    response: props.initialResponse,
    notes: props.initialNotes ?? "",
    evidenceUrl: props.initialEvidenceUrl ?? "",
  });

  // Hide the "Saved ✓" pill after 1.8 s.
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 1800);
    return () => clearTimeout(t);
  }, [savedAt]);

  function save(overrides?: Partial<{ response: Response; notes: string; evidenceUrl: string }>) {
    const nextResponse = overrides?.response !== undefined ? overrides.response : response;
    const nextNotes = overrides?.notes !== undefined ? overrides.notes : notes;
    const nextEvidence =
      overrides?.evidenceUrl !== undefined ? overrides.evidenceUrl : evidenceUrl;

    // Skip if nothing meaningful changed since the last save.
    const last = lastSavedRef.current;
    if (
      last.response === nextResponse &&
      last.notes === nextNotes &&
      last.evidenceUrl === nextEvidence
    ) {
      return;
    }

    const fd = new FormData();
    fd.append("audit_id", String(props.auditId));
    fd.append("item_id", String(props.itemId));
    fd.append("response", nextResponse ?? "");
    fd.append("notes", nextNotes);
    fd.append("evidence_url", nextEvidence);

    setErrorMsg(null);
    startTransition(async () => {
      try {
        await saveResponseAction(fd);
        lastSavedRef.current = {
          response: nextResponse,
          notes: nextNotes,
          evidenceUrl: nextEvidence,
        };
        setSavedAt(Date.now());
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  function pick(next: "pass" | "fail" | "na") {
    if (!props.canEdit) return;
    setResponse(next);
    save({ response: next });
  }

  const cardTone =
    response === "fail"
      ? "border-red-200 bg-red-50/30"
      : response === "pass"
        ? "border-emerald-200 bg-emerald-50/30"
        : "border-gray-200";

  const buttonBase =
    "flex-1 text-center text-xs font-medium uppercase tracking-wider px-3 py-2.5 rounded-lg transition-all border select-none";
  const buttonIdle =
    "bg-white text-gray-500 border-gray-300 hover:border-gray-400 hover:bg-gray-50";
  const tone = (opt: "pass" | "fail" | "na") =>
    response === opt
      ? opt === "pass"
        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm ring-2 ring-emerald-300"
        : opt === "fail"
          ? "bg-red-500 text-white border-red-500 shadow-sm ring-2 ring-red-300"
          : "bg-gray-400 text-white border-gray-400 shadow-sm ring-2 ring-gray-300"
      : buttonIdle;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-colors ${cardTone}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="text-xs text-gray-400 font-mono mt-1">{props.sortOrder}</div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">
            {props.question}
            {props.isCritical && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">
                CRITICAL
              </span>
            )}
          </div>
          {props.guidance && (
            <div className="text-xs text-gray-500 mt-1">{props.guidance}</div>
          )}
        </div>
        <div className="text-xs text-gray-400">×{props.weight}</div>
      </div>

      {/* Pass / Fail / N/A buttons */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => pick("pass")}
          disabled={!props.canEdit || pending}
          className={`${buttonBase} ${tone("pass")} ${!props.canEdit ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        >
          Pass
        </button>
        <button
          type="button"
          onClick={() => pick("fail")}
          disabled={!props.canEdit || pending}
          className={`${buttonBase} ${tone("fail")} ${!props.canEdit ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        >
          Fail
        </button>
        <button
          type="button"
          onClick={() => pick("na")}
          disabled={!props.canEdit || pending}
          className={`${buttonBase} ${tone("na")} ${!props.canEdit ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        >
          N/A
        </button>
      </div>

      {/* Notes */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => save()}
        disabled={!props.canEdit}
        placeholder="Notes (optional)"
        rows={2}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 mb-2"
      />

      {/* Evidence URL */}
      <input
        type="url"
        value={evidenceUrl}
        onChange={(e) => setEvidenceUrl(e.target.value)}
        onBlur={() => save()}
        disabled={!props.canEdit}
        placeholder="Evidence URL (photo / file / report link)"
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
      />

      {/* Status pill */}
      <div className="flex justify-end items-center gap-3 mt-2 h-5 text-xs">
        {errorMsg && <span className="text-red-600">{errorMsg}</span>}
        {pending && (
          <span className="text-gray-500 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
            Saving…
          </span>
        )}
        {!pending && savedAt && (
          <span className="text-emerald-700 inline-flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
