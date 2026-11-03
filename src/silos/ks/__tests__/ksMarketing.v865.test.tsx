// BF_PORTAL_v865_KS_MARKETING - Keystone silo > Marketing against a mocked KS-Ops: Admin-only nav, the sender warnings
// until KS_MARKETING_FROM and the domain are set, prospects shown as blocked with the reason, consent errors from
// KS-Ops shown on the field, a campaign draft saved then sent, and the list import parser. Only KS-Ops is called.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/authToken", () => ({ getAuthToken: () => "bf-portal-token-123" }));
const authUser = vi.fn();
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: authUser(), authStatus: "authenticated" }) }));

import KSSilo from "../KSSilo";
import { clearKsToken, KS_OPS_DEFAULT_URL } from "../ksApi";
import { ksNavFor } from "../ksAccess";
import { parseImport } from "../marketing/KsMktProspects";

const CAMPAIGN = "44444444-4444-4444-8444-444444444444";
type Call = { url: string; method: string; body: any; headers: Record<string, string> };
let calls: Call[] = [];
let consentRejected = false;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const STATUS = {
  can_send: true, sending_problem: null,
  sender: { from: "keystone@boreal.financial", from_name: "Keystone", from_configured: false, reply_to: "keystone@boreal.financial", business_name: "Keystone", legal_name: "2630108 Alberta Ltd.", address: "450 Sparling Crt SW, Edmonton, AB T6X 1G9, Canada", address_is_default: true },
  domain: { domain: "boreal.financial", authenticated: true, error: null, checked_at: "2026-11-01T00:00:00Z" },
  tracking_configured: false, reply_detection: { mailbox: null }, public_url: "https://ks-ops.example",
  warnings: ["KS_MARKETING_FROM is not set: marketing goes out from keystone@boreal.financial for now."],
};
const PROSPECT = {
  id: "p1", email: "cole@cold.example", name: "Cole Cold", company: "Cold Co", phone: null, title: null, country: "CA", province_state: "AB",
  status: "lead", source: "manual", sources: ["manual"], plan_interest: null, consent_type: "none", consent_source: null, consent_text: null,
  consent_at: null, consent_expires_at: null, consent_recorded_by: null, demo_booked_at: null, signed_up_at: null, last_replied_at: null,
  last_emailed_at: null, created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z", suppressed: null,
  eligibility: { ok: false, reason: "no_consent", message: "No consent is recorded." },
};
const DRAFT = { id: CAMPAIGN, name: "Launch", subject: "Keystone is here", status: "draft", send_at: null, started_at: null, finished_at: null, template_id: null, fields: { body: "Hi" }, filters: {}, created_by: "todd", created_at: "2026-11-01T00:00:00Z" };
const STATS = { queued: 0, sent: 0, blocked: 0, failed: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0, blocked_by_reason: {} };

function route(url: string, method: string): Response {
  const path = url.replace(KS_OPS_DEFAULT_URL, "").split("?")[0];
  if (path === "/api/ops/auth/exchange") return json(200, { token: "ops-token", expires_in: 3600, user: { id: "u1", email: "todd@boreal.test", name: "Todd", role: "Admin" } });
  if (path === "/api/ops/marketing/status") return json(200, STATUS);
  if (path === "/api/ops/marketing/prospects" && method === "GET") return json(200, { prospects: [PROSPECT], total: 1 });
  if (path === "/api/ops/marketing/prospects" && method === "POST") {
    return consentRejected
      ? json(400, { error: "validation_error", errors: { "consent.consent_source": "Say where the consent came from (form, call, email, website...)." } })
      : json(201, { prospect: PROSPECT });
  }
  if (path === "/api/ops/marketing/audience") return json(200, { total: 5, eligible: 3, blocked: { no_consent: 1, suppressed_unsubscribed: 1 } });
  if (path === "/api/ops/marketing/templates") return json(200, { templates: [] });
  if (path === "/api/ops/marketing/preview") return json(200, { subject: "s", html: "<p>preview</p>", text: "" });
  if (path === `/api/ops/marketing/campaigns/${CAMPAIGN}` && method === "GET") return json(200, { campaign: DRAFT, stats: STATS, recipients: [] });
  if (path === `/api/ops/marketing/campaigns/${CAMPAIGN}` && method === "PATCH") return json(200, { campaign: DRAFT });
  if (path === `/api/ops/marketing/campaigns/${CAMPAIGN}/send`) return json(200, { ok: true, queued: 3, blocked: { no_consent: 2 }, send_at: "2026-11-01T00:00:00Z" });
  return json(404, { error: "not_found" });
}

