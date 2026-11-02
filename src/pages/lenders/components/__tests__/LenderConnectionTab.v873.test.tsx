// BF_PORTAL_v873_LENDER_API - the lender Connection tab and the application's Lender API panel (ported from KS-Portal #47).
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const apiGet = vi.fn();
const apiPut = vi.fn();
const apiPost = vi.fn();
vi.mock("@/api", () => ({
  api: {
    get: (...a: unknown[]) => apiGet(...a),
    put: (...a: unknown[]) => apiPut(...a),
    post: (...a: unknown[]) => apiPost(...a),
    delete: vi.fn(),
  },
}));

import { LenderConnectionPanel, setIn, getIn } from "../LenderConnectionTab";
import LenderApiPanel from "@/pages/applications/tabs/LenderApiPanel";

const catalogue = {
  ok: true, credentials_key_configured: true,
  buckets: [{ key: "in_review", label: "In review" }, { key: "offer", label: "Offer" }, { key: "declined", label: "Declined" }],
  stages: ["Received", "Offer"],
  connectors: [
    { kind: "generic_rest", label: "REST/JSON API", description: "Generic", capabilities: { submit: true, status: true, upload: true, webhook: true }, availability: "available", secret_fields: [{ key: "api_key", label: "API key or token", required: false }], default_status_map: {} },
    { kind: "merchant_growth", label: "Merchant Growth (awaiting)", description: "MG", capabilities: { submit: true, status: true, upload: true, webhook: true }, availability: "awaiting_lender_api_docs", secret_fields: [], default_status_map: { "Closed - Rejected": "declined" } },
  ],
  merchant_growth: { preset: { site_url: "https://merchantadvance.my.site.com", submit: { object: "Lead", field_map: { Company: "company" } } }, fields: [{ object: "Lead", section: "Header", label: "Company", boreal: "company", direction: "send", apiName: null, guessed: true }], status_map: { "Deal Offer Sent": "offer" }, guessed_statuses: { "Closed - Funded": "funded" }, requests: ["Ask for a connected app"] },
};

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

beforeEach(() => {
  apiGet.mockReset(); apiPut.mockReset(); apiPost.mockReset();
});

describe("config helpers", () => {
  it("sets and reads nested paths without mutating", () => {
    const a = { submit: { path: "/x" } };
    const b = setIn(a, "submit.field_map", { a: "company" });
    expect(a).toEqual({ submit: { path: "/x" } });
    expect(getIn(b, "submit.field_map.a")).toBe("company");
    expect(setIn(b, "submit.path", "")).toEqual({ submit: { field_map: { a: "company" } } });
  });
});

