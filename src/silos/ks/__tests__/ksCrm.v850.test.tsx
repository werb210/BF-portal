// BF_PORTAL_v850_KS_CRM - the Keystone CRM: CRM and communications calls made from /silo/ks/crm pages carry
// X-Silo: KS (and nothing else changes for BF/BI/SLF), who sees it, the sidebar, the routes, the reused BF screens'
// links, and the Keystone sales pipeline board.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("@/lib/authToken", () => ({ getAuthToken: () => "bf-portal-token-123" }));
const authUser = vi.fn();
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: authUser(), authStatus: "authenticated" }) }));
vi.mock("@/auth/AuthContext", () => ({ useAuth: () => ({ user: authUser(), authStatus: "authenticated" }) }));
vi.mock("@/hooks/useSilo", () => ({ useSilo: () => ({ silo: "bf", setSilo: vi.fn() }) }));
vi.mock("@/components/layout/Topbar", () => ({ default: () => <div data-testid="topbar-mock" /> }));
vi.mock("@/components/maya/MayaChat", () => ({ default: () => <div data-testid="maya-mock" /> }));
vi.mock("../crm/KsCrm", () => ({ default: () => <div data-testid="ks-crm-mock">Keystone CRM</div> }));

import { api } from "@/api";
import { crmApi } from "@/api/crm";
import { getActiveSilo, isKsScopedApiPath } from "@/config/api";
import { SiloMismatchError } from "@/api/siloGuard";
import AppLayout from "@/layouts/AppLayout";
import BusinessUnitSelector from "@/components/BusinessUnitSelector";
import KSSilo from "../KSSilo";
import KsPipeline, { demoProgress, planLine, type KsCard } from "../crm/KsPipeline";
import { canSeeKeystone, canUseKeystoneCrm, ksHomeFor, ksNavFor } from "../ksAccess";
import { CrmBaseProvider } from "@/pages/crm/crmBase";
import ContactsPage from "@/pages/crm/contacts/ContactsPage";

const fetchMock = vi.fn();
const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, url: "", headers: new Headers(), json: async () => body, clone() { return this; }, text: async () => JSON.stringify(body) }) as unknown as Response;
const siloOf = (call: unknown[]) => ((call[1] as RequestInit).headers as Record<string, string>)["X-Silo"];
const goTo = (path: string) => window.history.pushState({}, "", path);

beforeEach(() => {
  fetchMock.mockReset().mockImplementation(async () => json(200, { data: [] }));
  vi.stubGlobal("fetch", fetchMock);
  authUser.mockReturnValue({ role: "Admin" });
  window.sessionStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  goTo("/");
});

describe("X-Silo on Keystone CRM pages", () => {
  it("CRM and communications calls from /silo/ks/crm carry KS; other calls keep the topbar silo", async () => {
    goTo("/silo/ks/crm/contacts");
    await api.get("/api/crm/contacts");
    await api.post("/api/communications/sms", { to: "+14035550123", body: "hi" });
    await api.get("/api/users");
    expect(fetchMock.mock.calls.map(siloOf)).toEqual(["KS", "KS", "BF"]);
    expect(getActiveSilo("/api/v1/bi/crm/contacts")).toBe("BF");
    expect(getActiveSilo()).toBe("BF");
  });

  it("BF pages and the Keystone operations pages are unchanged", async () => {
    goTo("/crm/contacts");
    await api.get("/api/crm/contacts");
    goTo("/silo/ks/dashboard");
    await api.get("/api/crm/contacts");
    window.sessionStorage.setItem("staff-portal.business-unit", "BI");
    goTo("/silo/bi/crm");
    await api.get("/api/crm/contacts");
    expect(fetchMock.mock.calls.map(siloOf)).toEqual(["BF", "BF", "BI"]);
  });

  it("the cross-silo guard refuses BF rows on a Keystone page", async () => {
    goTo("/silo/ks/crm/contacts");
    fetchMock.mockImplementation(async () => json(200, { data: [{ id: "c1", silo: "BF" }] }));
    await expect(api.get("/api/crm/contacts")).rejects.toBeInstanceOf(SiloMismatchError);
    fetchMock.mockImplementation(async () => json(200, { data: [{ id: "c1", silo: "KS" }] }));
    await expect(api.get("/api/crm/contacts")).resolves.toEqual([{ id: "c1", silo: "KS" }]);
    for (const list of [crmApi.listContactsPaged, crmApi.listCompaniesPaged]) {
      for (const silo of ["BF", "BI", "SLF"]) {
        fetchMock.mockImplementation(async () => json(200, { data: [{ id: "c1", silo }], meta: { total: 500 } }));
        await expect(list()).rejects.toBeInstanceOf(SiloMismatchError);
      }
      fetchMock.mockImplementation(async () => json(200, { data: [{ id: "c1", silo: "KS" }], meta: { total: 500 } }));
      await expect(list()).resolves.toEqual({ rows: [{ id: "c1", silo: "KS" }], total: 500 });
    }
  });

  it("scopes only CRM / communications paths", () => {
    for (const p of ["/api/crm/contacts?x=1", "/api/ks/crm/pipeline", "/api/tasks", "/api/voice/calls", "/api/telephony/token", "/api/o365/mail/send", "/api/meetings"]) {
      expect(isKsScopedApiPath(p)).toBe(true);
    }
    for (const p of ["/api/users", "/api/templates", "/api/settings", "/api/crmx", "/api/v1/bi/crm"]) {
      expect(isKsScopedApiPath(p)).toBe(false);
    }
  });
});

