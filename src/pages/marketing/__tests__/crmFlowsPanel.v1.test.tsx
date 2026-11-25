// BF_PORTAL_CRM_FLOWS_v1 - the shared Flows panel asks BF-Server for the business it was given (X-Silo).
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ calls: [] as Array<{ path: string; init: any }> }));
vi.mock("@/api", () => ({
  api: vi.fn(async (path: string, init: any) => {
    h.calls.push({ path, init });
    if (path === "/api/crm/flows") return { flows: [{ id: "f1", name: "Brokers - Canada", status: "active", audience_tags: ["broker"], market: "CA", daily_new: 50, owner_user_id: null, owner_name: "Todd", from_name: null, from_email: null, reply_to: null, link_url: null, booking_url: null, people: 120, waiting: 20, emailed: 100, not_opened: 60, opened: 30, clicked: 8, stopped: 2, emails_sent: 140 }] };
    if (path === "/api/crm/flows/tags") return { tags: [{ tag: "broker", people: 120, emailable: 118 }] };
    return { items: [] };
  }),
}));
vi.mock("@/api/sharedShell", () => ({ listStaffUsers: vi.fn(async () => []) }));
vi.mock("@/components/editor/RichEmailEditor", () => ({ default: () => <div /> }));

import CrmFlowsPanel from "../CrmFlowsPanel";

describe("CrmFlowsPanel", () => {
  it("lists Keystone's flows with their numbers, asking as Keystone", async () => {
    render(<CrmFlowsPanel silo="KS" />);
    expect(await screen.findByText("Brokers - Canada")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "broker (118)" })).toBeInTheDocument();
    await waitFor(() => expect(h.calls.length).toBeGreaterThanOrEqual(3));
    expect(h.calls.every((c) => c.init?.headers?.["X-Silo"] === "KS")).toBe(true);
  });
});
