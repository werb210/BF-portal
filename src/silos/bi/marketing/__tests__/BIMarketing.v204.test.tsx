// BF_PORTAL_BLOCK_v204_APOLLO_MARKETING_UI_v1
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const apiMock = vi.fn();
vi.mock("@/api", () => ({
  api: (...args: unknown[]) => apiMock(...args),
}));

import BIMarketing from "@/silos/bi/marketing/BIMarketing";

function mockHealth(live: boolean, mailboxes: any[] = []) {
  return { ok: true, live, mock: !live, mailboxes };
}
function mockSequences(live: boolean, sequences: any[] = []) {
  return { ok: true, live, sequences };
}

describe("BF_PORTAL_BLOCK_v204 — Apollo status badge", () => {
  beforeEach(() => apiMock.mockReset());

  it("renders 'Apollo: demo' when live=false", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.includes("/apollo/health"))
        return mockHealth(false, [{ id: "m1", email: "x@y.com", status: "active" }]);
      if (path.includes("/apollo/sequences"))
        return mockSequences(false, []);
      return {};
    });
    render(<BIMarketing />);
    const badge = await screen.findByTestId("apollo-status-badge");
    expect(badge).toHaveTextContent(/demo/i);
    // Banner explaining mock state should be visible.
    expect(screen.getByText(/APOLLO_API_KEY is not yet set/)).toBeInTheDocument();
  });

  it("renders 'Apollo: live' when live=true", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.includes("/apollo/health"))
        return mockHealth(true, [{ id: "m1", email: "real@boreal.financial", status: "active", health_score: 92 }]);
      if (path.includes("/apollo/sequences"))
        return mockSequences(true, []);
      return {};
    });
    render(<BIMarketing />);
    const badge = await screen.findByTestId("apollo-status-badge");
    expect(badge).toHaveTextContent(/live/i);
    // No mock banner.
    expect(screen.queryByText(/APOLLO_API_KEY is not yet set/)).toBeNull();
  });
});

describe("BF_PORTAL_BLOCK_v204 — Mailbox health cards", () => {
  beforeEach(() => apiMock.mockReset());

  it("renders one card per mailbox with score/bounce/reply", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.includes("/apollo/health"))
        return mockHealth(true, [
          { id: "m1", email: "a@x.com", status: "active", health_score: 88, bounce_rate: 0.01, reply_rate: 0.12 },
          { id: "m2", email: "b@x.com", status: "paused", health_score: 71, bounce_rate: 0.05, reply_rate: 0.06 },
        ]);
      if (path.includes("/apollo/sequences"))
        return mockSequences(true, []);
      return {};
    });
    render(<BIMarketing />);
    await waitFor(() => {
      expect(screen.getAllByTestId("apollo-mailbox-card")).toHaveLength(2);
    });
    expect(screen.getByText("88")).toBeInTheDocument();
    expect(screen.getByText("1.0%")).toBeInTheDocument(); // 0.01 → "1.0%"
  });
});

describe("BF_PORTAL_BLOCK_v204 — Sequences table + sync", () => {
  beforeEach(() => apiMock.mockReset());

  it("renders one row per sequence", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.includes("/apollo/health"))
        return mockHealth(true, []);
      if (path.includes("/apollo/sequences"))
        return mockSequences(true, [
          {
            id: "s1",
            apollo_sequence_id: "apollo-1",
            name: "Cold outreach",
            is_active: true,
            created_at: "2026-05-01",
            updated_at: "2026-05-10",
          },
        ]);
      return {};
    });
    render(<BIMarketing />);
    await waitFor(() => {
      expect(screen.getAllByTestId("apollo-sequence-row")).toHaveLength(1);
    });
    expect(screen.getByText("Cold outreach")).toBeInTheDocument();
    expect(screen.getByText("apollo-1")).toBeInTheDocument();
  });

  it("Sync button is disabled when not live", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.includes("/apollo/health")) return mockHealth(false, []);
      if (path.includes("/apollo/sequences")) return mockSequences(false, []);
      return {};
    });
    render(<BIMarketing />);
    await waitFor(() => screen.getByText(/Sync from Apollo/i));
    const btn = screen.getByRole("button", { name: /Sync from Apollo/i });
    expect(btn).toBeDisabled();
  });

  it("Sync button calls /apollo/sequences?sync=true when live", async () => {
    let syncCalled = false;
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.includes("/apollo/health")) return mockHealth(true, []);
      if (path === "/api/v1/bi/apollo/sequences") return mockSequences(true, []);
      if (path.includes("/apollo/sequences?sync=true")) {
        syncCalled = true;
        return mockSequences(true, [{
          id: "s1",
          apollo_sequence_id: "apollo-1",
          name: "Synced seq",
          is_active: true,
          created_at: "2026-05-10",
          updated_at: "2026-05-10",
        }]);
      }
      return {};
    });
    render(<BIMarketing />);
    await waitFor(() => screen.getByText(/Sync from Apollo/i));
    const btn = screen.getByRole("button", { name: /Sync from Apollo/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(syncCalled).toBe(true);
      expect(screen.getByText("Synced seq")).toBeInTheDocument();
    });
  });

  it("surfaces sequences error from the API", async () => {
    apiMock.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.includes("/apollo/health")) return mockHealth(true, []);
      if (path.includes("/apollo/sequences")) throw new Error("upstream_5xx");
      return {};
    });
    render(<BIMarketing />);
    await waitFor(() => {
      expect(screen.getByText(/upstream_5xx/)).toBeInTheDocument();
    });
  });
});
