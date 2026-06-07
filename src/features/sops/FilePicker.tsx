"use client";

import { useRef, useState } from "react";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPT = [
  // Images
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  // PDF
  "application/pdf",
  // Word
  ".doc",
  ".docx",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Excel
  ".xls",
  ".xlsx",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // PowerPoint
  ".ppt",
  ".pptx",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Plain text & CSV
  "text/plain",
  "text/csv",
].join(",");

function iconFor(mime: string): string {
  if (mime.startsWith("image/")) return "🖼️";
  if (mime === "application/pdf") return "📄";
  if (mime.includes("word")) return "📝";
  if (mime.includes("excel") || mime.includes("spreadsheet")) return "📊";
  if (mime.includes("powerpoint") || mime.includes("presentation")) return "📑";
  if (mime.startsWith("text/")) return "📃";
  return "📎";
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FilePicker({
  name = "attachment_file",
}: {
  name?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<{
    name: string;
    size: number;
    mime: string;
    imagePreview: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick() {
    inputRef.current?.click();
  }

  function reset() {
    setPicked(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      reset();
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`File is too large (${humanSize(file.size)}). Max 10 MB.`);
      reset();
      return;
    }
    setError(null);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setPicked({
          name: file.name,
          size: file.size,
          mime: file.type,
          imagePreview: typeof reader.result === "string" ? reader.result : null,
        });
      };
      reader.readAsDataURL(file);
    } else {
      setPicked({
        name: file.name,
        size: file.size,
        mime: file.type,
        imagePreview: null,
      });
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !inputRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    inputRef.current.files = dt.files;
    inputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={ACCEPT}
        onChange={onChange}
        className="hidden"
      />

      {picked ? (
        <div className="border border-gray-200 rounded-lg p-3 bg-white">
          <div className="flex items-start gap-4">
            {picked.imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={picked.imagePreview}
                alt="preview"
                className="w-24 h-24 object-cover rounded-md border border-gray-200 shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center text-4xl shrink-0">
                {iconFor(picked.mime)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {picked.name}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {humanSize(picked.size)} · {picked.mime || "unknown type"}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={pick}
                  className="text-xs px-3 py-1 border border-gray-300 hover:bg-gray-50 rounded-md"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="text-xs px-3 py-1 border border-red-200 text-red-600 hover:bg-red-50 rounded-md"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={pick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              pick();
            }
          }}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-50/30 transition-colors"
        >
          <div className="text-3xl mb-2">📎</div>
          <div className="text-sm font-medium text-gray-700">
            Drop a file here, or click to pick
          </div>
          <div className="text-xs text-gray-500 mt-1">
            PDF · Word · Excel · PowerPoint · Image · CSV · TXT — up to 10 MB
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
