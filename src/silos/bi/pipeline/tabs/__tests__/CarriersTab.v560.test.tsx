// BF_PORTAL_BLOCK_v560_BI_SEND_TO_CARRIER
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { carrierLabel } from "../CarriersTab";

const base = { id: "c1", carrier: "TerrAssure", product_name: "Contractors Pollution Liability", notes: "", instant_bind: false,
  submission_email: null, submission_url: null, verified: false };

describe("v560 Carriers tab", () => {
  it("tells staff how each carrier will be reached", () => {
    expect(carrierLabel(base)).toBe("TerrAssure - Contractors Pollution Liability (name unverified, no contact on file)");
    expect(carrierLabel({ ...base, carrier: "CFC", instant_bind: true, verified: true, submission_email: "subs@cfc.example" }))
      .toBe("CFC - Contractors Pollution Liability (instant bind, email)");
    expect(carrierLabel({ ...base, submission_url: "https://portal.example" })).toContain("portal");
  });
  it("is a tab on the BI application", () => {
    const page = readFileSync("src/silos/bi/pipeline/BIApplicationDetail.tsx", "utf-8");
    expect(page).toContain('{ key: "carriers", label: "Carriers" }');
    expect(page).toContain('<CarriersTab applicationId={app.id} readOnly={isReadOnly} />');
    const tab = readFileSync("src/silos/bi/pipeline/tabs/CarriersTab.tsx", "utf-8");
    expect(tab).toContain("/carrier-options");
    expect(tab).toContain("/send-to-carrier");
  });
});
