// BF_PORTAL_OUTREACH_TRACKING_v1
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock("@/api", () => ({ api: h.call }));
vi.mock("@/api/sharedShell", () => ({ listStaffUsers: async () => [{ id: "u1", first_name: "Andrew", last_name: "P" }] }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
import OutreachPanel, { KS_OUTREACH, PGI_OUTREACH } from "../OutreachPanel";

const card = { contact_id: "c1", stage: "replied", stage_at: new Date().toISOString(), flow_name: "Lender PGI", reply_kind: "question", reply_subject: "RE", reply_snippet: "Does it apply to our customers?",
  owner_user_id: "u1", owner_name: "Andrew", follow_up_due_at: new Date(Date.now() - 3_600_000).toISOString(), follow_up_reason: "replied", meeting_at: null, meeting_outcome: null,
  full_name: "Danny L", organization_name: "Armada", email: "d@armada.test", phone_e164: null, overdue: true };

beforeEach(() => {
  h.call.mockReset();
  h.call.mockImplementation(async (path: string, init?: any) => {
    if (path.endsWith("/meta")) return { stages: [{ key: "met", label: "Call held" }], replyKinds: { question: "Question", interested: "Interested" } };
    if (path.endsWith("/queue")) return { items: [card] };
    if (path.includes("/action")) return { ok: true, contact: card, _init: init };
    return {};
  });
});

describe("OutreachPanel", () => {
  it("lists who is waiting, overdue first, with the reply and one-click outcomes (PGI on BI-Server)", async () => {
    render(<MemoryRouter><OutreachPanel backend={PGI_OUTREACH} /></MemoryRouter>);
    expect(await screen.findByText("Danny L")).toBeInTheDocument();
    expect(screen.getByText("1 overdue")).toBeInTheDocument();
    expect(screen.getByText("Does it apply to our customers?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Followed up" }));
    await waitFor(() => expect(h.call).toHaveBeenCalledWith("/api/v1/bi/engagement/contacts/c1/action", expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "followed_up" }) })));
  });
  it("talks to BF-Server as Keystone", async () => {
    render(<MemoryRouter><OutreachPanel backend={KS_OUTREACH} /></MemoryRouter>);
    await screen.findByText("Danny L");
    expect(h.call).toHaveBeenCalledWith("/api/crm/engagement/queue", expect.objectContaining({ headers: { "X-Silo": "KS" } }));
  });
  // BF_PORTAL_OUTREACH_UNDO_v1
  it("offers Undo after Followed up and puts the person back", async () => {
    render(<MemoryRouter><OutreachPanel backend={PGI_OUTREACH} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Followed up" }));
    expect(await screen.findByText(/Danny L marked followed up/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(h.call).toHaveBeenCalledWith("/api/v1/bi/engagement/contacts/c1/action", expect.objectContaining({ body: JSON.stringify({ action: "requeue" }) })));
  });
});
