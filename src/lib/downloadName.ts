// BF_PORTAL_DOWNLOAD_NAME_v382 - downloaded documents use the name staff
// assigned on acceptance rather than the storage key or original upload name.

const MIME_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/webp": "webp",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
};

function extOf(name: string | null | undefined): string | null {
  const match = /\.([A-Za-z0-9]{2,5})$/.exec((name ?? "").trim());
  return match?.[1]?.toLowerCase() ?? null;
}

/** Build a safe save name, retaining an extension from the original name or MIME type. */
export function fileDownloadName(
  name: string | null | undefined,
  originalFilename?: string | null,
  mimeType?: string | null,
): string {
  const cleaned = (name ?? "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const base = cleaned || (originalFilename ?? "").trim() || "document";
  if (extOf(base)) return base;

  const normalizedMime = (mimeType?.split(";")[0] ?? "").trim().toLowerCase();
  const extension = extOf(originalFilename) ?? MIME_EXT[normalizedMime] ?? null;
  return extension ? `${base}.${extension}` : base;
}

/** Save a blob under the supplied name and release its temporary URL afterward. */
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
