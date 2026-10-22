// BF_PORTAL_v842_MAC_FILE_PICKER - on a Mac, file inputs use the app's own picker instead of WebKit's.
// The iPad app running on a Mac crashed when files were chosen from OneDrive: the crash was inside WebKit's file
// picker (WKFileUploadPanel, "index 0 beyond bounds for empty array"), before any of our code ran. On a Mac every
// <input type="file"> click is caught here and sent to NativeFilePicker (asks the system for copies, so cloud files
// are downloaded first); the chosen files are put into the input and its change event fires, so each screen's own
// upload code runs unchanged. iPads keep WebKit's picker (camera and photo options). Older app builds without the
// plugin keep the old behaviour.
import { Capacitor, registerPlugin } from "@capacitor/core";

// BF_PORTAL_v843_MAC_UPLOADS - the app now sends the file contents (base64 "data"); webPath is the older v842 answer.
export type PickedFile = { name: string; mimeType: string; size: number; data?: string; webPath?: string };
export type PickFailure = { name: string; reason: string };
export interface NativeFilePickerPlugin {
  status(): Promise<{ onMac: boolean }>;
  pick(options: { multiple: boolean; accept: string }): Promise<{ files: PickedFile[]; failed?: PickFailure[] }>;
}
export const NativeFilePicker = registerPlugin<NativeFilePickerPlugin>("NativeFilePicker");

export type NativeFileInputDeps = {
  plugin?: NativeFilePickerPlugin;
  fetchImpl?: typeof fetch;
  doc?: Document;
  onError?: (err: unknown) => void;
  /** BF_PORTAL_v843_MAC_UPLOADS - tells the person when something could not be read (window.alert by default). */
  notify?: (message: string) => void;
};

const defaultNotify = (message: string) => { try { window.alert(message); } catch { /* no alert available */ } };

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** Reads the picked files (served by the app at their webPath) into File objects. */
export async function pickedToFiles(picked: PickedFile[], fetchImpl: typeof fetch = fetch): Promise<File[]> {
  const out: File[] = [];
  for (const p of picked) {
    if (p?.data) { // BF_PORTAL_v843_MAC_UPLOADS
      out.push(new File([base64ToBytes(p.data)], p.name || "file", { type: p.mimeType || "application/octet-stream" }));
      continue;
    }
    if (!p?.webPath) continue;
    const res = await fetchImpl(p.webPath);
    if (!res.ok) throw new Error(`Could not read ${p.name} (${res.status})`);
    const data = await res.arrayBuffer();
    out.push(new File([data], p.name || "file", { type: p.mimeType || res.headers.get("content-type") || "application/octet-stream" }));
  }
  return out;
}

/** Puts files into an input and fires input + change, as if the user had chosen them in the browser's picker. */
export function setInputFiles(input: HTMLInputElement, files: File[]): void {
  let list: FileList | File[] = files;
  if (typeof DataTransfer !== "undefined") {
    try {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      list = dt.files;
    } catch {
      list = files;
    }
  }
  try {
    input.files = list as FileList;
  } catch {
    Object.defineProperty(input, "files", { value: list, configurable: true });
  }
  if (input.files !== list) Object.defineProperty(input, "files", { value: list, configurable: true });
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export async function chooseWithNativePicker(input: HTMLInputElement, deps: NativeFileInputDeps = {}): Promise<boolean> {
  const plugin = deps.plugin ?? NativeFilePicker;
  const notify = deps.notify ?? defaultNotify;
  const { files, failed } = await plugin.pick({ multiple: input.multiple, accept: input.accept || "" });
  if (failed?.length) notify(`Could not open ${failed.map((f) => `${f.name} (${f.reason})`).join(", ")}. If it is in OneDrive or iCloud, check you are online and try again.`);
  if (!files?.length) return false; // cancelled, or nothing could be read
  const list = await pickedToFiles(files, deps.fetchImpl);
  if (!list.length) return false;
  setInputFiles(input, list);
  if (!input.files || input.files.length === 0) {
    notify("The files were read but could not be attached. Please try again, or drag the files onto the page.");
    return false;
  }
  return true;
}

/** Sends every file-input click in the document to the native picker. Returns a function that removes it. */
export function attachNativeFileInputs(deps: NativeFileInputDeps = {}): () => void {
  const doc = deps.doc ?? document;
  const notify = deps.notify ?? defaultNotify;
  // BF_PORTAL_v843_MAC_UPLOADS - never fail silently: v842 logged to the console only, so "nothing happened".
  const onError = deps.onError ?? ((err: unknown) => {
    console.error("[native file picker] failed", err);
    notify(`The file could not be attached: ${err instanceof Error ? err.message : String(err)}`);
  });
  const handler = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "file" || target.disabled) return;
    event.preventDefault(); // stops WebKit's own picker
    void chooseWithNativePicker(target, deps).catch(onError);
  };
  doc.addEventListener("click", handler, true);
  return () => doc.removeEventListener("click", handler, true);
}

/** Startup: only in the app on a Mac, and only when this build has the plugin. Never throws. */
export async function installNativeFileInputs(deps: NativeFileInputDeps & { isNativeIos?: () => boolean } = {}): Promise<boolean> {
  const isNativeIos = deps.isNativeIos ?? (() => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios");
  if (!isNativeIos()) return false;
  try {
    const plugin = deps.plugin ?? NativeFilePicker;
    const status = await plugin.status();
    if (!status?.onMac) return false;
    attachNativeFileInputs(deps);
    try { document.documentElement.dataset.nativeFilePicker = "on"; } catch { /* BF_PORTAL_v843_MAC_UPLOADS - visible in Safari's inspector */ }
    return true;
  } catch {
    return false; // an app build from before this change: keep WebKit's picker
  }
}
