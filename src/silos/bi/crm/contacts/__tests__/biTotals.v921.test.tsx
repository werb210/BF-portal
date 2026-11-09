// BF_PORTAL_v921_BI_TOTALS - the BI lists read the whole envelope, so the tab count and "1-200 of N" are the real total.
import { describe, it, expect, vi } from "vitest";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", role: "Admin" } }) }));
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ api: vi.fn(async () => []), env: vi.fn() }));
vi.mock("@/api", () => ({ api: h.api, apiGetEnvelope: h.env }));

import BIContactsList from "@/silos/bi/crm/contacts/BIContactsList";

describe("BI contacts total", () => {
  it("uses the server total, not the page length", async () => {
    const rows = Array.from({ length: 200 }, (_, i) => ({ id: `c${i}`, full_name: `Person ${i}`, created_at: "2026-05-01T12:00:00Z" }));
    h.env.mockResolvedValue({ status: "ok", data: rows, total: 1234, page: 1, pageSize: 200 });
    const onTotal = vi.fn();
    render(<MemoryRouter><BIContactsList onUnfilteredTotal={onTotal} /></MemoryRouter>);
    await waitFor(() => expect(onTotal).toHaveBeenCalledWith(1234));
    expect((await screen.findAllByText(/1-200 of 1,234/)).length).toBeGreaterThan(0);
    expect(String(h.env.mock.calls[0]?.[0])).toContain("/api/v1/bi/crm/contacts?");
  });
});
