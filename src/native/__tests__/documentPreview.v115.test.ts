// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { extensionOf, findPreviewTarget, installDocumentPreview, isPreviewableHref } from "../documentPreviewDelegate";

describe("v115 document preview delegate", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("reads extensions off URLs with query and hash", () => {
    expect(extensionOf("https://x.ca/files/bank.PDF?token=1")).toBe("pdf");
    expect(extensionOf("https://x.ca/files/sheet.xlsx#page=2")).toBe("xlsx");
    expect(extensionOf("https://x.ca/files/noext")).toBe("");
  });

  it("recognises previewable hrefs", () => {
    expect(isPreviewableHref("https://x.ca/a.pdf")).toBe(true);
    expect(isPreviewableHref("https://x.ca/a.docx")).toBe(true);
    expect(isPreviewableHref("https://x.ca/a.zip")).toBe(false);
    expect(isPreviewableHref("blob:https://x.ca/abc")).toBe(false);
    expect(isPreviewableHref("")).toBe(false);
  });

  it("walks up from a nested child and prefers explicit sources", () => {
    document.body.innerHTML = '<a href="https://x.ca/statement.pdf"><span id="kid">Statement</span></a>';
    expect(findPreviewTarget(document.getElementById("kid"))).toBe("https://x.ca/statement.pdf");
    document.body.innerHTML = '<div data-preview-src="https://x.ca/override.pdf"><button id="b">Open</button></div>';
    expect(findPreviewTarget(document.getElementById("b"))).toBe("https://x.ca/override.pdf");
  });

  it("returns null for non-document links", () => {
    document.body.innerHTML = '<a href="/crm/contacts" id="nav">Contacts</a>';
    expect(findPreviewTarget(document.getElementById("nav"))).toBeNull();
  });

  it("intercepts on device, but not off device or after uninstall", () => {
    document.body.innerHTML = '<a href="https://x.ca/statement.pdf" id="doc">Doc</a>';
    const link = document.getElementById("doc") as HTMLElement;
    const open = vi.fn();
    const uninstall = installDocumentPreview({ isNative: () => true, open });
    const intercepted = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(intercepted);
    expect(open).toHaveBeenCalledWith("https://x.ca/statement.pdf");
    expect(intercepted.defaultPrevented).toBe(true);
    uninstall();
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(open).toHaveBeenCalledTimes(1);

    const webOpen = vi.fn();
    const removeWeb = installDocumentPreview({ isNative: () => false, open: webOpen });
    const webEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(webEvent);
    expect(webOpen).not.toHaveBeenCalled();
    expect(webEvent.defaultPrevented).toBe(false);
    removeWeb();
  });
});
