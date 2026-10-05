// BF_PORTAL_LENDER_SBA_IVES_v747
import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import SbaIvesFields, { EMPTY_SBA, sbaMissing, type LenderSba } from "../SbaIvesFields";

function Harness() {
  const [v, setV] = useState<LenderSba>(EMPTY_SBA);
  return <SbaIvesFields value={v} onChange={setV} />;
}

describe("Do you offer SBA loans?", () => {
  it("asks for the IVES details only when the answer is yes", () => {
    render(<Harness />);
    expect(screen.queryByLabelText("IVES participant ID")).toBeNull();
    fireEvent.change(screen.getByLabelText("Do you offer SBA loans?"), { target: { value: "yes" } });
    expect(screen.getByLabelText("IVES participant name")).toBeTruthy();
    expect(screen.getByLabelText("IVES participant ID")).toBeTruthy();
    expect(screen.getByLabelText("SOR mailbox ID")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("IVES participant name, IVES participant ID, SOR mailbox ID");
    fireEvent.change(screen.getByLabelText("Do you offer SBA loans?"), { target: { value: "no" } });
    expect(screen.queryByLabelText("IVES participant ID")).toBeNull();
  });
  it("requires the three 4506-C fields only for a lender that offers SBA", () => {
    expect(sbaMissing({ ...EMPTY_SBA, offersSba: false })).toEqual([]);
    expect(sbaMissing({ ...EMPTY_SBA, offersSba: true, ivesParticipantName: "A", ivesParticipantId: "1", ivesSorMailboxId: "M" })).toEqual([]);
  });
  it("is on the staff Edit Lender form and the lender's own portal profile", () => {
    const staff = readFileSync("src/pages/lenders/LendersPage.tsx", "utf8");
    expect(staff).toContain("<SbaIvesFields value={sba} onChange={setSba} />");
    expect(staff).toContain('"/api/portal/lenders/" + savedId + "/sba"');
    const own = readFileSync("src/pages/lender/LenderPortalPage.tsx", "utf8");
    expect(own).toContain("<SbaIvesFields value={sba} onChange={setSba} />");
    expect(own).toContain('api("/api/lender/me/sba", { method: "PUT"');
  });
});
