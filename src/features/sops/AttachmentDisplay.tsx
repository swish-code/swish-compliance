function iconFor(mime: string): string {
  if (mime.startsWith("image/")) return "🖼️";
  if (mime === "application/pdf") return "📄";
  if (mime.includes("word")) return "📝";
  if (mime.includes("excel") || mime.includes("spreadsheet")) return "📊";
  if (mime.includes("powerpoint") || mime.includes("presentation")) return "📑";
  if (mime.startsWith("text/")) return "📃";
  return "📎";
}

function labelFor(mime: string): string {
  if (mime.startsWith("image/")) return "Image";
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("word")) return "Word document";
  if (mime.includes("excel") || mime.includes("spreadsheet")) return "Excel spreadsheet";
  if (mime.includes("powerpoint") || mime.includes("presentation")) return "PowerPoint";
  if (mime === "text/csv") return "CSV";
  if (mime.startsWith("text/")) return "Text";
  return "Attachment";
}

export default function AttachmentDisplay({
  dataUrl,
  name,
  mime,
}: {
  dataUrl: string;
  name: string | null;
  mime: string | null;
}) {
  const safeName = name ?? "attachment";
  const safeMime = mime ?? "";

  // 1) Image — inline render
  if (safeMime.startsWith("image/")) {
    return (
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          alt={safeName}
          className="max-w-full max-h-96 rounded-lg border border-gray-200 object-contain bg-gray-50"
        />
        <a
          href={dataUrl}
          download={safeName}
          className="inline-block mt-2 text-xs text-brand-700 hover:underline"
        >
          ⬇ Download {safeName}
        </a>
      </div>
    );
  }

  // 2) PDF — inline embed + download
  if (safeMime === "application/pdf") {
    return (
      <div className="space-y-2">
        <object
          data={dataUrl}
          type="application/pdf"
          className="w-full h-[600px] rounded-lg border border-gray-200"
        >
          <p className="text-sm text-gray-600 p-4">
            Your browser can&apos;t preview this PDF inline.
          </p>
        </object>
        <a
          href={dataUrl}
          download={safeName}
          className="inline-block text-xs text-brand-700 hover:underline"
        >
          ⬇ Download {safeName}
        </a>
      </div>
    );
  }

  // 3) Everything else — file card with download link
  return (
    <a
      href={dataUrl}
      download={safeName}
      className="inline-flex items-center gap-4 bg-gray-50 border border-gray-200 hover:border-brand-500 hover:bg-brand-50/30 rounded-lg p-4 transition-colors"
    >
      <div className="text-4xl">{iconFor(safeMime)}</div>
      <div>
        <div className="text-sm font-medium text-gray-900">{safeName}</div>
        <div className="text-xs text-gray-500">
          {labelFor(safeMime)} · click to download
        </div>
      </div>
    </a>
  );
}
