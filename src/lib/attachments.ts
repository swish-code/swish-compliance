import "server-only";

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_ATTACHMENT_MIMES = new Set([
  // Images
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  // PDF
  "application/pdf",
  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // PowerPoint
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Plain text & CSV
  "text/plain",
  "text/csv",
]);

export type ExtractedFile = {
  dataUrl: string;
  name: string;
  mime: string;
} | null;

/**
 * Read a single File from a FormData field, validate it, and produce a
 * base64 data URL plus original name + mime for storage. Returns null when
 * the field is missing or empty. Throws a clear error when the file is too
 * large or of an unsupported type.
 */
export async function extractAttachment(
  formData: FormData,
  fieldName: string
): Promise<ExtractedFile> {
  const entry = formData.get(fieldName);
  if (!(entry instanceof File)) return null;
  if (entry.size === 0) return null;
  if (entry.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `File is too large. Max ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB.`
    );
  }
  if (!ALLOWED_ATTACHMENT_MIMES.has(entry.type)) {
    throw new Error(
      `Unsupported file type "${entry.type || "unknown"}". ` +
        `Allowed: PDF, Word, Excel, PowerPoint, image, text, CSV.`
    );
  }
  const buffer = Buffer.from(await entry.arrayBuffer());
  return {
    dataUrl: `data:${entry.type};base64,${buffer.toString("base64")}`,
    name: entry.name || "attachment",
    mime: entry.type,
  };
}

/**
 * Plural variant — pull every File entry under the same field name and
 * validate each. <input type="file" multiple> posts multiple entries
 * under the same name; formData.getAll() returns the array.
 *
 * Validation is done per-file so a 6-file upload where ONE file is over
 * the limit fails with a clear error and the other 5 are not silently
 * dropped at the storage layer.
 *
 * Includes `size` so the caller (and the audit_attachments table) can
 * record how big each file was.
 */
export type ExtractedMultiFile = {
  dataUrl: string;
  name: string;
  mime: string;
  size: number;
};

export async function extractAttachments(
  formData: FormData,
  fieldName: string
): Promise<ExtractedMultiFile[]> {
  const entries = formData.getAll(fieldName);
  const out: ExtractedMultiFile[] = [];
  for (const entry of entries) {
    if (!(entry instanceof File)) continue;
    if (entry.size === 0) continue;
    if (entry.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(
        `"${entry.name}" is too large. Max ${Math.round(
          MAX_ATTACHMENT_BYTES / 1024 / 1024
        )} MB per file.`
      );
    }
    if (!ALLOWED_ATTACHMENT_MIMES.has(entry.type)) {
      throw new Error(
        `"${entry.name}" has unsupported type "${entry.type || "unknown"}". ` +
          `Allowed: PDF, Word, Excel, PowerPoint, image, text, CSV.`
      );
    }
    const buffer = Buffer.from(await entry.arrayBuffer());
    out.push({
      dataUrl: `data:${entry.type};base64,${buffer.toString("base64")}`,
      name: entry.name || "attachment",
      mime: entry.type,
      size: entry.size,
    });
  }
  return out;
}
