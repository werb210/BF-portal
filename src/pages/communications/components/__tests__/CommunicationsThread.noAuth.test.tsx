// BF_PORTAL_v68_BLOCK_2_2_FIX — regression test: rendering without AuthProvider
// must NOT throw. The component should fall through to direction-based role.
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import CommunicationsThread, { type CommRow } from "../CommunicationsThread";

// Simulate AuthProvider being absent: useAuth throws, exactly like prod.
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => {
    throw new Error("useAuth must be used within AuthProvider");
  },
}));

describe("CommunicationsThread without AuthProvider", () => {
  it("does not throw when useAuth is unavailable", () => {
    const rows: CommRow[] = [
      { id: "1", direction: "inbound", body: "client msg", createdAt: "2026-04-30T10:00:00Z" },
      { id: "2", direction: "outbound", body: "staff msg", createdAt: "2026-04-30T10:05:00Z" },
    ];
    expect(() => render(<CommunicationsThread messages={rows} />)).not.toThrow();
  });

  it("falls back to direction: inbound -> other (left), outbound -> self (right)", () => {
    const rows: CommRow[] = [
      { id: "1", direction: "inbound", body: "client msg", createdAt: "2026-04-30T10:00:00Z" },
      { id: "2", direction: "outbound", body: "staff msg", createdAt: "2026-04-30T10:05:00Z" },
    ];
    render(<CommunicationsThread messages={rows} />);
    const allRows = document.querySelectorAll(".msg-row");
    expect(allRows.length).toBe(2);
    const a = allRows.item(0);
    const b = allRows.item(1);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.classList.contains("msg-row--left")).toBe(true);
    expect(b!.classList.contains("msg-row--right")).toBe(true);
  });
});
