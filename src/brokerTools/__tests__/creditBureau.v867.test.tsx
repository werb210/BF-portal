// BF_PORTAL_v867_BROKER_TOOLS_CREDIT_BUREAU - Deal desk > Credit bureau: consent, pull, key fields.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post }, rawApiFetch: vi.fn() }));

import CreditBureauPanel, { latesText } from "../CreditBureauPanel";

const providers = [{ bureau: "equifax_ca", name: "Equifax Canada", ready: true, test_mode: true, setup: [] }, { bureau: "transunion_ca", name: "TransUnion Canada", ready: false, test_mode: false, setup: ["X"] }];

beforeEach(() => { h.get.mockReset(); h.post.mockReset(); vi.spyOn(window, "confirm").mockReturnValue(true); });

describe("credit bureau panel", () => {
  it("summarises late payments", () => {
    expect(latesText({ delinquencies: { d30: 2, d60: 1, d90: 0 } })).toBe("2 x 30, 1 x 60, 0 x 90+");
    expect(latesText({})).toBe("0 x 30, 0 x 60, 0 x 90+");
  });

  it("asks for consent with the applicant's name, pulls a ready bureau once consent is given, and shows the score", async () => {
    let consents: unknown[] = [];
    let pulls: unknown[] = [];
    h.get.mockImplementation(async () => ({ consents, pulls, providers, applicant: { first_name: "Ann", last_name: "Client", email: "ann@example.com" } }));
    h.post.mockImplementation(async (url: string) => {
      if (url.endsWith("/consents")) consents = [{ id: "c1", status: "given", subject: { first_name: "Ann", last_name: "Client" }, method: "client_app", given_at: "2026-11-01", attest_note: null }];
      if (url.endsWith("/pulls")) pulls = [{ id: "p1", consent_id: "c1", bureau: "equifax_ca", status: "completed", score: 712, first_name: "Ann", last_name: "Client", pulled_at: "2026-11-01T12:00:00Z", error: null, key_fields: { collections: 0, bankruptcies: 0, inquiries_6m: 2 } }];
      return { ok: true };
    });
    render(<CreditBureauPanel applicationId="app-1" />);
    expect(await screen.findByText(/Reports are test data/)).toBeTruthy();
    expect(screen.getByText("TransUnion Canada is not set up yet.")).toBeTruthy();
    await waitFor(() => expect((screen.getByLabelText("First name") as HTMLInputElement).value).toBe("Ann"));
    fireEvent.click(screen.getByRole("button", { name: "Ask for consent" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/deal-desk/applications/app-1/credit-bureau/consents", { first_name: "Ann", last_name: "Client", email: "ann@example.com" }));
    fireEvent.click(await screen.findByRole("button", { name: "Pull Equifax Canada" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/deal-desk/applications/app-1/credit-bureau/pulls", { consent_id: "c1", bureau: "equifax_ca" }));
    expect((await screen.findByTestId("credit-pulls")).textContent).toContain("712");
    expect(screen.queryByRole("button", { name: "Pull TransUnion Canada" })).toBeNull();
  });
});
