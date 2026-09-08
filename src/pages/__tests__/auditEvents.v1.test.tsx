// BF_PORTAL_AUDIT_EVENTS_v1
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("@/api/client", () => ({ apiClient: { get: vi.fn() } }));
vi.mock("@/components/Skeleton", () => ({ default: () => <div>loading</div> }));

import { apiClient } from "@/api/client";
import AuditEvents from "../AuditEvents";

const get = vi.mocked(apiClient.get);

const serviceRow = {
  id: "1", actor_user_id: "agent-service", target_user_id: null,
  action: "contact.note.create", ip: null, user_agent: null, request_id: null,
  success: true, created_at: "2026-09-08T12:00:00Z",
  metadata: { principal: "service", service: "maya-agent" },
};
const humanRow = { ...serviceRow, id: "2", actor_user_id: "u-1", metadata: null };

beforeEach(() => get.mockReset());

describe("audit events page", () => {
  it("distinguishes an agent action from a person's", async () => {
    get.mockResolvedValue([serviceRow, humanRow]);
    render(<AuditEvents />);
    await waitFor(() => expect(screen.getByTestId("audit-service-badge")).toBeTruthy());
    expect(screen.getByTestId("audit-service-badge").textContent).toBe("maya-agent");
    expect(screen.getByText("u-1")).toBeTruthy();
  });

  it("passes the principal filter to the server", async () => {
    get.mockResolvedValue([]);
    render(<AuditEvents />);
    await waitFor(() => expect(get).toHaveBeenCalledWith("/admin/audit/events"));
    fireEvent.click(screen.getByTestId("audit-filter-service"));
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("/admin/audit/events?principal=service"));
  });

  it("explains a failed load instead of spinning forever", async () => {
    get.mockReturnValue(undefined as never);
    render(<AuditEvents />);
    await waitFor(() => expect(screen.getByTestId("audit-events-error")).toBeTruthy());
    expect(screen.queryByText("loading")).toBeNull();
  });

  it("survives a non-array response", async () => {
    get.mockResolvedValue({ unexpected: true } as never);
    render(<AuditEvents />);
    await waitFor(() => expect(screen.getByText("No events for this filter.")).toBeTruthy());
  });
});
