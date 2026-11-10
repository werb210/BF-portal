// BF_PORTAL_v936_SEND_FOR_SIGNATURE - after a term sheet is saved as an offer, the broker sends it to the client to sign.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/api/lenders", () => ({
  fetchLenderMatches: vi.fn(),
  fetchLenderEnvelope: vi.fn(async () => ({ status: "ready", outstanding: [], computed_at: new Date().toISOString(), matches: [{ id: "p1", lenderName: "Alpha", productName: "Term", productCategory: "TERM_LOAN", matchPercent: 87, files: [] }] })),
  recalculateLenderMatches: vi.fn(),
  createLenderSubmission: vi.fn(),
  uploadLenderTermSheet: vi.fn(async () => ({ ok: true, offer_id: "off-9" })),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "Admin", id: "u1" } }) }));
vi.mock("@/components/auth/AccessRestricted", () => ({ default: ({ message }: { message: string }) => <div>{message}</div> }));
vi.mock("@/auth/can", () => ({ canWrite: () => true }));
vi.mock("@/utils/errors", () => ({ getErrorMessage: (e: any, fb: string) => e?.message ?? fb }));
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => h.get(...a), post: (...a: unknown[]) => h.post(...a) } }));

import LendersTab from "../LendersTab";
import { uploadLenderTermSheet } from "@/api/lenders";

async function saveTermSheet() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><LendersTab applicationId="app-1" /></QueryClientProvider>);
  await screen.findByText("Alpha");
  fireEvent.change(screen.getByTestId("upload-term-sheet-p1"), { target: { files: [new File(["%PDF-1"], "term.pdf", { type: "application/pdf" })] } });
  await screen.findByTestId("term-sheet-modal");
  fireEvent.click(screen.getByTestId("term-sheet-submit"));
  return screen.findByTestId("term-sheet-send-signature");
}

beforeEach(() => { h.get.mockReset(); h.post.mockReset(); h.get.mockResolvedValue({}); });

describe("v936 send the term sheet for signature", () => {
  it("posts to the offer's send-for-signature route and says it was sent", async () => {
    h.post.mockImplementation(async (url: string) => (url.includes("send-for-signature") ? { ok: true, sent: true } : {}));
    const btn = await saveTermSheet();
    expect(btn.textContent).toBe("Send to client for signature");
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByTestId("term-sheet-signature-msg").textContent).toMatch(/^Sent\./));
    expect(h.post.mock.calls.filter((c) => String(c[0]).includes("send-for-signature")).map((c) => c[0])).toEqual(["/api/offers/off-9/send-for-signature"]);
    expect((screen.getByTestId("term-sheet-send-signature") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("term-sheet-send-signature").textContent).toBe("Sent for signature");
  });

  it("shows the server's reason (a Word file must be saved as PDF) and the button can be tried again", async () => {
    const why = "To send it for signature, upload the term sheet as a PDF (in Word: File > Save As > PDF). A Word file can be read and viewed, but not signed.";
    h.post.mockImplementation(async (url: string) => { if (url.includes("send-for-signature")) throw new Error(why); return {}; });
    const btn = await saveTermSheet();
    fireEvent.click(btn);
    const msg = await screen.findByTestId("term-sheet-signature-msg");
    expect(msg.getAttribute("role")).toBe("alert");
    expect(msg.textContent).toBe(why);
    expect((screen.getByTestId("term-sheet-send-signature") as HTMLButtonElement).disabled).toBe(false);
  });

  it("a slow send for one offer does not mark the next saved offer as sent", async () => {
    let finish!: () => void;
    h.post.mockImplementation((url: string) => (url.includes("send-for-signature") ? new Promise((res) => { finish = () => res({ ok: true }); }) : Promise.resolve({})));
    const first = await saveTermSheet();
    fireEvent.click(first);
    (uploadLenderTermSheet as any).mockResolvedValueOnce({ ok: true, offer_id: "off-10" });
    fireEvent.change(screen.getByTestId("upload-term-sheet-p1"), { target: { files: [new File(["%PDF-1"], "b.pdf", { type: "application/pdf" })] } });
    await screen.findByTestId("term-sheet-modal");
    fireEvent.click(screen.getByTestId("term-sheet-submit"));
    await waitFor(() => expect(screen.getByTestId("term-sheet-send-signature").textContent).toBe("Send to client for signature"));
    finish();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByTestId("term-sheet-send-signature").textContent).toBe("Send to client for signature");
    expect(screen.queryByTestId("term-sheet-signature-msg")).toBeNull();
  });
});
