// BF_PORTAL_BLOCK_v113_IPAD_PENCIL_QUICKLOOK_CARDSCAN
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(__dirname, "../..");
const swift = fs.readFileSync(path.join(root, "ios/App/App/IPadWorkstationPlugin.swift"), "utf8");
const plist = fs.readFileSync(path.join(root, "ios/App/App/Info.plist"), "utf8");

describe("IPadWorkstation native plugin", () => {
  it("bridges under the registered jsName", () => expect(swift).toContain('public let jsName = "IPadWorkstation"'));
  it("declares all methods", () => ["preview", "annotate", "scanCard"].forEach((method) => expect(swift).toContain(`CAPPluginMethod(name: "${method}"`)));
  it("imports required frameworks", () => ["QuickLook", "PencilKit", "PDFKit", "Vision", "VisionKit"].forEach((framework) => expect(swift).toContain(`import ${framework}`)));
  it("keeps calls alive", () => { expect(swift).toContain("call.keepAlive = true"); expect(swift).toContain("bridge?.saveCall(call)"); });
  it("accepts finger input", () => expect(swift).toContain("drawingPolicy = .anyInput"));
});

describe("Info.plist supports document handoff", () => {
  it("exposes documents", () => { expect(plist).toMatch(/<key>UIFileSharingEnabled<\/key>\s*<true\/>/); expect(plist).toMatch(/<key>LSSupportsOpeningDocumentsInPlace<\/key>\s*<true\/>/); });
  it("declares photo purpose", () => expect(plist).toContain("NSPhotoLibraryAddUsageDescription"));
  it("permits multitasking", () => { expect(plist).toMatch(/<key>UIRequiresFullScreen<\/key>\s*<false\/>/); expect(plist).toMatch(/<key>UIApplicationSupportsMultipleScenes<\/key>\s*<true\/>/); });
});
