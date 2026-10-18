// BF_PORTAL_v823_PENCIL / BF_PORTAL_v823_KEYBOARD - Mark up / Sign naming and gating, and the iPad hardware-keyboard
// shortcut names the native key commands send.
import { describe, expect, it } from "vitest";
import { blobToBase64, canMarkUp, markedUpName } from "@/native/markupDocument";
import { resolveNativeShortcut } from "@/hooks/useCommandShortcuts";
import { NATIVE_GO_TO } from "@/hooks/useKeyboardShortcuts";

describe("v823 Mark up / Sign", () => {
  it("names the signed copy after the original", () => {
    expect(markedUpName("Bank statement March.pdf")).toBe("Bank statement March (signed).pdf");
    expect(markedUpName("TERM SHEET.PDF")).toBe("TERM SHEET (signed).pdf");
    expect(markedUpName(null)).toBe("Document (signed).pdf");
  });

  it("only offers mark-up for a loaded PDF in the iPad app", () => {
    expect(canMarkUp({ isPdf: true, hasBlob: true, native: true })).toBe(true);
    expect(canMarkUp({ isPdf: true, hasBlob: true, native: false })).toBe(false);
    expect(canMarkUp({ isPdf: false, hasBlob: true, native: true })).toBe(false);
    expect(canMarkUp({ isPdf: true, hasBlob: false, native: true })).toBe(false);
    expect(canMarkUp({ isPdf: true, hasBlob: true })).toBe(false); // the test runner is not the iPad app
  });

  it("encodes the PDF for the native annotator", async () => {
    const encoded = await blobToBase64(new Blob([new Uint8Array([37, 80, 68, 70])]));
    expect(encoded).toBe("JVBERg==");
  });
});

describe("v823 iPad keyboard shortcuts", () => {
  it("Cmd+K focuses Maya and Cmd+1-4 switch application tabs", () => {
    expect(resolveNativeShortcut("focus-maya", "/pipeline")).toEqual({ type: "focus-maya" });
    expect(resolveNativeShortcut("tab-4", "/applications/abc-123/application")).toEqual({ type: "navigate", to: "/applications/abc-123/documents" });
    expect(resolveNativeShortcut("tab-2", "/pipeline")).toBeNull();
    expect(resolveNativeShortcut("tab-9", "/applications/abc/application")).toBeNull();
    expect(resolveNativeShortcut("rm -rf", "/applications/abc/application")).toBeNull();
  });

  it("Cmd+Shift go-to shortcuts use the same routes as the g-key shortcuts", () => {
    expect(NATIVE_GO_TO).toEqual({
      "go-dashboard": "/portal",
      "go-pipeline": "/pipeline",
      "go-crm": "/crm/contacts",
      "go-communications": "/communications",
      "go-tasks": "/tasks",
    });
  });
});

describe("v823 iPad notifications", () => {
  it("sends the iPad's APNs token as the portal-ios app", async () => {
    const { pushTokenBody, isApnsToken } = await import("@/native/portalPushToken");
    expect(pushTokenBody(" " + "ab".repeat(32) + " ")).toEqual({ token: "ab".repeat(32), app: "portal-ios", environment: "production" });
    expect(isApnsToken("ab".repeat(32))).toBe(true);
    expect(isApnsToken("not-a-token")).toBe(false);
    expect(isApnsToken(undefined)).toBe(false);
  });
});
