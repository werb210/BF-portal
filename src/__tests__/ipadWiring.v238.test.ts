// BF_PORTAL_IPAD_WIRING_v238
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { COMMAND_SHORTCUTS, resolveCommandShortcut } from "@/hooks/useCommandShortcuts";

const root = path.resolve(__dirname, "../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const key = (k: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }> = {}) =>
  ({ key: k, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...mods });

describe("iPad plugin registration", () => {
  it("registers IPadWorkstationPlugin with the bridge", () => {
    expect(read("ios/App/App/BorealBridgeViewController.swift")).toContain("registerPluginInstance(IPadWorkstationPlugin())");
  });
  it("still registers the widget bridge", () => {
    expect(read("ios/App/App/BorealBridgeViewController.swift")).toContain("registerPluginInstance(WidgetBridgePlugin())");
  });
});

describe("Cmd shortcuts", () => {
  it("Cmd K focuses Maya anywhere", () => {
    expect(resolveCommandShortcut(key("k", { metaKey: true }), "/pipeline")).toEqual({ type: "focus-maya" });
    expect(resolveCommandShortcut(key("K", { ctrlKey: true }), "/crm/contacts")).toEqual({ type: "focus-maya" });
  });
  it("Cmd 1-4 switch application tabs on an application", () => {
    const at = "/applications/abc-123/notes";
    expect(resolveCommandShortcut(key("1", { metaKey: true }), at)).toEqual({ type: "navigate", to: "/applications/abc-123/application" });
    expect(resolveCommandShortcut(key("2", { metaKey: true }), at)).toEqual({ type: "navigate", to: "/applications/abc-123/banking-analysis" });
    expect(resolveCommandShortcut(key("3", { metaKey: true }), at)).toEqual({ type: "navigate", to: "/applications/abc-123/financials" });
    expect(resolveCommandShortcut(key("4", { metaKey: true }), at)).toEqual({ type: "navigate", to: "/applications/abc-123/documents" });
  });
  it("does nothing off an application, without a modifier, or with extra modifiers", () => {
    expect(resolveCommandShortcut(key("1", { metaKey: true }), "/pipeline")).toBeNull();
    expect(resolveCommandShortcut(key("k"), "/pipeline")).toBeNull();
    expect(resolveCommandShortcut(key("k", { metaKey: true, shiftKey: true }), "/pipeline")).toBeNull();
    expect(resolveCommandShortcut(key("5", { metaKey: true }), "/applications/x")).toBeNull();
  });
  it("is mounted, has a Maya target, and is listed in the help overlay", () => {
    expect(read("src/App.tsx")).toContain("useCommandShortcuts();");
    expect(read("src/components/maya/MayaCommandBar.tsx")).toContain("data-maya-command");
    expect(read("src/components/ShortcutHelp.tsx")).toContain("COMMAND_SHORTCUTS");
    expect(COMMAND_SHORTCUTS.map((s) => s.keys)).toEqual(["Cmd K", "Cmd 1", "Cmd 2", "Cmd 3", "Cmd 4"]);
  });
});

describe("drop files onto application documents", () => {
  const tab = read("src/pages/applications/tabs/DocumentsTab.tsx");
  it("accepts drops on the tab and stages them in the upload dialog", () => {
    expect(tab).toContain("onDrop={onDocumentsDrop}");
    expect(tab).toContain("setDroppedFiles(files);");
    expect(tab).toContain("droppedFiles.length > 0 ? droppedFiles");
  });
  it("clears staged files when the dialog closes or the upload finishes", () => {
    expect(tab).not.toContain("onClick={() => setUploadOpen(false)}");
    expect(tab).toContain("setDroppedFiles([]);");
  });
});