beforeEach(() => {
  calls = [];
  consentRejected = false;
  clearKsToken();
  window.sessionStorage.clear();
  authUser.mockReturnValue({ role: "Admin", firstName: "Todd" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(input);
      const method = String(init.method ?? "GET");
      calls.push({ url, method, body: init.body ? JSON.parse(String(init.body)) : undefined, headers: (init.headers ?? {}) as Record<string, string> });
      return route(url, method);
    }),
  );
  vi.stubGlobal("confirm", vi.fn(() => true));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function renderKs(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/silo/ks/*" element={<KSSilo />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function expectOnlyKsOps() {
  expect(calls.length).toBeGreaterThan(0);
  for (const c of calls) {
    expect(c.url.startsWith(KS_OPS_DEFAULT_URL)).toBe(true);
    expect(Object.keys(c.headers).map((k) => k.toLowerCase())).not.toContain("x-silo");
  }
}

describe("Keystone marketing", () => {
  it("is in the Keystone sidebar for Admins only", () => {
    expect(ksNavFor({ role: "Admin" }).map((n) => n.label)).toContain("Marketing");
    expect(ksNavFor({ role: "Marketing", silos: ["KS"] }).map((n) => n.label)).not.toContain("Marketing");
  });

  it("warns until the Keystone sender is set up", async () => {
    renderKs("/silo/ks/marketing/overview");
    expect(await screen.findByTestId("ks-mkt-warnings")).toHaveTextContent("The Keystone sender address is not set");
    expect(await screen.findByText(/450 Sparling Crt SW/)).toBeInTheDocument();
    expectOnlyKsOps();
  });

  it("lists prospects with why they cannot be emailed", async () => {
    renderKs("/silo/ks/marketing/prospects");
    expect(await screen.findByText("Cole Cold")).toBeInTheDocument();
    expect(screen.getByText("Blocked: No consent")).toBeInTheDocument();
    expectOnlyKsOps();
  });

  it("shows KS-Ops's consent error on the field when adding a prospect", async () => {
    consentRejected = true;
    renderKs("/silo/ks/marketing/prospects");
    fireEvent.click(await screen.findByText("Add prospect"));
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "new@x.example" } });
    fireEvent.change(screen.getByLabelText("Consent type"), { target: { value: "express" } });
    fireEvent.click(screen.getAllByText("Add prospect").find((el) => el.tagName === "BUTTON" && el.closest("section"))!);
    expect((await screen.findAllByText(/Say where the consent came from/)).length).toBeGreaterThan(0);
    const post = calls.find((c) => c.method === "POST" && c.url.endsWith("/api/ops/marketing/prospects"));
    expect(post?.body).toMatchObject({ email: "new@x.example", consent: { consent_type: "express" } });
  });

  it("saves the draft, then sends it, and shows the audience with blocked reasons", async () => {
    renderKs(`/silo/ks/marketing/campaigns/${CAMPAIGN}`);
    expect(await screen.findByTestId("ks-mkt-audience")).toHaveTextContent("3 of 5 matching prospects can be emailed");
    expect(screen.getByTestId("ks-mkt-audience")).toHaveTextContent("Unsubscribed: 1");
    fireEvent.click(screen.getByTestId("ks-mkt-send"));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith(`/campaigns/${CAMPAIGN}/send`))).toBe(true));
    const patchAt = calls.findIndex((c) => c.method === "PATCH");
    const sendAt = calls.findIndex((c) => c.url.endsWith("/send"));
    expect(patchAt).toBeGreaterThan(-1);
    expect(patchAt).toBeLessThan(sendAt);
    expect(calls[sendAt]!.body).toEqual({});
    expectOnlyKsOps();
  });

  it("parses a pasted list (header row skipped)", () => {
    expect(parseImport("email,name,company\njo@x.example, Jo Smith, Smith Co, ca, ab, Growth\nnot-an-email,x")).toEqual([
      { email: "jo@x.example", name: "Jo Smith", company: "Smith Co", country: "CA", province_state: "AB", plan_interest: "growth" },
    ]);
  });
});
