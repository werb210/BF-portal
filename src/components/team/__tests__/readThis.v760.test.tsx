// BF_PORTAL_READ_THIS_v760 / BF_PORTAL_REPORTS_BATCH5_v760
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
const get = vi.fn(), post = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));
import { ReadThisBar, ShareFileModal, applyReadThisEvent, readThisSummary } from "../ReadThis";
import { renderReport } from "@/pages/reports/ReportDataCards";

const names: Record<string, string> = { todd: "Todd", andrew: "Andrew", caden: "Caden" };
const name = (id: string) => names[id] ?? id;
beforeEach(() => { get.mockReset(); post.mockReset(); });

describe("Read this", () => {
  const msg = { id: "m1", sender_id: "todd", read_this: true, read_by: [{ user_id: "andrew", read_at: "2026-10-07T20:00:00Z" }] };
  it("the sender sees who has read it and who has not", () => {
    expect(readThisSummary(msg, ["todd", "andrew", "caden"], name)).toEqual({ read: ["Andrew"], waiting: ["Caden"] });
    render(<ReadThisBar message={msg} meId="todd" memberIds={["todd", "andrew", "caden"]} name={name} onRead={() => undefined} />);
    expect(screen.getByTestId("read-this-status").textContent).toBe("Read by Andrew · Waiting: Caden");
  });
  it("a reader taps Mark as read", async () => {
    post.mockResolvedValue({ receipt: { user_id: "caden", read_at: "2026-10-07T21:00:00Z" } });
    const onRead = vi.fn();
    render(<ReadThisBar message={msg} meId="caden" memberIds={["todd", "andrew", "caden"]} name={name} onRead={onRead} />);
    fireEvent.click(screen.getByTestId("read-this-mark"));
    await waitFor(() => expect(onRead).toHaveBeenCalledWith({ user_id: "caden", read_at: "2026-10-07T21:00:00Z" }));
    expect(post).toHaveBeenCalledWith("/api/team/messages/m1/read-receipt", {});
  });
  it("live receipts are added once", () => {
    const out = applyReadThisEvent([msg], { message_id: "m1", user_id: "caden", read_at: "x" });
    expect(out[0]!.read_by).toHaveLength(2);
    expect(applyReadThisEvent(out, { message_id: "m1", user_id: "caden" })[0]!.read_by).toHaveLength(2);
  });
  it("ordinary messages show nothing", () => {
    const { container } = render(<ReadThisBar message={{ id: "m2", sender_id: "x" }} meId="todd" memberIds={[]} name={name} onRead={() => undefined} />);
    expect(container.textContent).toBe("");
  });
  it("Team chat sends the flag and shows the bar", () => {
    const src = readFileSync("src/pages/communications/CommunicationsPage.tsx", "utf8");
    expect(src).toContain("...(outReadThis ? { read_this: true } : {})");
    expect(src).toContain("<ReadThisBar message={m}");
    expect(src).toContain('data?.type === "read_this"');
  });
});

describe("Share file", () => {
  it("browses the Staff Library and drops a company link into the message", async () => {
    get.mockImplementation(async (url: string) => url.includes("item=f1")
      ? { configured: true, url: "https://lib", items: [{ id: "x", name: "Bizcap form.pdf", webUrl: "https://x/form", isFolder: false }] }
      : { configured: true, url: "https://lib", items: [{ id: "f1", name: "Lender Forms", webUrl: null, isFolder: true }] });
    const onPick = vi.fn();
    render(<ShareFileModal open onClose={() => undefined} onPick={onPick} />);
    fireEvent.click(await screen.findByText(/Lender Forms/));
    fireEvent.click(await screen.findByText(/Bizcap form\.pdf/));
    expect(onPick).toHaveBeenCalledWith({ name: "Bizcap form.pdf", url: "https://x/form" });
  });
  it("offers to create the Staff Library when there is none", async () => {
    get.mockResolvedValue({ configured: false, items: [] });
    post.mockResolvedValue({ ok: true });
    render(<ShareFileModal open onClose={() => undefined} onPick={() => undefined} />);
    fireEvent.click(await screen.findByText("Create the Staff Library"));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/o365/library/ensure", {}));
  });
});

describe("new report cards", () => {
  it("render each report", () => {
    render(<div>{renderReport("deal_velocity", { days: 365, rows: [{ product: "MEDIA", funded: 1, to_submit: 5, to_offer: 15, offer_to_funded: 10, total: 30 }] })}{renderReport("win_rate", { days: 365, months: [{ label: "2026-09", submitted: 3, funded: 1, lost: 1, open: 1, win_rate: 50 }], products: [] })}{renderReport("call_outcomes", { days: 30, rows: [{ staff: "Todd", outcome: "left voicemail", calls: 2 }] })}{renderReport("client_reply_time", { channels: [{ channel: "sms", messages: 2, answered: 1, median_minutes: 60 }], waiting: [{ name: "Clarice Gray", channel: "sms", minutes_waiting: 30 }] })}</div>);
    expect(screen.getByText("30 d")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("left voicemail")).toBeTruthy();
    expect(screen.getByText("Clarice Gray")).toBeTruthy();
    expect(screen.getByText("1 h")).toBeTruthy();
  });
  it("commission receivable records a payment", async () => {
    post.mockResolvedValue({ ok: true });
    vi.spyOn(window, "prompt").mockReturnValue("");
    render(<div>{renderReport("commission_receivable", { items: [{ application_id: "a1", name: "App a1", lender: "L", funded_at: "2026-09-27", days_since_funded: 10, expected: 2000, currency: "CAD", commission_received_at: null }], buckets: [{ age: "0-30 days", files: 1, expected: 2000 }] })}</div>);
    fireEvent.click(screen.getByTestId("commission-mark-received"));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/reports/commission-received", { applicationId: "a1", amount: 2000 }));
    expect(await screen.findByText(/on 20/)).toBeTruthy();
  });
});
