// BF_PORTAL_v846_FRAUD - the Fraud check tab (all 15 checks, no plans, no check 3), the network map, Settings -> Fraud protection
// (Admins only, hidden in BI), and the colours.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), auth: vi.fn(), silo: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, put: h.put }, default: { get: h.get, post: h.post, put: h.put } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => h.auth() }));
vi.mock("@/hooks/useSilo", () => ({ useSilo: () => h.silo() }));
vi.mock("@/components/auth/RequireRole", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/pages/settings/tabs/ProfileSettings", () => ({ default: () => <div data-testid="profile-mock" /> }));

import FraudTab from "@/fraud/FraudTab";
import FraudProtectionCard from "@/fraud/FraudProtectionCard";
import NetworkGraph, { layoutNetwork, VIEW } from "@/fraud/NetworkGraph";
import { STATUS_STYLE, BAND_STYLE, contrast } from "@/fraud/status";
import SettingsPage from "@/pages/settings/SettingsPage";
import type { FraudCheck, FraudOverview, Network } from "@/fraud/fraudApi";

const ALL = Array.from({ length: 16 }, (_, i) => `fraud_${i + 1}`).filter((k) => k !== "fraud_3"); // no live-bank check

function overview(over: Partial<FraudOverview> = {}): FraudOverview {
  const checks: FraudCheck[] = ALL.map((key) => {
    const base = { key, label: `Check ${key}`, description: `What ${key} looks at.`, scope: key === "fraud_1" || key === "fraud_2" ? "document" : "application" } as FraudCheck;
    if (base.scope === "document") return { ...base, status: "per_document" };
    if (key === "fraud_11") return { ...base, label: "Loan stacking detector", status: "red", reasons: [{ code: "stacking_repayments", severity: "red", text: "15 daily payments to merchant growth look like advance repayments." }] };
    if (key === "fraud_6") return { ...base, status: "not_configured", reasons: [{ code: "not_configured", severity: "info", text: "The corporate registry lookup is not set up." }] };
    return { ...base, status: "green", reasons: [{ code: "ok", severity: "info", text: "Nothing found." }] };
  });
  return {
    application_id: "app-1",
    checks,
    documents: [{
      document_id: "d1", filename: "march-statement.pdf", category: "bank_statements_6_months",
      tamper: { status: "red", reasons: [{ code: "editor_producer", severity: "red", text: 'This bank statement was produced by editing software ("photoshop").' }], checked_at: "2026-10-22T12:00:00Z" },
      statement_math: { status: "amber", reasons: [{ code: "balance_breaks", severity: "amber", text: "1 running balance(s) do not add up." }], checked_at: "2026-10-22T12:00:00Z" },
    }],
    score: { score: 72, band: "high", reasons: [{ check: "fraud_11", label: "Loan stacking detector", severity: "red", text: "Daily repayments to another lender." }], covered: [], not_covered: [{ check: "fraud_6", label: "Business reality check", status: "not_configured", why: "not set up" }] },
    include_prescreen_in_package: false,
    queue: { queued: false, done_at: "2026-10-22T12:00:00Z", last_error: null },
    ...over,
  };
}

beforeEach(() => {
  for (const f of [h.get, h.post, h.put, h.auth, h.silo]) f.mockReset();
});

describe("Fraud check tab", () => {
  it("shows the score, document badges with reasons, every check, the network and the pre-screen - nothing locked", async () => {
    h.get.mockImplementation(async (url: string) => {
      if (url.endsWith("/network")) return { ok: true, network: { nodes: [{ id: "app:app-1", type: "application", label: "Acme", current: true }, { id: "id:phone:x", type: "phone", label: "Phone ...0100" }, { id: "app:f", type: "application", label: "Fraudco", fraud: true }], edges: [{ from: "app:app-1", to: "id:phone:x" }, { from: "id:phone:x", to: "app:f" }] } };
      if (url.endsWith("/prescreen")) return { ok: true, include_in_package: false, lines: ["Fraud pre-screen - Acme", "Fraud score: 72 / 100 (high risk)"] };
      return { ok: true, ...overview() };
    });
    h.put.mockResolvedValue({ ok: true, include_in_package: true });
    render(<FraudTab applicationId="app-1" />);
    await screen.findByTestId("fraud-score");
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("Fraud score: High risk")).toBeInTheDocument();
    const doc = screen.getByTestId("fraud-doc-d1");
    expect(within(doc).getByTestId("doc-tamper-chip")).toHaveTextContent("Concern");
    expect(within(doc).getByTestId("doc-math-chip")).toHaveTextContent("Worth a look");
    expect(within(doc).getByText(/produced by editing software/)).toBeInTheDocument();
    expect(screen.getByTestId("chip-fraud_11")).toHaveTextContent("Concern");
    expect(screen.getByTestId("chip-fraud_6")).toHaveTextContent("Not set up");
    expect(screen.getAllByTestId(/^fraud-check-fraud_/)).toHaveLength(14); // the score (16) is the card at the top
    expect(screen.queryByText(/plan/i)).toBeNull();
    expect(screen.queryByTestId("fraud-bank-link")).toBeNull(); // no Flinks LoginId box
    expect(screen.queryByText(/Flinks/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show the network map" }));
    expect(await screen.findByTestId("network-graph")).toBeInTheDocument();
    expect(screen.getByTestId("network-node-fraud")).toHaveTextContent("Fraud");
    fireEvent.click(screen.getByRole("checkbox", { name: /Add the pre-screen page/ }));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/fraud/applications/app-1/prescreen", { include_in_package: true }));
    fireEvent.click(screen.getByRole("button", { name: "Preview the pre-screen" }));
    expect(await screen.findByTestId("prescreen-text")).toHaveTextContent("Fraud score: 72 / 100");
  });

  it("run again asks the server to queue the checks", async () => {
    h.get.mockResolvedValue({ ok: true, ...overview() });
    h.post.mockResolvedValue({ ok: true, queued: true });
    render(<FraudTab applicationId="app-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Run checks again" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/fraud/applications/app-1/run", {}));
  });

  it("a server without the fraud suite, or a file in another silo, shows a plain message", async () => {
    h.get.mockResolvedValue({ ok: true });
    render(<FraudTab applicationId="app-1" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/not available on this server/);
  });
});

describe("network map", () => {
  const net: Network = {
    nodes: [{ id: "app:me", type: "application", label: "Me", current: true }, ...Array.from({ length: 4 }, (_, i) => ({ id: `id:${i}`, type: "email" as const, label: `Email ${i}` })), ...Array.from({ length: 12 }, (_, i) => ({ id: `app:${i}`, type: "application" as const, label: `App ${i}`, fraud: i === 0 }))],
    edges: [...Array.from({ length: 4 }, (_, i) => ({ from: "app:me", to: `id:${i}` })), ...Array.from({ length: 12 }, (_, i) => ({ from: `id:${i % 4}`, to: `app:${i}` }))],
  };
  it("keeps every node inside the picture and the current file in the middle", () => {
    const placed = layoutNetwork(net);
    expect(placed).toHaveLength(net.nodes.length);
    expect(placed[0]).toMatchObject({ id: "app:me", x: VIEW.w / 2, y: VIEW.h / 2 });
    for (const p of placed) {
      expect(p.x).toBeGreaterThanOrEqual(30);
      expect(p.x).toBeLessThanOrEqual(VIEW.w - 30);
      expect(p.y).toBeGreaterThanOrEqual(20);
      expect(p.y).toBeLessThanOrEqual(VIEW.h - 20);
    }
  });
  it("says so when nothing is linked", () => {
    render(<NetworkGraph network={{ nodes: [net.nodes[0]!], edges: [] }} />);
    expect(screen.getByTestId("network-empty")).toBeInTheDocument();
  });
});

describe("Settings -> Fraud protection", () => {
  const settings = (ready: boolean, over: Record<string, unknown> = {}) => ({
    ok: true,
    settings: { watchlist_opt_in: false, include_prescreen_in_package: false, updated_at: null },
    watchlist: { ready, why: ready ? null : "pepper" },
    services: [{ key: "voice", label: "Voice / deepfake analysis vendor", provider: "none", configured: false, setting: "not available yet", used_by: ["fraud_15"] }, { key: "domainAge", label: "Website and email domain age", provider: "rdap", configured: true, setting: "on", used_by: ["fraud_6"] }],
    ...over,
  });

  it("set up: the watchlist switch saves, staff alerts are listed, services show their state", async () => {
    h.get.mockImplementation(async (url: string) => (url.endsWith("/staff-alerts")
      ? { ok: true, alerts: [{ id: 1, kind: "banking_details_changed", severity: "red", application_id: "a1", created_at: "2026-10-22T05:00:00Z", staff_name: "Pat" }] }
      : settings(true)));
    h.put.mockResolvedValue({ ok: true, settings: { watchlist_opt_in: true, include_prescreen_in_package: false, updated_at: null }, ops: { told: true, error: null } });
    render(<FraudProtectionCard />);
    fireEvent.click(await screen.findByTestId("watchlist-opt-in"));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/fraud/settings", { watchlist_opt_in: true }));
    expect(await screen.findByText(/Pat changed the banking details on a file/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "open file" })).toHaveAttribute("href", "/applications/a1/fraud");
    const services = screen.getByTestId("fraud-services");
    expect(within(services).getByText("Voice / deepfake analysis vendor")).toBeInTheDocument();
    expect(within(services).getAllByText("Not set up")).toHaveLength(1);
  });

  it("not set up: says so and the watchlist switch cannot be turned on; the pre-screen default still saves", async () => {
    h.get.mockImplementation(async (url: string) => (url.endsWith("/staff-alerts") ? { ok: true, alerts: [] } : settings(false)));
    h.put.mockResolvedValue({ ok: true, settings: { watchlist_opt_in: false, include_prescreen_in_package: true, updated_at: null }, ops: { told: false, error: null } });
    render(<FraudProtectionCard />);
    expect(await screen.findByTestId("watchlist-not-set-up")).toHaveTextContent(/Not set up/);
    expect(screen.getByTestId("watchlist-opt-in")).toBeDisabled();
    expect(await screen.findByText("Nothing unusual recorded.")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("prescreen-default"));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/fraud/settings", { include_prescreen_in_package: true }));
  });

  it("shows a readable message when the server cannot load the settings", async () => {
    h.get.mockRejectedValue(new Error("Forbidden"));
    render(<FraudProtectionCard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Forbidden");
  });

  const renderSettings = (silo: string, role: string) => {
    h.silo.mockReturnValue({ silo });
    h.auth.mockReturnValue({ user: { role } });
    h.get.mockResolvedValue(settings(false));
    return render(
      <MemoryRouter initialEntries={["/settings/fraud"]}>
        <Routes><Route path="/settings/:tab" element={<SettingsPage />} /></Routes>
      </MemoryRouter>,
    );
  };

  it("is a Settings tab for BF Admins only (not Staff, not the BI silo)", async () => {
    renderSettings("BF", "Admin");
    expect(screen.getByRole("tab", { name: "Fraud protection" })).toBeInTheDocument();
    expect(await screen.findByTestId("settings-section-fraud")).toBeInTheDocument();
  });

  it("Staff and BI do not see it", () => {
    renderSettings("BF", "Staff");
    expect(screen.queryByRole("tab", { name: "Fraud protection" })).toBeNull();
  });

  it("BI Admins do not see it", () => {
    renderSettings("BI", "Admin");
    expect(screen.queryByRole("tab", { name: "Fraud protection" })).toBeNull();
  });
});

describe("readability", () => {
  it("every chip and notice has at least 4.5:1 contrast", () => {
    for (const s of [...Object.values(STATUS_STYLE), ...Object.values(BAND_STYLE)]) expect(contrast(s.fg, s.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#ffffff", "#1e3a8a")).toBeGreaterThanOrEqual(4.5); // primary button
  });
});
