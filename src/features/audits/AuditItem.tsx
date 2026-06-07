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
  initialEvidenceName: string | null;
  initialEvidenceMime: string | null;
  canEdit: boolean;
};

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,text/plain,text/csv";

function iconForMime(mime: string | null | undefined): string {
  if (!mime) return "📎";
  if (mime.startsWith("image/")) return "🖼️";
  if (mime === "application/pdf") return "📄";
  if (mime.includes("word")) return "📝";
  if (mime.includes("excel") || mime.includes("spreadsheet")) return "📊";
  if (mime.includes("powerpoint") || mime.includes("presentation")) return "📑";
  if (mime.startsWith("text/")) return "📃";
  return "📎";
}

export default function AuditItem(props: AuditItemProps) {
  const [response, setResponse] = useState<Response>(props.initialResponse);
  const [notes, setNotes] = useState<string>(props.initialNotes ?? "");

  /** The CURRENT evidence display state — comes from DB OR a freshly picked file. */
  const [evidence, setEvidence] = useState<{
    url: string | null;
    name: string | null;
    mime: string | null;
    isFresh: boolean; // true when picked in this session and not yet saved
  }>({
    url: props.initialEvidenceUrl,
    name: props.initialEvidenceName,
    mime: props.initialEvidenceMime,
    isFresh: false,
  });

  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notesRequiredWarning, setNotesRequiredWarning] = useState(false);

  const notesRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Last saved values so we don't re-submit unchanged data on blur.
  const lastSavedRef = useRef({
    response: props.initialResponse,
    notes: props.initialNotes ?? "",
  });

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 1800);
    return () => clearTimeout(t);
  }, [savedAt]);

  function buildFormData(opts: {
    response: Response;
    notes: string;
    file?: File | null;
    removeEvidence?: boolean;
  }): FormData {
    const fd = new FormData();
    fd.append("audit_id", String(props.auditId));
    fd.append("item_id", String(props.itemId));
    fd.append("response", opts.response ?? "");
    fd.append("notes", opts.notes);
    if (opts.file) {
      fd.append("evidence_file", opts.file);
      fd.append("update_evidence", "true");
    } else if (opts.removeEvidence) {
      fd.append("update_evidence", "true");
      fd.append("remove_evidence", "true");
    }
    return fd;
  }

  function save(opts: {
    response?: Response;
    notes?: string;
    file?: File | null;
    removeEvidence?: boolean;
    force?: boolean; // bypass the "nothing changed" guard
  } = {}) {
    const nextResponse = opts.response !== undefined ? opts.response : response;
    const nextNotes = opts.notes !== undefined ? opts.notes : notes;

    // Notes are required to record any response.
    if (!nextNotes.trim()) {
      setNotesRequiredWarning(true);
      notesRef.current?.focus();
      return;
    }

    // Skip if nothing meaningful changed AND there's no file / removal pending.
    if (!opts.force && !opts.file && !opts.removeEvidence) {
      const last = lastSavedRef.current;
      if (last.response === nextResponse && last.notes === nextNotes) {
        return;
      }
    }

    setErrorMsg(null);
    setNotesRequiredWarning(false);
    const fd = buildFormData({
      response: nextResponse,
      notes: nextNotes,
      file: opts.file ?? null,
      removeEvidence: opts.removeEvidence,
    });

    startTransition(async () => {
      try {
        await saveResponseAction(fd);
        lastSavedRef.current = { response: nextResponse, notes: nextNotes };
        if (opts.file || opts.removeEvidence) {
          setEvidence((prev) => ({ ...prev, isFresh: false }));
        }
        setSavedAt(Date.now());
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  function pick(next: "pass" | "fail" | "na") {
    if (!props.canEdit) return;
    if (!notes.trim()) {
      setNotesRequiredWarning(true);
      notesRef.current?.focus();
      return;
    }
    setResponse(next);
    save({ response: next });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setErrorMsg(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`);
      e.target.value = "";
      return;
    }
    // Build a temporary preview URL for the freshly-picked file.
    const reader = new FileReader();
    reader.onload = () => {
      setEvidence({
        url: typeof reader.result === "string" ? reader.result : null,
        name: file.name,
        mime: file.type,
        isFresh: true,
      });
    };
    reader.readAsDataURL(file);

    // Auto-save on pick — but only if notes is already filled.
    if (!notes.trim()) {
      setNotesRequiredWarning(true);
      notesRef.current?.focus();
      return;
    }
    save({ file });
  }

  function removeEvidence() {
    setEvidence({ url: null, name: null, mime: null, isFresh: false });
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Only round-trip the removal if there was something saved.
    if (props.initialEvidenceUrl) {
      save({ removeEvidence: true });
    }
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

      {/* Notes — REQUIRED */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Notes <span className="text-red-500">*</span>
        </label>
        <textarea
          ref={notesRef}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            if (notesRequiredWarning && e.target.value.trim()) {
              setNotesRequiredWarning(false);
            }
          }}
          onBlur={() => save()}
          disabled={!props.canEdit}
          required
          placeholder="Notes are required — describe what you saw."
          rows={2}
          className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 ${
            notesRequiredWarning
              ? "border-red-400 ring-2 ring-red-200"
              : "border-gray-300"
          }`}
        />
        {notesRequiredWarning && (
          <p className="text-[11px] text-red-700 mt-1">
            Please write a note before recording the response.
          </p>
        )}
      </div>

      {/* Evidence — file upload */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Evidence (photo / file)
        </label>
        {evidence.url ? (
          <div className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg bg-white">
            <span className="text-xl">{iconForMime(evidence.mime)}</span>
            <a
              href={evidence.url}
              download={evidence.name ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-sm text-brand-700 hover:underline truncate"
              title={evidence.name ?? "Evidence"}
            >
              {evidence.name ?? "View evidence"}
            </a>
            {evidence.isFresh && (
              <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                New
              </span>
            )}
            {props.canEdit && (
              <button
                type="button"
                onClick={removeEvidence}
                disabled={pending}
                className="text-xs text-red-600 hover:text-red-800 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        ) : (
          <label
            className={`flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 ${
              props.canEdit ? "cursor-pointer hover:border-brand-500 hover:bg-brand-50/20" : "opacity-60 cursor-not-allowed"
            }`}
          >
            <span className="text-lg">📎</span>
            <span>Click to attach a photo or file (up to 10 MB)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              onChange={onFileChange}
              disabled={!props.canEdit}
              className="sr-only"
            />
          </label>
        )}
      </div>

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
