// v115-doc-preview
import { isNativeIPad, previewDocument } from "./ipadDocuments";

export const PREVIEWABLE_EXTENSIONS = [
  "pdf", "png", "jpg", "jpeg", "heic", "gif", "webp", "txt", "csv", "rtf",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx",
];

export function extensionOf(href: string): string {
  const noQuery = (href || "").split("?")[0] ?? "";
  const clean = noQuery.split("#")[0] ?? "";
  const last = clean.split("/").pop() || "";
  const dot = last.lastIndexOf(".");
  return dot < 0 ? "" : last.slice(dot + 1).toLowerCase();
}

export function isPreviewableHref(href: string): boolean {
  if (!href || href.startsWith("blob:") || href.startsWith("data:")) return false;
  return PREVIEWABLE_EXTENSIONS.includes(extensionOf(href));
}

export function findPreviewTarget(start: Element | null): string | null {
  let element = start;
  let depth = 0;
  while (element && depth < 8) {
    const explicit = element.getAttribute("data-preview-src");
    if (explicit) return explicit;
    if (element.tagName === "A") {
      const href = element.getAttribute("href") || "";
      if (isPreviewableHref(href)) return href;
    }
    element = element.parentElement;
    depth += 1;
  }
  return null;
}

export type PreviewDelegateOptions = {
  isNative?: () => boolean;
  open?: (src: string) => unknown;
  root?: Document;
};

export function installDocumentPreview(options: PreviewDelegateOptions = {}): () => void {
  const root = options.root || (typeof document !== "undefined" ? document : null);
  if (!root) return () => undefined;
  const isNative = options.isNative || isNativeIPad;
  const open = options.open || ((src: string) => void previewDocument({ url: src }));
  const handler = (event: Event) => {
    if (!isNative()) return;
    const src = findPreviewTarget(event.target as Element | null);
    if (!src) return;
    event.preventDefault();
    open(src);
  };
  root.addEventListener("click", handler, true);
  return () => root.removeEventListener("click", handler, true);
}
