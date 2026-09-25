// BF_PORTAL_BLOCK_v531
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const get = vi.fn();
const raw = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => get(...a) }, rawApiFetch: (...a: unknown[]) => raw(...a) }));

import BrokerImportsPage from "../BrokerImportsPage";
import { statusLabel } from "../brokerImports";

const row = (over: Record<string, unknown> = {}) => ({
  id: "i1", broker_name: "Avance", zip_name: "client.zip", application_id: "a1", applicant_phone: null, status: "awaiting_client",
  summary: { businessName: "Toitures Tremblay" }, error: null, created_at: "2026-09-25T12:00:00Z", business_name: "Toitures Tremblay",
  boreal_pct: null, broker_pct: null, deal_terms: null, ...over,
});

beforeEach(() => {
  get.mockReset(); raw.mockReset();
  raw.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("v531 broker file actions", () => {
  it("adds a missing mobile", async () => {
    get.mockResolvedValue({ imports: [row()] });
    render(<MemoryRouter><BrokerImportsPage /></MemoryRouter>);
    expect(await screen.findByText("Missing")).toBeTruthy();
    expect((screen.getByTestId("broker-text-client") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("broker-phone-edit"));
    fireEvent.change(screen.getByTestId("broker-phone-input"), { target: { value: "514 555 0199" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(raw).toHaveBeenCalled());
    const [path, opts] = raw.mock.calls[0] as [string, { method: string; body: string }];
    expect(path).toBe("/api/broker-imports/i1/phone");
    expect(opts.method).toBe("PUT");
    expect(JSON.parse(opts.body)).toEqual({ applicant_phone: "514 555 0199" });
  });
  it("texts the client and can discard", async () => {
    get.mockResolvedValue({ imports: [row({ applicant_phone: "+15145550199" })] });
    render(<MemoryRouter><BrokerImportsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByTestId("broker-text-client"));
    await waitFor(() => expect(raw).toHaveBeenCalledWith("/api/broker-imports/i1/text-client", expect.objectContaining({ method: "POST" })));
    expect(await screen.findByText("Text sent.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("broker-discard"));
    await waitFor(() => expect(raw).toHaveBeenCalledWith("/api/broker-imports/i1/discard", expect.objectContaining({ method: "POST" })));
  });
  it("shows no actions once the client has signed in", async () => {
    get.mockResolvedValue({ imports: [row({ status: "claimed", applicant_phone: "+15145550199" })] });
    render(<MemoryRouter><BrokerImportsPage /></MemoryRouter>);
    expect(await screen.findByText("Client is completing the application")).toBeTruthy();
    expect(screen.queryByTestId("broker-text-client")).toBeNull();
    expect(statusLabel("discarded")).toBe("Discarded");
  });
});
