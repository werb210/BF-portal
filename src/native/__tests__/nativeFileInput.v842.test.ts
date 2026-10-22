// BF_PORTAL_v842_MAC_FILE_PICKER - on a Mac, file inputs go to the app's own picker (WebKit's crashed on OneDrive files).
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  attachNativeFileInputs, chooseWithNativePicker, installNativeFileInputs, pickedToFiles,
  type NativeFilePickerPlugin, type PickedFile,
} from "../nativeFileInput";

const picked: PickedFile[] = [
  { name: "statement.pdf", mimeType: "application/pdf", size: 3, webPath: "capacitor://localhost/_capacitor_file_/a/statement.pdf" },
  { name: "id.png", mimeType: "image/png", size: 2, webPath: "capacitor://localhost/_capacitor_file_/a/id.png" },
];
const fakeFetch = (async (url: string) => new Response(url.endsWith(".pdf") ? "pdf" : "pg")) as unknown as typeof fetch;
const plugin = (onMac: boolean, files: PickedFile[] = picked): NativeFilePickerPlugin => ({
  status: vi.fn(async () => ({ onMac })),
  pick: vi.fn(async () => ({ files })),
});

let detach: (() => void) | null = null;
afterEach(() => { detach?.(); detach = null; document.body.innerHTML = ""; });

describe("Mac file picker", () => {
  it("reads picked files into File objects with their names and types", async () => {
    const files = await pickedToFiles(picked, fakeFetch);
    expect(files.map((f) => [f.name, f.type, f.size])).toEqual([["statement.pdf", "application/pdf", 3], ["id.png", "image/png", 2]]);
  });

  it("a click on a file input opens the app's picker, fills the input and fires change", async () => {
    const p = plugin(true);
    const input = document.createElement("input");
    input.type = "file"; input.multiple = true; input.accept = ".pdf,image/*";
    document.body.appendChild(input);
    const changed = vi.fn();
    input.addEventListener("change", changed);
    detach = attachNativeFileInputs({ plugin: p, fetchImpl: fakeFetch });
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    input.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true); // WebKit's picker never opens
    await vi.waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
    expect(p.pick).toHaveBeenCalledWith({ multiple: true, accept: ".pdf,image/*" });
    expect(Array.from(input.files ?? []).map((f) => f.name)).toEqual(["statement.pdf", "id.png"]);
  });

  it("cancelling changes nothing", async () => {
    const input = document.createElement("input");
    input.type = "file";
    const changed = vi.fn();
    input.addEventListener("change", changed);
    expect(await chooseWithNativePicker(input, { plugin: plugin(true, []), fetchImpl: fakeFetch })).toBe(false);
    expect(changed).not.toHaveBeenCalled();
  });

  it("leaves other inputs and the iPad alone", async () => {
    const p = plugin(true);
    detach = attachNativeFileInputs({ plugin: p, fetchImpl: fakeFetch });
    const text = document.createElement("input");
    document.body.appendChild(text);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    text.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
    expect(p.pick).not.toHaveBeenCalled();
    expect(await installNativeFileInputs({ plugin: plugin(false), isNativeIos: () => true })).toBe(false); // iPad
    expect(await installNativeFileInputs({ plugin: plugin(true), isNativeIos: () => false })).toBe(false); // browser
  });

  it("an older app build without the plugin keeps WebKit's picker", async () => {
    const old: NativeFilePickerPlugin = { status: vi.fn(async () => { throw new Error("not implemented"); }), pick: vi.fn() };
    expect(await installNativeFileInputs({ plugin: old, isNativeIos: () => true })).toBe(false);
  });
});
