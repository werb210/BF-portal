// BF_PORTAL_v871_CALL_QUEUES - Settings > Call queues (live panel, set-up, my availability) and queues in the 866 menu.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), role: "Admin", call: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, put: h.put }, default: { get: h.get, post: h.post, put: h.put } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: h.role } }) }));
vi.mock("@/dialer/actions", () => ({ startOutboundPstn: h.call }));

import CallQueuesSettings from "../CallQueuesSettings";
import PhoneMenuSettings from "@/settingsPack/PhoneMenuSettings";

const Q = "q1", SAM = "u1", SUE = "u2";
const setup = { queues: [{ id: Q, silo: "BF", name: "Sales", greeting: "Hi", hold_message: "", hold_audio_id: null, announce_position: true, max_wait_seconds: 300, ring_seconds: 20, overflow: "ask", overflow_user_id: null, archived_at: null, member_ids: [SAM, SUE] }],
  main_line_queue_id: null, users: [{ id: SAM, name: "Sam Broker" }, { id: SUE, name: "Sue Broker" }], audio: [{ id: "a1", file_name: "jazz.mp3" }] };
const live = {
  queues: [{ id: Q, name: "Sales", max_wait_seconds: 300,
    waiting: [{ id: "c1", position: 1, from: "+14035550111", caller_name: "Pat Acme", contact_id: "k1", wait_seconds: 95, ringing: "Sue Broker" }],
    connected: [{ id: "c0", from: "+14035550100", caller_name: null, agent: "Sam Broker", talk_seconds: 130 }],
    today: { answered: 4, abandoned: 1, voicemail: 0, callbacks: 1, avg_wait_seconds: 42, longest_wait_seconds: 180 } }],
  agents: [{ user_id: SAM, name: "Sam Broker", available: true, signed_in: true, on_call: true, busy: false, queue_ids: [Q], idle_seconds: null },
    { user_id: SUE, name: "Sue Broker", available: true, signed_in: true, on_call: false, busy: false, queue_ids: [Q], idle_seconds: 600 }],
  callbacks: [{ id: "cb1", queue_id: Q, from_number: "+14035550199", caller_name: "Lee", contact_id: null, requested_at: "2026-10-26T15:00:00Z" }],
};

beforeEach(() => {
  h.get.mockReset(); h.post.mockReset(); h.put.mockReset(); h.call.mockReset();
  h.role = "Admin";
  vi.spyOn(window, "confirm").mockReturnValue(true);
  h.get.mockImplementation(async (url: string) => (url.endsWith("/live") ? live : url.endsWith("/me") ? { available: false, queues: ["Sales"] } : setup));
  h.put.mockResolvedValue({ ok: true });
  h.post.mockResolvedValue({ ok: true, queue: setup.queues[0] });
});

