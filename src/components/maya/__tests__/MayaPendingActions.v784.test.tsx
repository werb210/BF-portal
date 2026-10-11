// BF_PORTAL_MAYA_PENDING_ACTIONS_v784
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/api", () => ({ api: { get, post } }));

import MayaPendingActions from "@/components/maya/MayaPendingActions";

const sms = { id: "pa-1", type: "sms", to: "+15555550123", message: "Your documents are approved." };

describe("MayaPendingActions", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("shows each pending SMS with To, message, Send and Cancel (plain array reply)", async () => {
    get.mockResolvedValue([sms]);
    render(<MayaPendingActions />);
    expect(await screen.findByText("Your documents are approved.")).toBeInTheDocument();
    expect(screen.getByText(/\+15555550123/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/api/maya/pending-actions");
  });

  it("accepts an {items} reply and confirms with Send", async () => {
    get.mockResolvedValue({ items: [sms] });
    post.mockResolvedValue({ ok: true, status: "sent" });
    render(<MayaPendingActions />);
    fireEvent.click(await screen.findByRole("button", { name: "Send" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/maya/pending-actions/pa-1/confirm", {}));
    await waitFor(() => expect(screen.queryByText("Your documents are approved.")).toBeNull());
  });

  it("cancels with Cancel", async () => {
    get.mockResolvedValue({ items: [sms] });
    post.mockResolvedValue({ ok: true, status: "cancelled" });
    render(<MayaPendingActions />);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/maya/pending-actions/pa-1/cancel", {}));
  });

  it("shows an error and keeps the card when the send fails", async () => {
    get.mockResolvedValue([sms]);
    post.mockResolvedValue({ ok: false, status: "expired" });
    render(<MayaPendingActions />);
    fireEvent.click(await screen.findByRole("button", { name: "Send" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not send the text: expired");
    expect(screen.getByText("Your documents are approved.")).toBeInTheDocument();
  });

  it("reloads when refreshKey changes (after each Maya reply)", async () => {
    get.mockResolvedValue([]);
    const { rerender } = render(<MayaPendingActions refreshKey={0} />);
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    rerender(<MayaPendingActions refreshKey={1} />);
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });

  it("is mounted in both staff Maya panels, and Maya replies are not black on dark", () => {
    const bar = readFileSync("src/components/maya/MayaCommandBar.tsx", "utf8");
    const chat = readFileSync("src/components/maya/MayaChat.tsx", "utf8");
    for (const src of [bar, chat]) {
      expect(src).toContain("<MayaPendingActions refreshKey={pendingKey} />");
      expect(src).toContain("setPendingKey((k) => k + 1)");
    }
    expect(chat).not.toContain('"#000"');
  });
});
