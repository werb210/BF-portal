// BF_PORTAL_v867_BROKER_TOOLS_CONTRACTS - Deal desk > Contracts: fill, make, send.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post }, rawApiFetch: vi.fn() }));

import ContractsPanel, { fieldsToFill } from "../ContractsPanel";

const tpl = { id: "t1", name: "Lease", fields: ["business.legal_name", "guarantor.name"], unknown_fields: ["guarantor.name"], active: true };
const values = { "business.legal_name": "Dig North Ltd.", "client.full_name": "Ann Client", "client.email": "ann@example.com" };

beforeEach(() => { for (const f of Object.values(h)) f.mockReset(); });

describe("contracts panel", () => {
  it("asks only for the fields the deal cannot fill", () => {
    expect(fieldsToFill(tpl, values, {})).toEqual(["guarantor.name"]);
    expect(fieldsToFill(tpl, values, { "business.legal_name": "Other" })).toEqual(["business.legal_name", "guarantor.name"]);
  });

  it("makes the contract with the typed value and the client as signer, then sends it", async () => {
    let contracts: unknown[] = [];
    h.get.mockImplementation(async (url: string) => (url.endsWith("/contract-templates") ? { templates: [tpl] } : { contracts, values }));
    h.post.mockImplementation(async (url: string) => {
      if (url.endsWith("/contracts")) contracts = [{ id: "c1", name: "Lease - Dig North Ltd.", status: "generated", missing: [], signers: [{ name: "Ann Client", email: "ann@example.com", role: "Signer 1" }], sent_at: null, signed_at: null, error: null, created_at: "" }];
      return { ok: true };
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ContractsPanel applicationId="app-1" />);
    fireEvent.change(await screen.findByLabelText("Value for guarantor.name"), { target: { value: "Bob Guarantor" } });
    await waitFor(() => expect((screen.getByLabelText("Signer 1 name") as HTMLInputElement).value).toBe("Ann Client"));
    fireEvent.click(screen.getByRole("button", { name: "Make contract" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/deal-desk/applications/app-1/contracts",
      { template_id: "t1", values: { "guarantor.name": "Bob Guarantor" }, signers: [{ name: "Ann Client", email: "ann@example.com" }] }));
    fireEvent.click(await screen.findByRole("button", { name: "Send for signature" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/deal-desk/applications/app-1/contracts/c1/send", {}));
  });
});