describe("Settings > Call queues", () => {
  it("staff only see their own switch", async () => {
    h.role = "Staff";
    render(<CallQueuesSettings />);
    fireEvent.click(await screen.findByLabelText("Not taking queue calls"));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/call-queues/me", { available: true }));
    expect(screen.getByText("Available for queue calls")).toBeInTheDocument();
    expect(screen.queryByTestId("live-queues")).toBeNull();
  });

  it("the live panel shows who is waiting, who is ringing, who is talking, people and callbacks", async () => {
    render(<CallQueuesSettings />);
    const q = await screen.findByTestId(`live-${Q}`);
    expect(within(q).getByText("Pat Acme")).toBeInTheDocument();
    expect(within(q).getByText("waiting 1m 35s")).toBeInTheDocument();
    expect(within(q).getByText("Ringing Sue Broker")).toBeInTheDocument();
    expect(within(q).getByText("Sam Broker is talking with +14035550100 (2m 10s)")).toBeInTheDocument();
    expect(within(q).getByText(/4 answered, 1 hung up/)).toBeInTheDocument();
    expect(within(screen.getByTestId(`agent-${SUE}`)).getByText("Free for 10m 00s")).toBeInTheDocument();
    expect(within(screen.getByTestId(`agent-${SAM}`)).getByText("On a call")).toBeInTheDocument();
    const cb = screen.getByTestId("callback-cb1");
    fireEvent.click(within(cb).getByRole("button", { name: "Call back" }));
    expect(h.call).toHaveBeenCalledWith("+14035550199", { contactId: null, contactName: "Lee", source: "call_queue_callback" });
    fireEvent.click(within(cb).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/call-queues/callbacks/cb1/done", {}));
  });

  it("Admins build a queue and can send the main line straight into it", async () => {
    render(<CallQueuesSettings />);
    fireEvent.click(await screen.findByRole("button", { name: "New queue" }));
    fireEvent.change(screen.getByLabelText("Queue name"), { target: { value: "Renewals" } });
    fireEvent.change(screen.getByLabelText("Callers are for"), { target: { value: "BI" } });
    fireEvent.change(screen.getByLabelText("Hold music"), { target: { value: "a1" } });
    fireEvent.change(screen.getByLabelText("Longest wait (minutes)"), { target: { value: "3" } });
    fireEvent.click(screen.getByLabelText("Sue Broker", { selector: "#cq-m-u2" }));
    fireEvent.click(screen.getByRole("button", { name: "Save queue" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/call-queues", expect.objectContaining({ name: "Renewals", silo: "BI", hold_audio_id: "a1", max_wait_seconds: 180, member_ids: [SUE], overflow: "ask" })));
    fireEvent.change(await screen.findByLabelText("866 main line"), { target: { value: Q } });
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/call-queues/main-line", { queue_id: Q }));
    expect(await screen.findByText("Callers to the 866 number now wait in that queue after the greeting.")).toBeInTheDocument();
  });
});

describe("Phone menu", () => {
  it("an option can send callers to a queue", async () => {
    const A = "11111111-1111-4111-8111-111111111111";
    const MENU = {
      greeting: { mode: "tts", text: "Thanks for calling.", audioId: null }, announceOptions: true,
      hours: { enabled: false, weekly: { sun: [], mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] } },
      afterHoursGreeting: { mode: "tts", text: "Closed.", audioId: null }, afterHours: { type: "voicemail", userId: null, message: "" },
      options: [{ id: "sales", digit: "1", label: "Sales", keywords: [], target: { type: "user", userId: A, name: "Jane" } }],
      whenNoChoice: { retry: false, optionId: null },
      noAnswer: { ringSeconds: 25, target: { type: "voicemail", userId: null, message: "" } }, holidays: [],
    };
    h.get.mockResolvedValue({ menu: MENU, is_default: false, users: [{ id: A, name: "Jane" }], audio: [], queues: [{ id: Q, name: "Sales queue" }], stale_user_ids: [], time_zone: "America/Edmonton", zone_label: "Alberta time", open_now: true, spoken_greeting: "" });
    h.put.mockResolvedValue({ spoken_greeting: "Thanks for calling." });
    render(<PhoneMenuSettings />);
    const opt = (await screen.findAllByTestId("pm-option"))[0]!;
    fireEvent.change(within(opt).getByLabelText("Where it goes"), { target: { value: "queue" } });
    expect(within(opt).getByLabelText("Queue")).toHaveValue(Q);
    fireEvent.click(screen.getByText("Save phone menu"));
    await waitFor(() => expect((h.put.mock.calls[0]![1] as any).menu.options[0].target).toEqual({ type: "queue", queueId: Q }));
  });

  it("with no queue set up, Call queue is not offered", async () => {
    const A = "11111111-1111-4111-8111-111111111111";
    const menu = {
      greeting: { mode: "tts", text: "Hi.", audioId: null }, announceOptions: false,
      hours: { enabled: false, weekly: { sun: [], mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] } },
      afterHoursGreeting: { mode: "tts", text: "Closed.", audioId: null }, afterHours: { type: "voicemail", userId: null, message: "" },
      options: [{ id: "sales", digit: "1", label: "Sales", keywords: [], target: { type: "user", userId: A, name: "Jane" } }],
      whenNoChoice: { retry: false, optionId: null },
      noAnswer: { ringSeconds: 25, target: { type: "voicemail", userId: null, message: "" } }, holidays: [],
    };
    h.get.mockResolvedValue({ menu, is_default: false, users: [{ id: A, name: "Jane" }], audio: [], queues: [], stale_user_ids: [], time_zone: "Etc/GMT+6", zone_label: "Alberta time", open_now: true, spoken_greeting: "" });
    render(<PhoneMenuSettings />);
    const opt = (await screen.findAllByTestId("pm-option"))[0]!;
    const choices = Array.from((within(opt).getByLabelText("Where it goes") as HTMLSelectElement).options).map((o) => o.value);
    expect(choices).not.toContain("queue");
    expect(choices).toContain("user");
  });
});
