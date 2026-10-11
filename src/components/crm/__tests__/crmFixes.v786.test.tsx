// BF_PORTAL_v786_CRM_FIXES - contact page without "Schedule conference" and with a wrapping
// action row; Meeting popup attendee autosuggest + top-level contactId; recording and
// automation timeline items.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ get: [] as string[], post: [] as Array<[string, any]>, timeline: [] as any[] }));
vi.mock("@/api", () => {
  const get = vi.fn(async (url: string) => {
    calls.get.push(url);
    if (url.startsWith("/api/recipients/suggest")) return { recipients: [{ id: "u7", name: "Andrew Polturak", email: "andrew.p@boreal.financial", kind: "staff" }] };
    if (url.startsWith("/api/meetings/people")) return { people: [{ userId: "u7", name: "Andrew Polturak", email: "andrew.p@boreal.financial", kind: "staff" }] };
    if (url.endsWith("/emails") || url.endsWith("/calls")) return { items: [] };
    return [];
  });
  const post = vi.fn(async (url: string, body: any) => { calls.post.push([url, body]); return { meeting: { code: "123456" }, delivery: null }; });
  return { api: Object.assign(get, { get, post, patch: vi.fn(async () => ({})), delete: vi.fn(async () => ({})) }) };
});
vi.mock("@/api/crm", () => ({
  crmApi: {
    getContact: vi.fn().mockResolvedValue({ id: "c1", name: "Jane Doe", email: "jane@example.com", phone: "+15551234567", created_at: new Date().toISOString() }),
    timeline: vi.fn(async () => calls.timeline),
    sharedMailboxes: vi.fn().mockResolvedValue({ mine: null, shared: [] }),
    meetings: { create: vi.fn(async () => ({})) },
  },
}));
vi.mock("@/components/ui/DateTimePicker", () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <input aria-label="When" value={value} onChange={(e) => onChange(e.target.value)} />,
}));

import ContactDetailPage from "@/pages/crm/contacts/ContactDetailPage";
import { MeetingPopup } from "@/components/crm/popups/MeetingPopup";
import { UnifiedTimeline, automationLine } from "@/components/crm/UnifiedTimeline";

beforeEach(() => { calls.get.length = 0; calls.post.length = 0; calls.timeline = []; });

describe("ContactDetailPage", () => {
  it("has no Schedule conference button and the action row wraps", async () => {
    render(
      <MemoryRouter initialEntries={["/crm/contacts/c1"]}>
        <Routes><Route path="/crm/contacts/:id" element={<ContactDetailPage />} /></Routes>
      </MemoryRouter>,
    );
    await screen.findByText("Jane Doe");
    expect(screen.queryByRole("button", { name: "Schedule conference" })).toBeNull();
    expect(screen.getByTestId("contact-action-row").style.flexWrap).toBe("wrap");
    const src = readFileSync("src/pages/crm/contacts/ContactDetailPage.tsx", "utf8");
    expect(src).not.toContain("MeetingRoomsPanel");
    expect(src).not.toContain("confOpen");
  });
});

describe("MeetingPopup", () => {
  const scope = { kind: "contact" as const, id: "c1" };

  it("suggests attendees by name for Teams meetings, pre-filled with the contact", async () => {
    render(<MeetingPopup scope={scope} onClose={vi.fn()} onCreated={vi.fn()} defaultEmail="jane@example.com" defaultName="Jane Doe" />);
    const box = within(screen.getByTestId("meeting-attendees")).getByRole("textbox");
    expect(box).toHaveValue("jane@example.com");
    fireEvent.change(box, { target: { value: "jane@example.com, andr" } });
    const option = await screen.findByText("Andrew Polturak");
    expect(calls.get.some((u) => u.startsWith("/api/recipients/suggest?q=andr"))).toBe(true);
    fireEvent.click(option);
    expect(box).toHaveValue("jane@example.com, andrew.p@boreal.financial, ");
  });

  it("uses the people picker for conference meetings and sends top-level contactId", async () => {
    const onCreated = vi.fn();
    render(<MeetingPopup scope={scope} onClose={vi.fn()} onCreated={onCreated} defaultEmail="jane@example.com" defaultName="Jane Doe" defaultPhone="+15551234567" />);
    fireEvent.change(screen.getByPlaceholderText("Title"), { target: { value: "Offer review" } });
    const [start, end] = screen.getAllByLabelText("When");
    fireEvent.change(start!, { target: { value: "2026-10-20T15:00:00.000Z" } });
    fireEvent.change(end!, { target: { value: "2026-10-20T16:00:00.000Z" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "conference" } });
    expect(screen.getAllByTestId("person-chip")[0]).toHaveTextContent("Jane Doe");
    fireEvent.change(screen.getByLabelText("Add people"), { target: { value: "andr" } });
    fireEvent.click(await screen.findByText("Andrew Polturak", {}, { timeout: 2000 }));
    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));
    await waitFor(() => expect(calls.post.length).toBe(1));
    const [url, body] = calls.post[0]!;
    expect(url).toBe("/api/meetings");
    expect(body.contactId).toBe("c1");
    expect(body.participants).toEqual([
      { contactId: "c1", userId: undefined, name: "Jane Doe", email: "jane@example.com", phone: "+15551234567" },
      { contactId: undefined, userId: "u7", name: "Andrew Polturak", email: "andrew.p@boreal.financial", phone: null },
    ]);
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
  });

  it("MeetingRoomsPanel sends contactId when it has a contact", () => {
    const src = readFileSync("src/pages/calendar/MeetingRoomsPanel.tsx", "utf8");
    expect(src).toContain("...(linkedContactId ? { contactId: linkedContactId } : {})");
  });
});

describe("UnifiedTimeline", () => {
  it("renders recordings with audio and an expandable transcript, and automation items", async () => {
    calls.timeline = [
      { kind: "recording", id: "r1", ts: "2026-10-10T15:00:00Z", title: "Call recording", body: null, extra: null, recording_url: "/api/recordings/r1/media", transcript: "Hello Jane, this is Andrew." },
      { kind: "automation", id: "a1", ts: "2026-10-09T15:00:00Z", title: null, body: null, extra: null, workflow_name: "New lead nurture", step: "Send email: Welcome" },
    ];
    render(<UnifiedTimeline contactId="c1" scope={{ kind: "contact", id: "c1" }} />);
    const rec = await screen.findByTestId("timeline-recording");
    const audio = rec.querySelector("audio")!;
    expect(audio.getAttribute("src")).toContain("/api/recordings/r1/media?token=");
    expect(screen.queryByText("Hello Jane, this is Andrew.")).toBeNull();
    fireEvent.click(within(rec).getByRole("button", { name: "Show transcript" }));
    expect(screen.getByText("Hello Jane, this is Andrew.")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-automation")).toHaveTextContent("Automation: New lead nurture - Send email: Welcome");
  });

  it("formats automation lines from title/body when the named fields are missing", () => {
    expect(automationLine({ title: "Re-engage", body: "Delay 2 days", workflow_name: null, step: null })).toBe("Automation: Re-engage - Delay 2 days");
  });
});