describe("LenderConnectionPanel", () => {
  it("shows the Merchant Growth notice, cannot be switched on, and saves without enabling", async () => {
    apiGet.mockImplementation((url: string) => {
      if (url.endsWith("/connectors")) return Promise.resolve(catalogue);
      if (url.endsWith("/field-keys")) return Promise.resolve({ ok: true, keys: [{ key: "company", label: "Business name" }] });
      if (url.includes("/lenders/")) return Promise.resolve({ ok: true, lender: { id: "L1", name: "Merchant Growth" }, credentials_key_configured: true, connection: null });
      return Promise.resolve({ ok: true, submissions: [] });
    });
    apiPut.mockResolvedValue({ ok: true, connection: null, problems: [] });
    render(wrap(<LenderConnectionPanel lenderId="L1" lenderName="Merchant Growth" />));
    expect(await screen.findByTestId("mg-awaiting")).toHaveTextContent(/merchantadvance\.my\.site\.com/);
    const on = screen.getByLabelText(/Connection on/) as HTMLInputElement;
    expect(on.disabled).toBe(true);
    fireEvent.click(screen.getByText("Save connection"));
    await waitFor(() => expect(apiPut).toHaveBeenCalled());
    const [url, body] = apiPut.mock.calls[0]!;
    expect(url).toBe("/api/lender-connections/lenders/L1");
    expect(body).toMatchObject({ connector: "merchant_growth", enabled: false, config: { site_url: "https://merchantadvance.my.site.com" } });
  });

  it("sends a typed credential once and shows the saved hint, never the value", async () => {
    apiGet.mockImplementation((url: string) => {
      if (url.endsWith("/connectors")) return Promise.resolve(catalogue);
      if (url.endsWith("/field-keys")) return Promise.resolve({ ok: true, keys: [{ key: "company", label: "Business name" }] });
      if (url.includes("/log")) return Promise.resolve({ ok: true, submissions: [] });
      return Promise.resolve({ ok: true, lender: { id: "L2", name: "Acme" }, credentials_key_configured: true, connection: {
        id: "c1", lender_id: "L2", connector: "generic_rest", enabled: true, submit_by_api: true, email_fallback: true, poll_enabled: true, poll_interval_minutes: 30,
        config: { base_url: "https://api.acme.example", submit: { path: "/apps", field_map: { name: "company" } } }, secret_hints: { api_key: "ends 9xyz" }, secrets_saved: ["api_key"],
        status_map: {}, last_test_at: null, last_test_ok: null, last_test_message: null, last_sync_at: null, last_error: null, webhook_url: "https://srv.example/api/lender-webhooks/c1/tok",
      } });
    });
    apiPut.mockResolvedValue({ ok: true, connection: null, problems: [] });
    render(wrap(<LenderConnectionPanel lenderId="L2" lenderName="Acme" />));
    expect(await screen.findByText(/ends 9xyz/)).toBeInTheDocument();
    expect(screen.getByText(/lender-webhooks\/c1\/tok/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("API key or token"), { target: { value: "new-key" } });
    fireEvent.click(screen.getByText("Save connection"));
    await waitFor(() => expect(apiPut).toHaveBeenCalled());
    expect(apiPut.mock.calls[0]![1]).toMatchObject({ connector: "generic_rest", enabled: true, secrets: { api_key: "new-key" } });
  });

  it("maps the outstanding balance a lender reports after funding (Active Contracts)", async () => {
    apiGet.mockImplementation((url: string) => {
      if (url.endsWith("/connectors")) return Promise.resolve({ ...catalogue, credentials_key_configured: false });
      if (url.endsWith("/field-keys")) return Promise.resolve({ ok: true, keys: [] });
      if (url.includes("/log")) return Promise.resolve({ ok: true, submissions: [] });
      return Promise.resolve({ ok: true, lender: { id: "L3", name: "Acme" }, credentials_key_configured: false, connection: {
        id: "c3", lender_id: "L3", connector: "generic_rest", enabled: false, submit_by_api: true, email_fallback: true, poll_enabled: true, poll_interval_minutes: 30,
        config: { base_url: "https://api.acme.example", submit: { path: "/apps", field_map: { name: "company" } } }, secret_hints: {}, secrets_saved: [],
        status_map: {}, last_test_at: null, last_test_ok: null, last_test_message: null, last_sync_at: null, last_error: null, webhook_url: null,
      } });
    });
    apiPut.mockResolvedValue({ ok: true, connection: null, problems: [] });
    render(wrap(<LenderConnectionPanel lenderId="L3" lenderName="Acme" />));
    // Without the server key the Admin is told exactly which setting is missing.
    expect(await screen.findByText(/LENDER_CREDENTIALS_ENCRYPTION_KEY/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Outstanding balance (optional)"), { target: { value: "balance.outstanding" } });
    fireEvent.click(screen.getByText("Save connection"));
    await waitFor(() => expect(apiPut).toHaveBeenCalled());
    expect(apiPut.mock.calls[0]![1]).toMatchObject({ config: { status: { balance_path: "balance.outstanding" } } });
  });
});

describe("LenderApiPanel", () => {
  it("shows the synced status, offers and conditions and submits by API", async () => {
    apiGet.mockResolvedValue({
      ok: true, buckets: { offer: "Offer" },
      lenders: [
        { lender_id: "L1", lender_name: "Acme", connector: "generic_rest", connector_label: "REST/JSON API", enabled: true, submit_by_api: true, email_fallback: true, availability: "available",
          capabilities: { submit: true, status: true, upload: true, webhook: true }, can_submit: true,
          submission: { id: "s1", lender_id: "L1", status: "submitted", external_id: "D-9", lender_status: "Approved", lender_status_label: null, bucket: "offer", attempts: 1, last_error: null, warnings: [], funded_amount: null, submitted_at: "2026-11-01T00:00:00Z", last_synced_at: "2026-11-01T01:00:00Z", next_retry_at: null },
          events: [{ id: "e1", lender_id: "L1", kind: "status_changed", source: "webhook", status: "Approved", detail: "Acme: Approved (Offer)", created_at: "2026-11-01T01:00:00Z" }],
          conditions: [{ id: "c1", lender_id: "L1", external_id: "x", kind: "document_request", description: "Void cheque", document_type: null, status: "open", first_seen_at: "2026-11-01T01:00:00Z" }],
          offers: [{ id: "o1", lender_id: "L1", lender_name: "Acme", amount: 50000, rate_factor: "1.3", term: "12 months", payment_frequency: "Weekly", expiry_date: null, status: "pending", created_at: "2026-11-01T01:00:00Z" }] },
        { lender_id: "L2", lender_name: "Beta", connector: "generic_rest", connector_label: "REST/JSON API", enabled: true, submit_by_api: true, email_fallback: true, availability: "available",
          capabilities: { submit: true, status: true, upload: true, webhook: true }, can_submit: true, submission: null, events: [], conditions: [], offers: [] },
      ],
    });
    apiPost.mockResolvedValue({ ok: true, external_id: "B-1" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(wrap(<LenderApiPanel applicationId="app-1" />));
    expect(await screen.findByTestId("lender-api-status")).toHaveTextContent("Approved · Offer");
    expect(screen.getByText(/\$50,000 · 12 months/)).toBeInTheDocument();
    expect(screen.getByText(/Document: Void cheque/)).toBeInTheDocument();
    expect(screen.getByText(/funding conditions checklist/)).toBeInTheDocument();
    expect(screen.queryByTestId("lender-api-submit-L1")).toBeNull();
    fireEvent.click(screen.getByTestId("lender-api-submit-L2"));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/api/lender-connections/applications/app-1/lenders/L2/submit", {}));
    expect(await screen.findByText("Sent to Beta by API.")).toBeInTheDocument();
  });
});
