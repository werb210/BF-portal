import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import CommunicationsThread, { type CommRow } from "../CommunicationsThread";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-staff-1" } }),
}));

describe("CommunicationsThread", () => {
  it("maps direction='outbound' to self and 'inbound' to other", () => {
    const rows: CommRow[] = [
      { id: "1", direction: "inbound", body: "Hello from client", authorName: "Todd", createdAt: "2026-04-30T10:00:00Z" },
      { id: "2", direction: "outbound", body: "Hi back", authorName: "John", createdAt: "2026-04-30T10:05:00Z" },
    ];
    render(<CommunicationsThread messages={rows} />);
    const allRows = document.querySelectorAll(".msg-row");
    expect(allRows.length).toBe(2);
    expect(allRows.item(0)?.classList.contains("msg-row--left")).toBe(true);
    expect(allRows.item(1)?.classList.contains("msg-row--right")).toBe(true);
  });

  it("falls back to from_user_id == current user => self", () => {
    const rows: CommRow[] = [
      { id: "x", from_user_id: "user-staff-1", content: "self msg", createdAt: "2026-04-30T10:00:00Z" },
    ];
    render(<CommunicationsThread messages={rows} />);
    const r = document.querySelector(".msg-row");
    expect(r?.classList.contains("msg-row--right")).toBe(true);
  });

  it("renders empty text when no messages", () => {
    const { getByText } = render(<CommunicationsThread messages={[]} emptyText="No messages." />);
    expect(getByText("No messages.")).toBeTruthy();
  });
});
