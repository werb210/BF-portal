// BF_PORTAL_SBA_SEND_FOR_SIGNING_v749
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";

const posts: string[] = [];
vi.mock("@/api", () => ({
  api: {
    get: vi.fn(async () => ({ data: { isSba: true, formsComplete: true, missingForms: [], envelopes: [], allSigned: false } })),
    post: vi.fn(async (url: string) => { posts.push(url); return { data: { ok: true, owners: [{ ownerIndex: 1, name: "Brandon Voss", started: true, delivery: "client portal" }], notice: { sms: true, email: true } } }; }),
  },
}));
import SbaSigningTab from "../SbaSigningTab";

describe("Send for signing", () => {
  it("starts one signing per owner and says how each owner signs", async () => {
    render(<SbaSigningTab applicationId="a1" />);
    const btn = await screen.findByTestId("sba-send-for-signing");
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByTestId("sba-resend-notice").textContent).toContain("Owner 1 (Brandon Voss): sent - signs in the client portal"));
    expect(posts).toContain("/api/applications/a1/sba-signing/send");
    expect(screen.getByTestId("sba-resend-notice").textContent).toContain("Owner 1 was texted and emailed.");
  });
  it("Lenders tab explains the new send reason", () => {
    expect(readFileSync("src/pages/applications/tabs/LendersTab.tsx", "utf8")).toContain("sba_signing_not_started:");
  });
});
