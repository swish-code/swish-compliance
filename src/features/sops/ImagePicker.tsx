"use client";

import { useRef, useState } from "react";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export default function ImagePicker({
  name = "image_file",
  initialPreviewUrl,
}: {
  name?: string;
  initialPreviewUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialPreviewUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function pick() {
    inputRef.current?.click();
  }

  function reset() {
    setPreview(null);
    setError(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      reset();
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 2 MB.`);
      reset();
      return;
    }
    if (!ACCEPT.split(",").includes(file.type)) {
      setError(`Unsupported type: ${file.type}.`);
      reset();
      return;
    }
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
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

      {preview ? (
        <div className="border border-gray-200 rounded-lg p-3 bg-white">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="SOP preview"
              className="w-32 h-32 object-cover rounded-md border border-gray-200"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {fileName ?? "Current image"}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Click the image to replace, or remove below.
              </p>
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
          <div className="text-3xl mb-2">🖼️</div>
          <div className="text-sm font-medium text-gray-700">
            Drop an image here, or click to pick
          </div>
          <div className="text-xs text-gray-500 mt-1">
            PNG, JPG, WEBP or GIF · up to 2 MB
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
