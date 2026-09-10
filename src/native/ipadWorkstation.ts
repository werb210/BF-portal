// BF_PORTAL_BLOCK_v113_IPAD_PENCIL_QUICKLOOK_CARDSCAN
import { Capacitor, registerPlugin } from "@capacitor/core";

export type PreviewResult = { dismissed: boolean };
export type AnnotateResult = { cancelled: boolean; data?: string };
export type ScanCardResult = { cancelled: boolean; lines: string[] };

export interface IPadWorkstationPlugin {
  preview(options: { data: string; filename?: string }): Promise<PreviewResult>;
  annotate(options: { data: string; filename?: string }): Promise<AnnotateResult>;
  scanCard(): Promise<ScanCardResult>;
}

const native = registerPlugin<IPadWorkstationPlugin>("IPadWorkstation");

export function isNativeWorkstation(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export async function toBase64(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  // Chunked: String.fromCharCode(...bytes) blows the call stack on large PDFs.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Quick Look on iPad; a new browser tab everywhere else. */
export async function previewFile(file: Blob, filename?: string): Promise<PreviewResult> {
  if (!isNativeWorkstation()) {
    const url = URL.createObjectURL(file);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return { dismissed: true };
  }
  return native.preview({ data: await toBase64(file), filename });
}

/** Pencil markup. Web has no equivalent, so it reports cancelled rather than throwing. */
export async function annotateFile(file: Blob, filename?: string): Promise<AnnotateResult> {
  if (!isNativeWorkstation()) return { cancelled: true };
  return native.annotate({ data: await toBase64(file), filename });
}

export async function scanBusinessCard(): Promise<ScanCardResult> {
  if (!isNativeWorkstation()) return { cancelled: true, lines: [] };
  return native.scanCard();
}
