// BF_PORTAL_DROPZONE_WIRE_v2
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "../CompaniesImportModal.tsx"), "utf8");
const contacts = fs.readFileSync(
  path.resolve(__dirname, "../../contacts/ImportContactsModal.tsx"), "utf8");

describe("companies import accepts a dropped CSV", () => {
  it("does not call a handler this modal never had", () => {
    // v1 copied onFile() from the contacts modal; it does not exist here.
    expect(src).not.toContain("onFile(");
  });

  it("shares one parser between the input and the drop zone", () => {
    expect(src).toContain("function ingestFile(f: File)");
    expect(src).toContain("ingestFile(files[0])");
    // onPick delegates rather than duplicating the FileReader logic.
    expect(src).toMatch(/function onPick[\s\S]{0,200}ingestFile\(f\)/);
    expect(src.match(/new FileReader\(\)/g)?.length).toBe(1);
  });

  it("keeps the button alongside the drop target", () => {
    expect(src).toContain("Choose CSV…");
  });

  it("leaves the contacts modal on its own handler", () => {
    // Two modals, two shapes; the fix must not homogenise them by accident.
    expect(contacts).toContain("void onFile(files[0])");
  });
});
