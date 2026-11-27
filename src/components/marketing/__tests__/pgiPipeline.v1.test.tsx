// BF_PORTAL_PGI_PIPELINE_v1
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const h = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock("@/api", () => ({ api: h.call }));
vi.mock("@/api/sharedShell", () => ({ listStaffUsers: async () => [] }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
import OutreachPanel, { PGI_OUTREACH } from "../OutreachPanel";
import { cardLines } from "../PgiPipeline";

const meta = {
  stages: [{ key: "emailed", label: "Emailed" }, { key: "replied", label: "Replied" }, { key: "demo", label: "Demo" }],
  replyKinds: {}, emailLabels: { e1: "First email (everyone)", n2: "Not opened, week 1", o1: "Opened: more details", c1: "Clicked: let's talk" },
  moves: [{ key: "initial_call", label: "Initial call" }, { key: "demo", label: "Demo" }, { key: "auto", label: "Back to the email stages" }],
};
const card = { contact_id: "c1", stage: "replied", stage_at: new Date().toISOString(), flow_name: "Lenders - Canada", full_name: "Pat Lee", organization_name: "Bank of Test",
  email: "pat@bank.test", phone_e164: null, sent_keys: ["e1", "n2", "o1"], replied_key: "o1", reply_snippet: "Tell me more", replied_at: new Date().toISOString(),
  last_reply_at: new Date().toISOString(), responded_at: null, meeting_at: null, booked_at: null, demo_at: null, signed_up_at: null, lost_at: null, lost_reason: null,
  opened_at: new Date().toISOString(), clicked_at: null };

beforeEach(() => {
  h.call.mockReset();
  h.call.mockImplementation(async (path: string) => {
    if (path.endsWith("/meta")) return meta;
    if (path.includes("/board")) return { stages: [{ key: "emailed", label: "Emailed", count: 0, cards: [] }, { key: "replied", label: "Replied", count: 3, cards: [card] }, { key: "demo", label: "Demo", count: 0, cards: [] }] };
    if (path.includes("/action")) return { ok: true };
    return {};
  });
});

describe("PGI pipeline", () => {
  it("has only Pipeline, Results and Settings", async () => {
    render(<MemoryRouter><OutreachPanel backend={PGI_OUTREACH} /></MemoryRouter>);
    expect(await screen.findByText("Pat Lee")).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Pipeline", "Results", "Settings"]);
    expect(screen.getByText("First emails: 2 of 4 (last: Not opened, week 1)")).toBeInTheDocument();
    expect(screen.getByText(/Replied to "Opened: more details"/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show more (2)" })).toBeInTheDocument();
  });
  it("opens the CRM contact when a card is clicked", async () => {
    render(<MemoryRouter initialEntries={["/x"]}><Routes><Route path="/x" element={<OutreachPanel backend={PGI_OUTREACH} />} /><Route path="/silo/bi/crm/contacts/:id" element={<p>Contact card</p>} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByText("Pat Lee"));
    expect(await screen.findByText("Contact card")).toBeInTheDocument();
  });
  it("moves a card with Move to, and Undo puts it back", async () => {
    render(<MemoryRouter><OutreachPanel backend={PGI_OUTREACH} /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText("Move Pat Lee to"), { target: { value: "demo" } });
    await waitFor(() => expect(h.call).toHaveBeenCalledWith("/api/v1/bi/engagement/contacts/c1/action", expect.objectContaining({ body: JSON.stringify({ action: "demo" }) })));
    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
    await waitFor(() => expect(h.call).toHaveBeenCalledWith("/api/v1/bi/engagement/contacts/c1/action", expect.objectContaining({ body: JSON.stringify({ action: "auto" }) })));
  });
  it("says which follow-up emails went out", () => {
    const lines = cardLines({ ...card, stage: "clicked", clicked_at: new Date().toISOString(), replied_at: null, sent_keys: ["e1", "o1", "c1"] }, meta as any);
    expect(lines).toEqual(["First emails: 1 of 4 (last: First email (everyone))", '"Opened" email sent', '"Clicked" email sent']);
  });
});
