// BF_PORTAL_UNKNOWN_CALLER_v1 + BF_PORTAL_RECENT_CALLS_v1
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn(); apiFn.post = vi.fn(); apiFn.put = vi.fn(); apiFn.patch = vi.fn(); apiFn.delete = vi.fn();
  return { apiFn, sse: null as null | ((event: string, data: any) => void), startOutboundPstn: vi.fn() };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/api/o365Interceptor", () => ({ withO365Scopes: (_s: unknown, call: () => unknown) => call() }));
vi.mock("@/lib/urlTicket", () => ({ teamSocketUrl: vi.fn(async () => null), getUrlTicket: vi.fn(async () => null) }));
vi.mock("@/auth/AuthContext", () => ({ useAuth: () => ({ authenticated: true, authStatus: "authenticated" }) }));
vi.mock("@/context/SiloContext", () => ({ useSilo: () => ({ silo: "BF" }) }));
vi.mock("@twilio/voice-sdk", () => ({ Device: vi.fn() }));
vi.mock("../sse", () => ({
  startSse: vi.fn(),
  stopSse: vi.fn(),
  onSse: (fn: (event: string, data: any) => void) => { h.sse = fn; return () => { h.sse = null; }; },
}));
vi.mock("../actions", () => ({
  answerIncoming: vi.fn(), declineIncoming: vi.fn(), startOutboundPstn: h.startOutboundPstn, startInternalCall: vi.fn(),
}));

import DialerProvider from "../DialerProvider";
import IncomingCallToast from "../components/IncomingCallToast";
import { useDialer } from "../store";
import { fetchCallHistory } from "@/services/callService";
import CommunicationsPage from "@/pages/communications/CommunicationsPage";

function Where() { const l = useLocation(); return <div data-testid="where">{l.pathname + l.search}</div>; }

const recent = [
  { id: 1, direction: "inbound", status: "no-answer", created_at: "2026-10-07T18:00:00Z", duration_seconds: null, phone_number: "+15551234567", contact_id: null, contact_name: null },
  { id: 2, direction: "outbound", status: "completed", created_at: "2026-10-07T17:00:00Z", duration_seconds: 125, phone_number: "+15557654321", contact_id: "k1", contact_name: "Sam Lee" },
];

beforeEach(() => {
  for (const fn of [h.apiFn, h.apiFn.get, h.apiFn.post, h.apiFn.put, h.apiFn.patch, h.apiFn.delete]) fn.mockReset();
  h.apiFn.mockImplementation(async (url: string) => {
    if (url === "/api/voice/recent-calls") return { ok: true, items: recent };
    if (url === "/api/crm/voicemails") return [];
    if (url === "/api/crm/shared-mailboxes") return { mine: null, shared: [] };
    if (url === "/api/crm/inbox") return [];
    return {};
  });
  h.apiFn.post.mockImplementation(async (url: string) => url === "/api/voice/resolve-caller" ? { ok: true, matched: false, name: null } : {});
  h.apiFn.get.mockResolvedValue({}); // no voice token: the Twilio device is never built
  h.startOutboundPstn.mockReset();
  useDialer.getState().setIncoming(null);
  useDialer.getState().setCtx({});
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { useDialer.getState().setIncoming(null); });

describe("C unknown caller (v1)", () => {
  it("labels unmatched callers as Unknown caller", async () => {
    render(<MemoryRouter><DialerProvider /><IncomingCallToast /></MemoryRouter>);
    await waitFor(() => expect(h.sse).not.toBeNull());
    await act(async () => { h.sse!("conference.incoming", { conferenceFriendly: "conf-1", fromDisplay: "+15551234567" }); });
    await waitFor(() => expect(useDialer.getState().incoming?.fromDisplay).toBe("Unknown caller"));
    expect(h.apiFn.post).toHaveBeenCalledWith("/api/voice/resolve-caller", { phone: "+15551234567" });
    expect(useDialer.getState().incoming).toMatchObject({ contactId: null, phone: "+15551234567" });
    expect(useDialer.getState().ctx).toMatchObject({ contactName: "Unknown caller", contactId: null, phone: "+15551234567" });
    const toast = screen.getByRole("alert");
    expect(within(toast).getByText("Unknown caller")).toBeInTheDocument();
    expect(within(toast).getByText("+15551234567")).toBeInTheDocument();
  });

  it("toast offers Add when there is no contact, and Open when there is", () => {
    act(() => { useDialer.getState().setIncoming({ conferenceFriendly: "c", fromDisplay: "Unknown caller", contactId: null, phone: "+15551234567" } as any); });
    const view = render(<MemoryRouter initialEntries={["/"]}><Routes><Route path="/" element={<IncomingCallToast />} /><Route path="/crm/contacts" element={<Where />} /></Routes></MemoryRouter>);
    expect(screen.queryByText("Open")).toBeNull();
    fireEvent.click(screen.getByText("Add"));
    expect(screen.getByTestId("where").textContent).toBe("/crm/contacts?addPhone=%2B15551234567");
    view.unmount();

    act(() => { useDialer.getState().setIncoming({ conferenceFriendly: "c", fromDisplay: "Sam Lee", contactId: "k1", phone: "+15557654321" } as any); });
    render(<MemoryRouter><IncomingCallToast /></MemoryRouter>);
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.queryByText("Add")).toBeNull();
  });
});

describe("D recents (v1)", () => {
  it("fetchCallHistory hits the real endpoint", async () => {
    const rows = await fetchCallHistory();
    expect(h.apiFn).toHaveBeenCalledWith("/api/voice/recent-calls");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: "1", direction: "inbound", phone: "+15551234567", contact_name: null });
    expect(rows[1]).toMatchObject({ id: "2", direction: "outbound", contact_name: "Sam Lee", duration_seconds: 125 });
  });

  // BF_PORTAL_PHONE_TAB_v1 - Recents + Voicemail are now one "Phone" tab.
  // RecentsTab itself is unchanged; it is rendered inside PhoneTab. The test still
  // guarantees recent calls are reachable from Communications.
  it("Communications surfaces recent calls under the Phone tab", async () => {
    render(<MemoryRouter><CommunicationsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /^Phone$/ }));
    expect(await screen.findByText("Incoming")).toBeInTheDocument();
    expect(screen.getByText("Outgoing")).toBeInTheDocument();
    expect(screen.getByText("Voicemails")).toBeInTheDocument();
    expect(screen.getByText("+15551234567")).toBeInTheDocument();
    expect(screen.getByText("Sam Lee")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Call" })[1]!);
    expect(h.startOutboundPstn).toHaveBeenCalledWith("+15557654321", { contactId: "k1", contactName: "Sam Lee" });
  });
});
