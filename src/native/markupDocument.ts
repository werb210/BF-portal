// BF_PORTAL_v823_PENCIL - "Mark up / Sign" for PDFs on the iPad app. The native IPadWorkstation annotator
// (MultiPageAnnotatorViewController: Apple Pencil on every page) was built in v115 but no screen ever opened it. The
// marked-up copy comes back as a file; the caller uploads it next to the original, so nothing is overwritten.
import { Capacitor } from "@capacitor/core";
import { annotateAllPages, isNativeIPad } from "./ipadDocuments";

export function markedUpName(filename: string | null | undefined): string {
  const base = (filename ?? "").trim().replace(/\.pdf$/i, "") || "Document";
  return `${base} (signed).pdf`;
}

export function canMarkUp(input: { isPdf: boolean; hasBlob: boolean; native?: boolean }): boolean {
  return input.isPdf && input.hasBlob && (input.native ?? isNativeIPad());
}

function readBytes(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsArrayBuffer(blob);
  });
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await readBytes(blob));
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

/** Opens the Pencil annotator; resolves with the marked-up PDF, or null when cancelled. */
export async function markUpPdf(blob: Blob, filename: string | null | undefined): Promise<File | null> {
  const data = await blobToBase64(blob);
  const result = await annotateAllPages({ data, name: `markup-${Date.now()}.pdf` });
  if (result.cancelled || !result.path) return null;
  const response = await fetch(Capacitor.convertFileSrc(result.path));
  if (!response.ok) throw new Error("Couldn't read the marked-up file.");
  const marked = await response.blob();
  return new File([marked], markedUpName(filename), { type: "application/pdf" });
}
