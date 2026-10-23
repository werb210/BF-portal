// BF_PORTAL_v849_KS_SILO - Keystone silo: Admin-only switcher button, sidebar nav, sign-in gate and each screen
// rendered against a mocked KS-Ops (fetch). No call may go to BF-Server or carry X-Silo.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/authToken", () => ({ getAuthToken: () => "bf-portal-token-123" }));

const authUser = vi.fn();
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: authUser(), authStatus: "authenticated" }) }));
vi.mock("@/auth/AuthContext", () => ({ useAuth: () => ({ user: authUser(), authStatus: "authenticated" }) }));
vi.mock("@/hooks/useSilo", () => ({ useSilo: () => ({ silo: "bf", setSilo: vi.fn() }) }));
vi.mock("@/components/layout/Topbar", () => ({ default: () => <div data-testid="topbar-mock" /> }));
vi.mock("@/components/maya/MayaChat", () => ({ default: () => <div data-testid="maya-mock" /> }));

import BusinessUnitSelector from "@/components/BusinessUnitSelector";
import AppLayout from "@/layouts/AppLayout";
import KSSilo from "../KSSilo";
import { clearKsToken, KS_OPS_DEFAULT_URL } from "../ksApi";

const LIC_ID = "11111111-1111-4111-8111-111111111111";
const TICKET_ID = "22222222-2222-4222-8222-222222222222";
const REQ_ID = "33333333-3333-4333-8333-333333333333";

const licensee = {
  id: LIC_ID,
  company_name: "Acme Capital",
  legal_name: "Acme Capital Inc.",
  company_code: "acme",
  contact_name: "Jane Doe",
  contact_email: "jane@acme.test",
  contact_phone: "(403) 555-0123",
  country: "CA",
  province_state: "AB",
  mailing_address: null,
  website: null,
  status: "active",
  plan: "growth",
  billing_interval: "monthly",
  support_level: "email",
  seats: 5,
  extra_storage_blocks: 0,
  addons: { bank_connect: false },
  server_url: "https://acme-server.azurewebsites.net",
  portal_url: "https://acme-portal.azurestaticapps.net",
  client_url: null,
  has_ops_key: true,
  ops_key_rotated_at: null,
  stripe_customer_id: "cus_1",
  stripe_subscription_id: "sub_1",
  onboarding_fee_paid: true,
  plan_sync_status: "synced",
  plan_sync_error: null,
  plan_synced_at: null,
  pgi_link_status: "linked",
  mrr: 495,
  data_purge_on: null,
  created_at: "2026-10-01T00:00:00Z",
  last_report: { period: "2026-10", seats: 5, minutes: 120, texts: 40 },
};

