// BF_PORTAL_CALENDAR_CALL_v745 / BF_PORTAL_MEETING_CONFERENCE_v745
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  apiFn.put = vi.fn();
  apiFn.patch = vi.fn();
  apiFn.delete = vi.fn();
  return { apiFn, startOutboundPstn: vi.fn(), joinMeetingRoom: vi.fn() };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/dialer/actions", () => ({ startOutboundPstn: h.startOutboundPstn, joinMeetingRoom: h.joinMeetingRoom }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "me", role: "Admin" } }) }));
vi.mock("@/components/auth/RequireRole", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/pages/calendar/CalendarTasksPanel", () => ({ default: () => null }));
vi.mock("@/pages/calendar/MeetingRoomsPanel", () => ({ default: () => null, describeMeetingDelivery: () => ({ ok: true, text: "" }) }));
vi.mock("@/components/o365/FindATimePanel", () => ({ default: () => null }));
// react-big-calendar does not lay out in jsdom; list the events as buttons that select them.
vi.mock("react-big-calendar", () => ({
  dateFnsLocalizer: () => ({}),
  Calendar: ({ events, onSelectEvent }: { events: Array<{ id: string; title: string }>; onSelectEvent: (e: unknown) => void }) => (
    <div>{events.map((e) => <button key={e.id} type="button" onClick={() => onSelectEvent(e)}>{`event: ${e.title}`}</button>)}</div>
  ),
}));
vi.mock("@/components/ui/DateTimePicker", () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <input aria-label="When" value={value} onChange={(e) => onChange(e.target.value)} />,
}));

import { phoneFromEvent, prettyPhone } from "../eventPhone";
import CalendarPage from "../CalendarPage";
import { MeetingPopup, roomMinutes } from "@/components/crm/popups/MeetingPopup";
import { ActionBar } from "@/components/crm/ActionBar";

beforeEach(() => {
  for (const m of [h.apiFn, h.apiFn.get, h.apiFn.post, h.startOutboundPstn]) m.mockReset();
  h.apiFn.get.mockImplementation(async (url: string) => {
    if (url === "/api/calendar/events") {
      return [
        { id: "e1", title: "Call with Sam", start: "2026-10-12T15:00:00Z", end: "2026-10-12T15:30:00Z", location: "Phone call - Boreal calls 5875551234", notes: null },
        { id: "e2", title: "Teams sync", start: "2026-10-12T17:00:00Z", end: "2026-10-12T17:30:00Z", location: "Microsoft Teams", notes: "Callers dial (866) 631-8939, press 3" },
      ];
    }
    return [];
  });
  h.apiFn.post.mockResolvedValue({ meeting: { code: "123456" }, delivery: null });
});

function renderCalendar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><CalendarPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("calendar event Call button", () => {
  it("finds the number in a booked call's location or notes", () => {
    expect(phoneFromEvent("Phone call - Boreal calls 5875551234", null)).toBe("+15875551234");
    expect(phoneFromEvent(null, "We will call you at (403) 555-0199. Notes: hi")).toBe("+14035550199");
    expect(phoneFromEvent("Phone call: +1 780-555-0100")).toBe("+17805550100");
  });
  it("never offers Boreal's own line, dates or short numbers", () => {
    expect(phoneFromEvent("Callers dial (866) 631-8939, press 3")).toBeNull();
    expect(phoneFromEvent("10/5/2026, 9:00:00 AM", "code 123456")).toBeNull();
    expect(phoneFromEvent("Microsoft Teams")).toBeNull();
  });
  it("shows the number readably and calls through the dialler", async () => {
    expect(prettyPhone("+15875551234")).toBe("(587) 555-1234");
    renderCalendar();
    fireEvent.click(await screen.findByRole("button", { name: "event: Call with Sam" }));
    const call = screen.getByTestId("calendar-event-call");
    expect(call).toHaveTextContent("Call (587) 555-1234");
    fireEvent.click(call);
    expect(h.startOutboundPstn).toHaveBeenCalledWith("+15875551234", { contactName: "Call with Sam", source: "calendar" });
    expect(screen.queryByTestId("calendar-event-call")).not.toBeInTheDocument();
  });
  it("offers no Call button on an event without a callable number", async () => {
    renderCalendar();
    fireEvent.click(await screen.findByRole("button", { name: "event: Teams sync" }));
    expect(screen.getByText("Teams sync", { selector: "h3" })).toBeInTheDocument();
    expect(screen.queryByTestId("calendar-event-call")).not.toBeInTheDocument();
  });
});

describe("Meeting form conference option", () => {
  it("offers a conference room beside Teams, phone and in person, and books it through /api/meetings", async () => {
    const onCreated = vi.fn();
    render(<MeetingPopup scope={{ kind: "contact", id: "c1" }} onClose={vi.fn()} onCreated={onCreated} />);
    const type = screen.getByRole("combobox") as HTMLSelectElement;
    expect(Array.from(type.options).map((o) => o.textContent)).toEqual([
      "Microsoft Teams meeting (auto link)",
      "Phone call (we call the client)",
      "Conference call (dial-in code, up to 10 people)",
      "In person / other",
    ]);
    fireEvent.change(screen.getByPlaceholderText("Title"), { target: { value: "Offer review" } });
    const [start, end] = screen.getAllByLabelText("When");
    fireEvent.change(start!, { target: { value: "2026-10-06T15:00:00Z" } });
    fireEvent.change(end!, { target: { value: "2026-10-06T16:30:00Z" } });
    fireEvent.change(type, { target: { value: "conference" } });
    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledTimes(1));
    const [url, body] = h.apiFn.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe("/api/meetings");
    expect(body).toMatchObject({ title: "Offer review", startsAt: "2026-10-06T15:00:00.000Z", durationMin: 90, contactId: "c1" });
    expect(await screen.findByTestId("meeting-room-result")).toHaveTextContent("Access code 123456");
    expect(onCreated).toHaveBeenCalled();
  });

  it("the CRM action bar hands the contact's name to the meeting form", () => {
    render(<ActionBar scope={{ kind: "contact", id: "c1" }} contactName="Jane Doe" contactEmail="jane@example.com" onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Meeting" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "conference" } });
    const chip = screen.getAllByTestId("person-chip")[0]!;
    expect(within(chip).getByText(/Jane Doe/)).toBeInTheDocument();
  });

  it("turns the start and end into a room length of 15 to 240 minutes", () => {
    expect(roomMinutes("2026-10-06T15:00:00Z", "2026-10-06T16:30:00Z")).toBe(90);
    expect(roomMinutes("2026-10-06T15:00:00Z", "2026-10-06T15:05:00Z")).toBe(15);
    expect(roomMinutes("2026-10-06T15:00:00Z", "2026-10-07T15:00:00Z")).toBe(240);
  });
});
