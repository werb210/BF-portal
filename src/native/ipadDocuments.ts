// v115-ipad-documents
// Thin, self-contained bridge to the IPadWorkstation native plugin for
// multi-page annotation and Quick Look preview. Web falls back gracefully.
import { Capacitor, registerPlugin } from "@capacitor/core";

export type DocumentTarget = {
  path?: string;
  url?: string;
  data?: string;
  name?: string;
};

export type AnnotateAllResult = { path: string; pages: number; cancelled: boolean };
export type PreviewResult = { shown: boolean };

type IPadDocumentsPlugin = {
  annotateAll(options: DocumentTarget): Promise<AnnotateAllResult>;
  previewDocument(options: DocumentTarget): Promise<PreviewResult>;
};

let cached: IPadDocumentsPlugin | null = null;

function plugin(): IPadDocumentsPlugin {
  cached ??= registerPlugin<IPadDocumentsPlugin>("IPadWorkstation");
  return cached;
}

export function isNativeIPad(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}

export async function annotateAllPages(target: DocumentTarget): Promise<AnnotateAllResult> {
  if (!isNativeIPad()) return { path: "", pages: 0, cancelled: true };
  try {
    return await plugin().annotateAll(target);
  } catch {
    return { path: "", pages: 0, cancelled: true };
  }
}

export async function previewDocument(target: DocumentTarget): Promise<PreviewResult> {
  if (!isNativeIPad()) {
    const src = target.path || target.url || "";
    if (src && typeof window !== "undefined") {
      window.open(src, "_blank", "noopener,noreferrer");
      return { shown: true };
    }
    return { shown: false };
  }
  try {
    return await plugin().previewDocument(target);
  } catch {
    return { shown: false };
  }
}