type Call = { url: string; method: string; body: unknown; headers: Record<string, string> };
let calls: Call[] = [];
let exchangeStatus = 200;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function route(url: string, method: string): Response {
  const path = url.replace(KS_OPS_DEFAULT_URL, "").split("?")[0];
  if (path === "/api/ops/auth/exchange") {
    return exchangeStatus === 200
      ? json(200, { token: "ops-token", expires_in: 3600, user: { id: "u1", email: "todd@boreal.test", name: "Todd", role: "Admin" } })
      : json(403, { error: "not_allowed", message: "Your account is not on the Keystone operations list. Ask an owner to add you." });
  }
  if (path === "/api/ops/dashboard") {
    return json(200, {
      licensees: 4, by_status: { active: 3, trial: 1 }, seats: 21, mrr: 1234.5, trials_active: 1, past_due: 0,
      overdue_invoices: 0, overdue_amount: 0, open_tickets: 7, open_requests: 2, data_purges: [], data_purges_due: 0, currency: "CAD",
    });
  }
  if (path === "/api/ops/watchlist") return json(200, { opted_in_licensees: 2, files: 3, entries: 9 });
  if (path === "/api/ops/licensees") return json(200, { licensees: [licensee] });
  if (path === `/api/ops/licensees/${LIC_ID}/ops-key`) {
    return json(200, { licensee_id: LIC_ID, ops_key: "ksops_newkey123", message: "Copy this key now - it will not be shown again." });
  }
  if (path === `/api/ops/licensees/${LIC_ID}`) {
    if (method === "PATCH") return json(200, { licensee, plan_push: { ok: true }, billing_sync: null });
    return json(200, {
      licensee,
      pricing: { billable_seats: 5, seat_price: 99, seats: 495, support: 0, storage: 0, mrr: 495, onboarding_fee: 0 },
      usage: [{ period: "2026-10", seats: 5, minutes: 120, texts: 40, final: false }],
      invoices: [],
      tickets: [],
      notes: [],
      plan_changes: [],
      requests: [],
      audit: [{ id: 1, actor: "todd@boreal.test", action: "licensee.update", details: { seats: { from: 4, to: 5 } }, created_at: "2026-10-02T00:00:00Z" }],
    });
  }
  if (path === "/api/ops/tickets") {
    return json(200, {
      tickets: [
        { id: TICKET_ID, licensee_id: LIC_ID, subject: "Cannot upload documents", status: "open", priority: "high", source: "licensee", requester_name: "Jane", requester_email: "jane@acme.test", assigned_to: null, created_at: "2026-10-03T00:00:00Z", updated_at: "2026-10-03T00:00:00Z", company_name: "Acme Capital", company_code: "acme", message_count: 1 },
        { id: "44444444-4444-4444-8444-444444444444", licensee_id: null, subject: "Low priority question", status: "open", priority: "low", source: "staff", requester_name: null, requester_email: null, assigned_to: null, created_at: "2026-10-03T00:00:00Z", updated_at: "2026-10-03T00:00:00Z", message_count: 1 },
      ],
    });
  }
  if (path === `/api/ops/tickets/${TICKET_ID}/messages`) {
    return json(201, { message: { id: "m2", author_type: "staff", author_name: "Todd", author_email: null, body: "Fixed", internal: false, created_at: "2026-10-04T00:00:00Z" }, emailed: true });
  }
  if (path === `/api/ops/tickets/${TICKET_ID}`) {
    return json(200, {
      ticket: { id: TICKET_ID, licensee_id: LIC_ID, subject: "Cannot upload documents", status: "open", priority: "high", source: "licensee", requester_name: "Jane", requester_email: "jane@acme.test", assigned_to: null, created_at: "2026-10-03T00:00:00Z", updated_at: "2026-10-03T00:00:00Z", company_name: "Acme Capital", company_code: "acme" },
      messages: [{ id: "m1", author_type: "licensee", author_name: "Jane", author_email: "jane@acme.test", body: "Uploads fail with an error.", internal: false, created_at: "2026-10-03T00:00:00Z" }],
    });
  }
  if (path === "/api/ops/requests") {
    return json(200, {
      requests: [{ id: REQ_ID, licensee_id: LIC_ID, kind: "upgrade", current_plan: "growth", requested_plan: "pro", requested_extra_storage_blocks: null, requested_by: "jane@acme.test", message: "We are growing", status: "open", handled_by: null, handled_at: null, created_at: "2026-10-03T00:00:00Z", company_name: "Acme Capital", company_code: "acme" }],
    });
  }
  if (path === `/api/ops/requests/${REQ_ID}`) return json(200, { request: { id: REQ_ID, status: "done" } });
  return json(404, { error: "not_found" });
}