describe("who sees the Keystone CRM", () => {
  it("Admins, and Staff / Marketing with KS in their silo access", () => {
    expect(canUseKeystoneCrm({ role: "Admin" })).toBe(true);
    expect(canUseKeystoneCrm({ role: "Marketing", silos: ["BF", "BI", "KS"] })).toBe(true);
    expect(canUseKeystoneCrm({ role: "Staff", silos: ["ks"] })).toBe(true);
    expect(canUseKeystoneCrm({ role: "Marketing", silos: ["BF", "BI"] })).toBe(false);
    expect(canUseKeystoneCrm({ role: "Ops", silos: ["KS"] })).toBe(false);
    expect(ksHomeFor({ role: "Admin" })).toBe("/silo/ks/dashboard");
    expect(ksHomeFor({ role: "Marketing", silos: ["KS"] })).toBe("/silo/ks/crm/contacts");
    expect(ksNavFor({ role: "Marketing", silos: ["KS"] }).map((n) => n.label)).toEqual(["Contacts", "Companies", "Sales pipeline", "Tasks"]);
    expect(ksNavFor({ role: "Admin" }).map((n) => n.label)).toContain("Licensees");
    expect(canSeeKeystone({ role: "Staff", silos: ["BF"] })).toBe(false);
  });

  it("a KS-enabled Marketing user gets the Keystone button (to the CRM) and the CRM sidebar only", () => {
    authUser.mockReturnValue({ role: "Marketing", silos: ["BF", "KS"], capabilities: [] });
    function Where() {
      return <div data-testid="where">{useLocation().pathname}</div>;
    }
    const { unmount } = render(
      <MemoryRouter initialEntries={["/portal"]}>
        <BusinessUnitSelector />
        <Where />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Keystone" }));
    expect(screen.getByTestId("where").textContent).toBe("/silo/ks/crm/contacts");
    unmount();
    render(
      <MemoryRouter initialEntries={["/silo/ks/crm/contacts"]}>
        <AppLayout><div>page</div></AppLayout>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Sales pipeline" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Licensees" })).not.toBeInTheDocument();
  });

  it("routes: the CRM for KS-enabled staff, operations for Admins only", () => {
    authUser.mockReturnValue({ role: "Marketing", silos: ["BF", "KS"] });
    const at = (path: string) =>
      render(
        <MemoryRouter initialEntries={[path]}>
          <Routes><Route path="/silo/ks/*" element={<KSSilo />} /></Routes>
        </MemoryRouter>,
      );
    const a = at("/silo/ks/dashboard");
    expect(screen.getByTestId("ks-crm-mock")).toBeInTheDocument();
    a.unmount();
    authUser.mockReturnValue({ role: "Staff", silos: ["BF"] });
    at("/silo/ks/crm/contacts");
    expect(screen.queryByTestId("ks-crm-mock")).not.toBeInTheDocument();
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
  });
});

const card = (over: Partial<KsCard>): KsCard => ({
  kind: "company", id: "co-1", stage: "lead", company_id: "co-1", company_name: "Acme Roofing", contact_id: "ct-1",
  contact_name: "Ada Lovelace", contact_email: "ada@example.com", contact_phone: null, plan: null, seats: null,
  status: null, demo_opened_at: null, demo_steps: 0, demo_completed_at: null, last_event_summary: null,
  last_event_at: null, updated_at: null, ...over,
});

