// BF_PORTAL_ACCEPT_NAME_v266
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildDocumentName } from "../AcceptNameDialog";

describe("accept document naming", () => {
  it("builds a clean name from the server parts and staff-entered period", () => {
    expect(buildDocumentName({
      businessName: "North Star Foods",
      documentType: "Bank Statement",
      period: null,
      extension: ".pdf",
    }, " July ")).toBe("North Star Foods - Bank Statement - July.pdf");
  });

  it("omits missing optional parts and defaults the extension", () => {
    expect(buildDocumentName({
      businessName: null,
      documentType: "Government ID",
      period: null,
      extension: "",
    }, "  ")).toBe("Government ID.pdf");
  });

  it("wires both row and review-pane accepts through the naming dialog", () => {
    const tab = fs.readFileSync(path.resolve(__dirname, "../../../pages/applications/tabs/DocumentsTab.tsx"), "utf8");
    expect(tab).toContain("<AcceptNameDialog");
    expect(tab).toContain("fromPane: false");
    expect(tab).toContain("fromPane: true");
    expect(tab).toContain("displayName ? { displayName } : {}");
  });
});