beforeEach(() => {
  calls = [];
  exchangeStatus = 200;
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

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

describe("Keystone silo visibility", () => {
  it("shows the Keystone switcher button to Admins and opens /silo/ks/dashboard", () => {
    authUser.mockReturnValue({ role: "admin" });
    render(
      <MemoryRouter initialEntries={["/portal"]}>
        <BusinessUnitSelector />
        <Where />
      </MemoryRouter>,
    );
    const ks = screen.getByRole("button", { name: "Keystone" });
    expect(ks.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(ks);
    expect(screen.getByTestId("where").textContent).toBe("/silo/ks/dashboard");
    expect(screen.getByRole("button", { name: "Keystone" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /financial/i }).getAttribute("aria-pressed")).toBe("false");
  });

  it("hides the Keystone button from non-Admin staff", () => {
    authUser.mockReturnValue({ role: "staff", silos: ["BF", "BI"] });
    render(
      <MemoryRouter>
        <BusinessUnitSelector />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: "Keystone" })).not.toBeInTheDocument();
  });

  it("shows the Keystone sidebar on /silo/ks pages for Admins only", () => {
    authUser.mockReturnValue({ role: "Admin", capabilities: [] });
    const { unmount } = render(
      <MemoryRouter initialEntries={["/silo/ks/dashboard"]}>
        <AppLayout><div>page</div></AppLayout>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Licensees" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Support" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sales pipeline" })).toBeInTheDocument(); // BF_PORTAL_v850_KS_CRM
    expect(screen.queryByRole("link", { name: "Pipeline" })).not.toBeInTheDocument();
    unmount();
    authUser.mockReturnValue({ role: "Staff", capabilities: [] });
    render(
      <MemoryRouter initialEntries={["/silo/ks/dashboard"]}>
        <AppLayout><div>page</div></AppLayout>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link", { name: "Licensees" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pipeline" })).toBeInTheDocument();
  });
});

describe("Keystone silo screens (mocked KS-Ops)", () => {
  it("explains when KS-Ops refuses the user", async () => {
    exchangeStatus = 403;
    renderKs("/silo/ks/dashboard");
    expect(await screen.findByText("You do not have access to Keystone operations")).toBeInTheDocument();
    expect(screen.getByText(/not on the Keystone operations list/)).toBeInTheDocument();
  });

  it("dashboard shows MRR, counts and watchlist totals", async () => {
    renderKs("/silo/ks/dashboard");
    expect(await screen.findByText("$1,234.50")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(await screen.findByText(/2 licensees sharing, 3 files, 9 entries/)).toBeInTheDocument();
    expectOnlyKsOps();
  });

  it("licensees list shows each licensee with its status", async () => {
    renderKs("/silo/ks/licensees");
    expect(await screen.findByRole("link", { name: "Acme Capital" })).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expectOnlyKsOps();
  });

  it("licensee detail shows addresses and audit, and rotating the ops key shows it once", async () => {
    renderKs(`/silo/ks/licensees/${LIC_ID}`);
    expect(await screen.findByText("https://acme-server.azurewebsites.net")).toBeInTheDocument();
    expect(screen.getByText("licensee.update")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("ks-rotate-key"));
    expect(await screen.findByText("ksops_newkey123")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST" && c.url.endsWith(`/api/ops/licensees/${LIC_ID}/ops-key`))).toBe(true);
    expectOnlyKsOps();
  });

  it("licensee detail saves a seat change with PATCH after confirming", async () => {
    renderKs(`/silo/ks/licensees/${LIC_ID}`);
    const seats = await screen.findByLabelText("Seats");
    fireEvent.change(seats, { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Save 1 change" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    const patch = calls.find((c) => c.method === "PATCH")!;
    expect(patch.body).toEqual({ seats: 6 });
  });

  it("support inbox filters by priority and opens the thread; a reply is posted", async () => {
    renderKs("/silo/ks/tickets");
    expect(await screen.findByRole("link", { name: "Cannot upload documents" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Low priority question" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ticket priority filter"), { target: { value: "high" } });
    expect(screen.queryByRole("link", { name: "Low priority question" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Cannot upload documents" }));
    expect(await screen.findByText("Uploads fail with an error.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reply"), { target: { value: "Fixed" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));
    expect(await screen.findByText("Reply sent by email.")).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST" && c.url.endsWith(`/api/ops/tickets/${TICKET_ID}/messages`))!;
    expect(post.body).toEqual({ body: "Fixed", internal: false });
    expectOnlyKsOps();
  });

  it("requests list approves a request with PATCH status done", async () => {
    renderKs("/silo/ks/requests");
    expect(await screen.findByText("We are growing")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    const patch = calls.find((c) => c.method === "PATCH")!;
    expect(patch.url).toBe(`${KS_OPS_DEFAULT_URL}/api/ops/requests/${REQ_ID}`);
    expect(patch.body).toEqual({ status: "done" });
    expectOnlyKsOps();
  });
});
