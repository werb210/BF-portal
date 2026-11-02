// BF_PORTAL_v875_INTEGRATIONS - Settings > Webhooks (https only, events, events per request, secret shown once, pause,
// log with Resend), Settings > API keys (permissions per area, limit, secret shown once, change, revoke asks first, the
// endpoint reference), Settings > Microsoft sign-in (switch, the redirect address to register) and the "Sign in with
// Microsoft" button (only when on, finishes the sign-in from the one-time code, plain-words refusals, hidden in the app).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn(), silo: "BF" }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, patch: h.patch, put: h.put, delete: h.del } }));
vi.mock("@/config/api", () => ({ API_BASE: "https://server.test" }));
vi.mock("@/hooks/useSilo", () => ({ useSilo: () => ({ silo: h.silo }) }));

import WebhooksSettings from "../WebhooksSettings";
import ApiKeysSettings, { describeScopes } from "../ApiKeysSettings";
import MicrosoftSignInSettings from "../MicrosoftSignInSettings";
import SsoButtons from "@/auth/SsoButtons";
import { readSsoReturn, ssoErrorText } from "@/auth/sso";

function wrap(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  h.get.mockReset(); h.post.mockReset(); h.patch.mockReset(); h.put.mockReset(); h.del.mockReset();
  h.silo = "BF";
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

const info = {
  silo: "BF",
  events: [
    { type: "contact.created", label: "Contact created", object: "contact", description: "A contact is added.", example: { id: "evt", type: "contact.created", data: { object: { email: "jordan@example.com" } } } },
    { type: "application.stage_changed", label: "Stage changed", object: "application", description: "Stage moves.", example: { id: "evt", type: "application.stage_changed", data: { from_stage: "Received", to_stage: "In Review" } } },
    { type: "deal.funded", label: "Deal funded", object: "application", description: "Funded.", example: { id: "evt", type: "deal.funded", data: { object: { funded_amount: 240000 } } } },
  ],
  signing: { signature_header: "X-Webhook-Signature", timestamp_header: "X-Webhook-Timestamp", tolerance_seconds: 300, algorithm: "HMAC-SHA256" },
  retry: { max_attempts: 10, first_retry_seconds: 60, max_delay_hours: 6, disable_after_dead: 5, timeout_seconds: 10, keep_days: 30 },
  limits: { endpoints: 25, batch_size_max: 100 },
};
const endpoint = { id: "e1", silo: "BF", url: "https://hooks.zapier.com/hooks/catch/1/abc/", description: "Zap", events: ["contact.created"], batch_size: 10,
  status: "active", consecutive_failures: 0, disabled_at: null, disabled_reason: null, last_success_at: null, last_failure_at: null,
  created_at: "2026-11-16T00:00:00Z", delivered_30d: 3, failed_30d: 1, queued: 0 };

function webhookGets(endpoints: unknown[], deliveries: unknown[] = []) {
  h.get.mockImplementation(async (path: string) => {
    if (path.endsWith("/events")) return info;
    if (path.endsWith("/deliveries")) return { deliveries };
    return { endpoints };
  });
}

describe("Settings > Webhooks", () => {
  it("adds an https endpoint with its events and events per request, and shows the signing secret once", async () => {
    webhookGets([]);
    h.post.mockResolvedValueOnce({ endpoint, secret: "whsec_abc123" });
    render(<WebhooksSettings />);
    expect(await screen.findByText("Webhooks for BF")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("webhook-add"));
    fireEvent.change(screen.getByLabelText("Endpoint URL (https)"), { target: { value: "http://example.com/hook" } });
    fireEvent.click(screen.getByLabelText("Contact created"));
    fireEvent.click(screen.getByLabelText("Stage changed"));
    fireEvent.click(screen.getByRole("button", { name: "Add endpoint" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("must start with https://");
    expect(h.post).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Endpoint URL (https)"), { target: { value: "https://hooks.zapier.com/hooks/catch/1/abc/" } });
    fireEvent.change(screen.getByLabelText("Events per request"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Add endpoint" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/webhook-endpoints", {
      url: "https://hooks.zapier.com/hooks/catch/1/abc/", events: ["contact.created", "application.stage_changed"], description: "", batch_size: 10,
    }));
    expect(await screen.findByTestId("webhook-secret")).toHaveTextContent("whsec_abc123");
  });

  it("lists the silo's endpoints, pauses one and resends from the log", async () => {
    webhookGets([endpoint], [{ id: "d1", event_id: "ev1", endpoint_id: "e1", event_type: "contact.created", object_type: "contact", object_id: "c1",
      status: "dead", attempts: 10, next_attempt_at: null, last_attempt_at: null, last_status_code: 500, last_error: "HTTP 500", last_duration_ms: 20,
      delivered_at: null, resend_of: null, created_at: "2026-11-16T00:00:00Z" }]);
    h.patch.mockResolvedValue({ endpoint: { ...endpoint, status: "paused" } });
    h.post.mockResolvedValue({ delivery_id: "d2" });
    render(<WebhooksSettings />);
    const row = await screen.findByTestId("webhook-row-e1");
    expect(row).toHaveTextContent("Up to 10 events per request");
    expect(row).toHaveTextContent("3 delivered, 1 failed");
    fireEvent.click(within(row).getByRole("button", { name: "Log" }));
    fireEvent.click(await screen.findByRole("button", { name: "Resend" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/webhook-endpoints/deliveries/d1/resend"));
    fireEvent.click(within(row).getByRole("button", { name: "Pause" }));
    await waitFor(() => expect(h.patch).toHaveBeenCalledWith("/api/webhook-endpoints/e1", { status: "paused" }));
  });
});

const KEYS_BODY = {
  silo: "BF",
  keys: [{ id: "k1", name: "Zapier", silo: "BF", scopes: ["contacts:read", "contacts:write", "lenders:read"], key_prefix: "bf_live_0a1b2c3d",
    rate_limit_per_minute: 120, created_by: "u1", created_at: "2026-11-01T10:00:00Z", last_used_at: "2026-11-02T10:00:00Z", last_used_ip: "203.0.113.9", revoked_at: null }],
  scopes: ["contacts:read", "contacts:write", "companies:read", "companies:write", "applications:read", "applications:write", "notes:read", "notes:write", "offers:read", "lenders:read"]
    .map((scope) => ({ scope, label: scope })),
  limits: { active_keys: 25, default_rate_limit: 120, max_rate_limit: 600 },
  configured: true,
};

describe("Settings > API keys", () => {
  it("creates a key with per-area permissions and a limit, and shows it once", async () => {
    h.get.mockResolvedValue(KEYS_BODY);
    h.post.mockResolvedValueOnce({ key: { ...KEYS_BODY.keys[0], id: "k2", name: "Sheets" }, secret: "bf_live_secret" });
    wrap(<ApiKeysSettings />);
    expect(await screen.findByText("API keys for BF")).toBeInTheDocument();
    expect(await screen.findByTestId("api-key-row-k1")).toHaveTextContent("Contacts: read and write; Lenders: read");
    expect(screen.getByTestId("api-key-row-k1")).toHaveTextContent("203.0.113.9");
    fireEvent.change(screen.getByLabelText("Key name"), { target: { value: "Sheets" } });
    fireEvent.change(screen.getByLabelText("Requests per minute"), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText("Applications"), { target: { value: "write" } });
    // Offers can only be read.
    expect(within(screen.getByLabelText("Lender offers")).queryByRole("option", { name: "Read and write" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Create key" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/api-keys", {
      name: "Sheets", scopes: ["contacts:read", "applications:read", "applications:write"], rate_limit_per_minute: 60,
    }));
    expect(await screen.findByTestId("api-key-secret")).toHaveTextContent("bf_live_secret");
  });

  it("changes a key's permissions and revokes after confirming", async () => {
    h.get.mockResolvedValue(KEYS_BODY);
    h.patch.mockResolvedValue({ key: KEYS_BODY.keys[0] });
    h.del.mockResolvedValue({ key: KEYS_BODY.keys[0] });
    wrap(<ApiKeysSettings />);
    fireEvent.click(await screen.findByRole("button", { name: "Change Zapier" }));
    const row = screen.getByTestId("api-key-row-k1");
    fireEvent.change(within(row).getByLabelText("Contacts"), { target: { value: "read" } });
    fireEvent.click(within(row).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(h.patch).toHaveBeenCalledWith("/api/api-keys/k1", { scopes: ["lenders:read", "contacts:read"], rate_limit_per_minute: 120 }));
    fireEvent.click(await screen.findByRole("button", { name: "Revoke Zapier" }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(h.del).toHaveBeenCalledWith("/api/api-keys/k1"));
  });

  it("documents each endpoint with the permission it needs and the OpenAPI address", async () => {
    h.get.mockResolvedValue(KEYS_BODY);
    wrap(<ApiKeysSettings />);
    const docs = await screen.findByTestId("api-docs");
    expect(docs).toHaveTextContent("https://server.test/api/open/v1/openapi.json");
    expect(docs).toHaveTextContent("applications:write");
    expect(describeScopes([])).toBe("None");
  });
});

describe("Settings > Microsoft sign-in", () => {
  const body = (on: boolean, configured = true) => ({
    ok: true, settings: { microsoft_enabled: on },
    microsoft: { configured, enabled: on, available: on && configured, client_id: "c8890d6f-eb8f-4101-8336-5e8fca3303e0",
      tenant_id: "b585ab8e-bd39-449d-9210-479a9c989bb2", redirect_uri: "https://server.test/api/auth/sso/microsoft/callback", return_url: "https://staff.test/login" },
  });

  it("shows the redirect address to register and turns the button on", async () => {
    h.get.mockResolvedValue(body(false));
    h.put.mockResolvedValue(body(true));
    wrap(<MicrosoftSignInSettings />);
    expect(await screen.findByTestId("sso-redirect-uri")).toHaveTextContent("https://server.test/api/auth/sso/microsoft/callback");
    fireEvent.click(screen.getByLabelText(/Show .Sign in with Microsoft/));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/sso-settings", { microsoft_enabled: true }));
    expect(await screen.findByRole("status")).toHaveTextContent("Sign in with Microsoft is on.");
  });

  it("can't be turned on while the server has no client secret", async () => {
    h.get.mockResolvedValue(body(false, false));
    wrap(<MicrosoftSignInSettings />);
    expect(await screen.findByLabelText(/Show .Sign in with Microsoft/)).toBeDisabled();
    expect(screen.getByText(/MSAL_CLIENT_SECRET/)).toBeInTheDocument();
  });
});

describe("Sign in with Microsoft button", () => {
  it("is hidden when off and in the iPad app, shown when on", async () => {
    const { unmount } = render(<SsoButtons loadConfig={async () => ({ microsoft: false })} native={false} />);
    await waitFor(() => expect(screen.queryByTestId("sso-microsoft")).toBeNull());
    unmount();
    const off = render(<SsoButtons loadConfig={async () => ({ microsoft: true })} native />);
    expect(screen.queryByTestId("sso-buttons")).toBeNull();
    off.unmount();
    render(<SsoButtons loadConfig={async () => ({ microsoft: true })} native={false} />);
    expect(await screen.findByTestId("sso-microsoft")).toHaveAttribute("href", "https://server.test/api/auth/sso/microsoft/start");
  });

  it("finishes the sign-in from the one-time code and takes it out of the address bar", async () => {
    window.history.replaceState(null, "", "/login#sso_code=one-time");
    const exchange = vi.fn(async () => undefined);
    const onSignedIn = vi.fn();
    render(<SsoButtons loadConfig={async () => ({ microsoft: true })} exchange={exchange} onSignedIn={onSignedIn} native={false} />);
    await waitFor(() => expect(onSignedIn).toHaveBeenCalled());
    expect(exchange).toHaveBeenCalledWith("one-time");
    expect(window.location.hash).toBe("");
  });

  it("says in plain words why a sign-in was refused", async () => {
    window.history.replaceState(null, "", "/login?sso_error=no_user");
    render(<SsoButtons loadConfig={async () => ({ microsoft: true })} native={false} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("isn't set up as a Boreal staff member");
    window.history.replaceState(null, "", "/login");
    expect(readSsoReturn({ hash: "#sso_code=abc", search: "?sso_error=state" })).toEqual({ code: "abc", error: "state" });
    expect(ssoErrorText("something_new")).toContain("didn't work");
  });
});
