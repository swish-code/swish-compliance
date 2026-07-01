"use client";

import { useRef, useState, useTransition } from "react";
import {
  addCapaEvidenceAction,
  deleteCapaEvidenceAction,
} from "./actions";

type Evidence = {
  id: number;
  file_url: string;
  file_name: string;
  file_mime: string | null;
  file_size: number | null;
  uploaded_by_name: string | null;
  uploaded_at: string;
};

/**
 * The "CAPA Evidence" section on /capa/[id]. Only the owner can add or
 * remove files; other viewers see the list read-only so they can
 * download and inspect. Multi-file upload via a single <input>.
 */
export default function CapaEvidenceUploader({
  capaId,
  evidences,
  canEdit,
}: {
  capaId: number;
  evidences: Evidence[];
  canEdit: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickedCount, setPickedCount] = useState(0);

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPickedCount(e.target.files?.length ?? 0);
    setError(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await addCapaEvidenceAction(fd);
        if (inputRef.current) inputRef.current.value = "";
        setPickedCount(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      }
    });
  }

  function onDelete(evidenceId: number, name: string) {
    if (!window.confirm(`Remove "${name}"?`)) return;
    const fd = new FormData();
    fd.append("evidence_id", String(evidenceId));
    fd.append("capa_id", String(capaId));
    startTransition(async () => {
      try {
        await deleteCapaEvidenceAction(fd);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {evidences.length > 0 && (
        <ul className="space-y-1.5">
          {evidences.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 px-3 py-2 bg-emerald-50/60 border border-emerald-200 rounded-lg text-sm"
            >
              <span className="text-lg shrink-0">{iconForMime(e.file_mime)}</span>
              <a
                href={e.file_url}
                target="_blank"
                rel="noreferrer"
                download={e.file_name}
                className="font-medium text-emerald-800 hover:underline truncate flex-1"
                title={e.file_name}
              >
                {e.file_name}
              </a>
              <span className="text-[11px] text-emerald-700/70 shrink-0">
                {formatSize(e.file_size)}
              </span>
              <span className="text-[11px] text-emerald-700/70 shrink-0 hidden md:inline">
                {e.uploaded_by_name ?? "—"} ·{" "}
                {new Date(e.uploaded_at).toLocaleDateString()}
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onDelete(e.id, e.file_name)}
                  disabled={pending}
                  className="text-xs text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 shrink-0"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <form
          onSubmit={onSubmit}
          className="flex flex-wrap items-center gap-3 p-3 border border-dashed border-emerald-300 rounded-lg bg-white"
        >
          <input type="hidden" name="capa_id" value={capaId} />
          <input
            ref={inputRef}
            type="file"
            name="files"
            multiple
            onChange={onFilesChange}
            disabled={pending}
            className="text-xs text-gray-700 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-medium file:cursor-pointer hover:file:bg-emerald-100"
          />
          <button
            type="submit"
            disabled={pending || pickedCount === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-md text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending
              ? "Uploading…"
              : pickedCount > 0
              ? `Upload ${pickedCount} file${pickedCount === 1 ? "" : "s"}`
              : "Upload"}
          </button>
          <p className="text-[11px] text-gray-500 basis-full">
            Photos / PDFs / Word / Excel — up to 10 MB each. Multiple at once.
          </p>
        </form>
      )}

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {!canEdit && evidences.length === 0 && (
        <p className="text-xs text-gray-400">No CAPA evidence uploaded yet.</p>
      )}
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

function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
