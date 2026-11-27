// BF_PORTAL_BI_EMAIL_FLOWS_v1 - the Flows tab: numbers, the seven emails, start and pause.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/api", () => ({ api: h.api }));
vi.mock("@/api/sharedShell", () => ({ listStaffUsers: vi.fn(async () => [{ id: "u-1", first_name: "Sample", last_name: "Owner" }]) }));

import FlowsTab, { flowNumbers, type Flow } from "../tabs/FlowsTab";

const FLOW: Flow = { id: "f1", name: "Lenders - United States", preset: "lender_us", status: "draft", daily_new: 100, owner_user_id: "u-1", owner_name: "Sample Owner", from_name: null, reply_to: null,
  people: 120, waiting: 120, emailed: 0, not_opened: 0, opened: 0, clicked: 0, stopped: 0, emails_sent: 0 };
const EMAILS = [{ key: "e1", label: "First email (everyone)", subject: "Hello", body: "<p>Hi {{first_name}}</p>" }];
let flows: Flow[] = [];
const calls = () => h.api.mock.calls.map((c) => `${(c[1] as { method?: string } | undefined)?.method ?? "GET"} ${c[0]}`);

beforeEach(() => {
  flows = [FLOW];
  h.api.mockReset();
  h.api.mockImplementation(async (url: string, init?: { method?: string }) => {
    if (url === "/api/v1/bi/flows" && !init?.method) return { flows };
    if (url === "/api/v1/bi/flows/presets") return { presets: [{ key: "lender_us", name: "Lenders - United States" }, { key: "lender_ca", name: "Lenders - Canada" }] };
    if (url === "/api/v1/bi/flows/f1" && !init?.method) return { emails: EMAILS, not_yet_added: 7 };
    if (url === "/api/v1/bi/flows/collateral") return { items: [{ id: "11111111-1111-4111-8111-111111111111", name: "BI - US - SBA - 1 Pager", size_bytes: 1 }] };
    if (url === "/api/v1/bi/flows/f1/start") { flows = [{ ...FLOW, status: "active" }]; return { ok: true }; }
    return { ok: true, id: "f2", added: 7, sent: 7 };
  });
});

describe("the Flows tab", () => {
  it("lists the numbers in a fixed order", () => {
    expect(flowNumbers({ ...FLOW, emailed: 40, opened: 9, clicked: 2 }).map(([label]) => label))
      .toEqual(["People", "Waiting to start", "Emailed", "Not opened yet", "Opened", "Clicked", "Stopped"]);
  });

  it("shows a flow, offers only the flows not created yet, and needs an owner before creating one", async () => {
    render(<FlowsTab />);
    expect(await screen.findByText("Not started")).toBeInTheDocument();
    expect(screen.getByText(/Call tasks go to Sample Owner/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lenders - Canada" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lenders - United States" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lenders - Canada" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Pick who gets the call task");
    expect(calls()).not.toContain("POST /api/v1/bi/flows");
    fireEvent.change(screen.getByLabelText("Call task owner"), { target: { value: "u-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Lenders - Canada" }));
    await waitFor(() => expect(calls()).toContain("POST /api/v1/bi/flows"));
    const body = JSON.parse(String((h.api.mock.calls.find((c) => c[0] === "/api/v1/bi/flows" && (c[1] as any)?.method === "POST")![1] as any).body));
    expect(body).toMatchObject({ preset: "lender_ca", owner_user_id: "u-1", owner_name: "Sample Owner" });
  });

  it("opens the emails, saves changed wording and starts the flow - the tags decide who is in it", async () => {
    render(<FlowsTab />);
    fireEvent.click(await screen.findByRole("button", { name: "Emails and people" }));
    const subject = await screen.findByLabelText("First email (everyone) subject");
    expect(screen.getByText(/Everyone tagged for this flow is in it/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add the people/ })).not.toBeInTheDocument();
    fireEvent.change(subject, { target: { value: "A better subject" } });
    fireEvent.click(screen.getByRole("button", { name: "Save emails" }));
    await waitFor(() => expect(calls()).toContain("PATCH /api/v1/bi/flows/f1"));
    const saved = JSON.parse(String((h.api.mock.calls.find((c) => (c[1] as any)?.method === "PATCH")![1] as any).body));
    expect(saved.emails.e1.subject).toBe("A better subject");
    fireEvent.click(await screen.findByRole("button", { name: "Start" }));
    expect(await screen.findByText("Running")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("attaches a collateral PDF to an email and saves it", async () => {
    render(<FlowsTab />);
    fireEvent.click(await screen.findByRole("button", { name: "Emails and people" }));
    fireEvent.click(await screen.findByLabelText("BI - US - SBA - 1 Pager"));
    fireEvent.click(screen.getByRole("button", { name: "Save emails" }));
    await waitFor(() => expect(calls()).toContain("PATCH /api/v1/bi/flows/f1"));
    const saved = JSON.parse(String((h.api.mock.calls.find((c) => (c[1] as any)?.method === "PATCH")![1] as any).body));
    expect(saved.emails.e1.attachments).toEqual(["11111111-1111-4111-8111-111111111111"]);
  });
});
