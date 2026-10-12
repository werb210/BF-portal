// BF_PORTAL_v789_URL_TICKET - the realtime stream gets a fresh ticket on every connect and reconnect.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => ({ getUrlTicket: vi.fn(), token: "staff.jwt" as string | null }));
vi.mock("@/lib/urlTicket", () => ({ getUrlTicket: h.getUrlTicket }));
vi.mock("@/lib/authToken", () => ({ getAuthToken: () => h.token }));
vi.mock("@/dialer/debugRing", () => ({ ringPush: vi.fn() }));

class FakeEventSource {
  static all: FakeEventSource[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) { FakeEventSource.all.push(this); }
  addEventListener() { /* events not needed here */ }
  close() { this.readyState = 2; }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.resetModules();
  FakeEventSource.all = [];
  h.getUrlTicket.mockReset();
  h.token = "staff.jwt";
  vi.stubGlobal("EventSource", FakeEventSource);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("dialer SSE", () => {
  it("connects with a ticket, never the JWT", async () => {
    h.getUrlTicket.mockResolvedValue("tkt_1");
    const { startSse, stopSse } = await import("@/dialer/sse");
    startSse("BF");
    await flush();
    expect(FakeEventSource.all).toHaveLength(1);
    expect(FakeEventSource.all[0]!.url).toContain("token=tkt_1");
    expect(FakeEventSource.all[0]!.url).not.toContain("staff.jwt");
    stopSse();
  });

  it("asks for a new ticket on every reconnect", async () => {
    vi.useFakeTimers();
    h.getUrlTicket.mockResolvedValueOnce("tkt_1").mockResolvedValueOnce("tkt_2");
    const { startSse, stopSse } = await import("@/dialer/sse");
    startSse("BF");
    await vi.advanceTimersByTimeAsync(0);
    FakeEventSource.all[0]!.onerror?.();
    await vi.advanceTimersByTimeAsync(3000);
    expect(h.getUrlTicket).toHaveBeenCalledTimes(2);
    expect(FakeEventSource.all).toHaveLength(2);
    expect(FakeEventSource.all[1]!.url).toContain("token=tkt_2");
    stopSse();
  });

  it("drops a ticket that arrives after stopSse()", async () => {
    let resolve!: (t: string) => void;
    h.getUrlTicket.mockReturnValue(new Promise<string>((r) => { resolve = r; }));
    const { startSse, stopSse } = await import("@/dialer/sse");
    startSse("BF");
    stopSse();
    resolve("late");
    await flush();
    expect(FakeEventSource.all).toHaveLength(0);
  });

  it("does nothing when signed out", async () => {
    h.token = null;
    const { startSse } = await import("@/dialer/sse");
    startSse("BF");
    await flush();
    expect(h.getUrlTicket).not.toHaveBeenCalled();
  });
});
