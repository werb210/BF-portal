// BF_PORTAL_BLOCK_v205_OUTREACH_ENROLL_v1
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const apiMock = vi.fn();
vi.mock("@/api", () => ({
  api: (...args: unknown[]) => apiMock(...args),
}));

import BIOutreach from "@/silos/bi/crm/BIOutreach";

function contact(over: Record<string, unknown> = {}) {
  return {
    id: "c1",
    full_name: "Jane Doe",
    email: "jane@example.com",
    phone_e164: "+14165551234",
    title: "CFO",
    outreach_status: "cold",
    outreach_owner_id: null,
    outreach_updated_at: null,
    created_at: "2026-05-01",
    ...over,
  };
}
function withSequences(active = true) {
  return {
    sequences: [
      {
        id: "s1",
        apollo_sequence_id: "apollo-1",
        name: "PGI cold outreach",
        is_active: active,
        created_at: "2026-05-01",
        updated_at: "2026-05-10",
      },
    ],
  };
}

describe("BF_PORTAL_BLOCK_v205 — Enroll button", () => {
  beforeEach(() => apiMock.mockReset());

  it("renders disabled when contact has no email", async () => {
    apiMock.mockImplementation(async (path?: string) => {
      const p = String(path ?? "");
      if (p.includes("/apollo/sequences")) return withSequences();
      if (p.startsWith("/api/v1/bi/crm/outreach/contacts"))
        return { contacts: [contact({ email: null })] };
      return {};
    });
    render(<BIOutreach />);
    await waitFor(() => screen.getByText("Jane Doe"));
    const btn = screen.getByRole("button", { name: /^enroll in sequence$/i });
    expect(btn).toBeDisabled();
  });

  it("renders disabled when no active sequences exist", async () => {
    apiMock.mockImplementation(async (path?: string) => {
      const p = String(path ?? "");
      if (p.includes("/apollo/sequences"))
        return { sequences: [] };
      if (p.startsWith("/api/v1/bi/crm/outreach/contacts"))
        return { contacts: [contact()] };
      return {};
    });
    render(<BIOutreach />);
    await waitFor(() => screen.getByText("Jane Doe"));
    const btn = screen.getByRole("button", { name: /^enroll in sequence$/i });
    expect(btn).toBeDisabled();
  });

  it("filters out inactive sequences", async () => {
    apiMock.mockImplementation(async (path?: string) => {
      const p = String(path ?? "");
      if (p.includes("/apollo/sequences")) return withSequences(false);
      if (p.startsWith("/api/v1/bi/crm/outreach/contacts"))
        return { contacts: [contact()] };
      return {};
    });
    render(<BIOutreach />);
    await waitFor(() => screen.getByText("Jane Doe"));
    // No active sequences → disabled even with email present.
    const btn = screen.getByRole("button", { name: /^enroll in sequence$/i });
    expect(btn).toBeDisabled();
  });

  it("opens picker, posts to /enroll, and shows 'Enrolled' on success", async () => {
    apiMock.mockImplementation(async (path?: string, opts?: any) => {
      const p = String(path ?? "");
      if (p.includes("/apollo/sequences/") && opts?.method === "POST") {
        return { ok: true, mock: false, apollo_contact_id: "apollo-c-99" };
      }
      if (p.includes("/apollo/sequences")) return withSequences();
      if (p.startsWith("/api/v1/bi/crm/outreach/contacts"))
        return { contacts: [contact()] };
      return {};
    });
    render(<BIOutreach />);
    await waitFor(() => screen.getByText("Jane Doe"));

    fireEvent.click(screen.getByRole("button", { name: /^enroll in sequence$/i }));
    const select = await screen.findByLabelText(/^sequence$/i);
    fireEvent.change(select, { target: { value: "s1" } });
    fireEvent.click(screen.getByRole("button", { name: /^enroll$/i }));

    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith(
        "/api/v1/bi/apollo/sequences/s1/enroll/c1",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText(/^enrolled$/i)).toBeInTheDocument();
    });
  });

  it("shows 'Enrolled (mock)' when BI-Server is in mock mode", async () => {
    apiMock.mockImplementation(async (path?: string, opts?: any) => {
      const p = String(path ?? "");
      if (p.includes("/apollo/sequences/") && opts?.method === "POST") {
        return { ok: true, mock: true, apollo_contact_id: "mock-c" };
      }
      if (p.includes("/apollo/sequences")) return withSequences();
      if (p.startsWith("/api/v1/bi/crm/outreach/contacts"))
        return { contacts: [contact()] };
      return {};
    });
    render(<BIOutreach />);
    await waitFor(() => screen.getByText("Jane Doe"));
    fireEvent.click(screen.getByRole("button", { name: /^enroll in sequence$/i }));
    const select = await screen.findByLabelText(/^sequence$/i);
    fireEvent.change(select, { target: { value: "s1" } });
    fireEvent.click(screen.getByRole("button", { name: /^enroll$/i }));
    await waitFor(() => {
      expect(screen.getByText(/enrolled \(mock\)/i)).toBeInTheDocument();
    });
  });

  it("surfaces error on enroll failure", async () => {
    apiMock.mockImplementation(async (path?: string, opts?: any) => {
      const p = String(path ?? "");
      if (p.includes("/apollo/sequences/") && opts?.method === "POST") {
        throw new Error("upstream_5xx");
      }
      if (p.includes("/apollo/sequences")) return withSequences();
      if (p.startsWith("/api/v1/bi/crm/outreach/contacts"))
        return { contacts: [contact()] };
      return {};
    });
    render(<BIOutreach />);
    await waitFor(() => screen.getByText("Jane Doe"));
    fireEvent.click(screen.getByRole("button", { name: /^enroll in sequence$/i }));
    const select = await screen.findByLabelText(/^sequence$/i);
    fireEvent.change(select, { target: { value: "s1" } });
    fireEvent.click(screen.getByRole("button", { name: /^enroll$/i }));
    await waitFor(() => {
      expect(screen.getByText(/failed:/i)).toBeInTheDocument();
    });
  });
});