describe("Keystone sales pipeline", () => {
  it("summarises demo progress and plan / seats", () => {
    expect(demoProgress(card({ demo_opened_at: "2026-10-23T10:00:00Z" }))).toBe("Demo opened");
    expect(demoProgress(card({ demo_steps: 3 }))).toBe("Demo: 3 steps done");
    expect(demoProgress(card({ demo_steps: 3, demo_completed_at: "2026-10-23T11:00:00Z" }))).toBe("Demo finished");
    expect(planLine(card({ plan: "pro", seats: 5, status: "active" }))).toBe("Plan: pro - 5 seats - active");
    expect(planLine(card({}))).toBeNull();
  });

  it("shows a column per stage with its cards, and moving a card saves the stage", async () => {
    goTo("/silo/ks/crm/pipeline");
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (String(url).includes("/api/ks/crm/pipeline/stage")) return json(200, { ok: true, silo: "KS" });
      return json(200, {
        ok: true,
        silo: "KS",
        stages: [
          { key: "lead", label: "Lead" }, { key: "demo_started", label: "Demo started" }, { key: "demo_finished", label: "Demo finished" },
          { key: "signed_up", label: "Signed up" }, { key: "paying", label: "Paying" }, { key: "lost", label: "Lost" },
        ],
        cards: [
          card({ stage: "signed_up", plan: "pro", seats: 5, demo_steps: 2 }),
          card({ kind: "contact", id: "ct-9", company_id: null, company_name: null, contact_id: "ct-9", contact_name: "Bo Diddley", stage: "demo_started", demo_opened_at: "2026-10-23T10:00:00Z" }),
        ],
      });
      void init;
    });
    render(
      <MemoryRouter initialEntries={["/silo/ks/crm/pipeline"]}>
        <KsPipeline />
      </MemoryRouter>,
    );
    const signedUp = await screen.findByTestId("ks-stage-signed_up");
    await within(signedUp).findByText("Acme Roofing");
    expect(within(signedUp).getByText("Acme Roofing").closest("a")?.getAttribute("href")).toBe("/silo/ks/crm/companies/co-1");
    expect(within(signedUp).getByText("Ada Lovelace").closest("a")?.getAttribute("href")).toBe("/silo/ks/crm/contacts/ct-1");
    expect(within(signedUp).getByText("Plan: pro - 5 seats")).toBeInTheDocument();
    expect(within(signedUp).getByText("Demo: 2 steps done")).toBeInTheDocument();
    expect(within(screen.getByTestId("ks-stage-demo_started")).getByText("Demo opened")).toBeInTheDocument();
    expect(fetchMock.mock.calls.every((c) => siloOf(c) === "KS")).toBe(true);

    fireEvent.change(screen.getByLabelText("Stage for Acme Roofing"), { target: { value: "paying" } });
    await waitFor(() => expect(within(screen.getByTestId("ks-stage-paying")).getByText("Acme Roofing")).toBeInTheDocument());
    const patch = fetchMock.mock.calls.find((c) => String(c[0]).includes("/pipeline/stage"))!;
    expect((patch[1] as RequestInit).method).toBe("PATCH");
    expect(JSON.parse(String((patch[1] as RequestInit).body))).toEqual({ kind: "company", id: "co-1", stage: "paying" });
    expect(siloOf(patch)).toBe("KS");
    expect(await screen.findByText("Acme Roofing moved to Paying.")).toBeInTheDocument();
  });

  it("puts the card back and says so when the move fails", async () => {
    goTo("/silo/ks/crm/pipeline");
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("/pipeline/stage")) return json(403, { error: "ks_access_required" });
      return json(200, { ok: true, silo: "KS", cards: [card({ stage: "lead" })] });
    });
    render(
      <MemoryRouter>
        <KsPipeline />
      </MemoryRouter>,
    );
    await within(await screen.findByTestId("ks-stage-lead")).findByText("Acme Roofing");
    fireEvent.change(screen.getByLabelText("Stage for Acme Roofing"), { target: { value: "lost" } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/Could not move the card/);
    expect(within(screen.getByTestId("ks-stage-lead")).getByText("Acme Roofing")).toBeInTheDocument();
  });
});

describe("the BF CRM screens inside Keystone", () => {
  it("the contact list loads Keystone contacts (X-Silo KS) and links stay under /silo/ks/crm", async () => {
    goTo("/silo/ks/crm/contacts");
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("/api/crm/contacts")) {
        return json(200, { data: [{ id: "ct-1", name: "Ada Lovelace", email: "ada@example.com", silo: "KS", tags: [] }], meta: { total: 1 } });
      }
      return json(200, { data: [] });
    });
    render(
      <MemoryRouter initialEntries={["/silo/ks/crm/contacts"]}>
        <CrmBaseProvider base="/silo/ks/crm">
          <ContactsPage />
        </CrmBaseProvider>
      </MemoryRouter>,
    );
    const link = await screen.findByRole("link", { name: /Ada Lovelace/ });
    expect(link.getAttribute("href")).toBe("/silo/ks/crm/contacts/ct-1");
    const crmCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes("/api/crm/contacts"));
    expect(crmCalls.length).toBeGreaterThan(0);
    expect(crmCalls.every((c) => siloOf(c) === "KS")).toBe(true);
  });
});
