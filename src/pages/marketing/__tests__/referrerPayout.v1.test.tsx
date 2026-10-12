// BF_PORTAL_REFERRER_PAYOUT_v1
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  apiFn.put = vi.fn();
  apiFn.patch = vi.fn();
  apiFn.delete = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));

import BFReferrerManagement from "../BFReferrerManagement";

function mockReferrers(accrued: number) {
  h.apiFn.mockImplementation(async (path: string) => {
    if (path === "/api/admin/referrers") return { referrers: [{ id: "r1", full_name: "Jane Referrer", total_accrued: accrued }] };
    if (path === "/api/admin/referrers/r1/detail") {
      return { referrer: { id: "r1", full_name: "Jane Referrer" }, referrals: [], applications: [], commissions: [] };
    }
    return {};
  });
}

const listCalls = () => h.apiFn.mock.calls.filter((c: unknown[]) => c[0] === "/api/admin/referrers").length;
const detailCalls = () => h.apiFn.mock.calls.filter((c: unknown[]) => c[0] === "/api/admin/referrers/r1/detail").length;

async function openDetail() {
  render(<BFReferrerManagement />);
  fireEvent.click(await screen.findByText("Jane Referrer"));
  return screen.findByRole("button", { name: /^Pay out/ });
}

beforeEach(() => {
  h.apiFn.mockReset();
  h.apiFn.post.mockReset();
  h.apiFn.post.mockResolvedValue({ ok: true });
});

describe("referrer payout button", () => {
  it("posts to the admin pay endpoint and refreshes", async () => {
    mockReferrers(500);
    const button = await openDetail();
    expect(listCalls()).toBe(1);
    expect(detailCalls()).toBe(1);
    fireEvent.click(button);
    await waitFor(() => expect(h.apiFn.post).toHaveBeenCalledWith("/api/admin/referrers/r1/pay", {}));
    expect(h.apiFn.post).toHaveBeenCalledTimes(1);
    // Refreshes the list and the open detail after paying.
    await waitFor(() => expect(listCalls()).toBe(2));
    await waitFor(() => expect(detailCalls()).toBe(2));
  });

  it("renders a Pay out button gated on accrued", async () => {
    mockReferrers(500);
    const enabled = await openDetail();
    expect(enabled).toHaveTextContent(/^Pay out \$500$/);
    expect(enabled).toBeEnabled();
  });

  it("disables the Pay out button when nothing is accrued", async () => {
    mockReferrers(0);
    const disabled = await openDetail();
    expect(disabled).toBeDisabled();
    fireEvent.click(disabled);
    expect(h.apiFn.post).not.toHaveBeenCalled();
  });

  it("shows the error when the payout fails", async () => {
    mockReferrers(500);
    h.apiFn.post.mockRejectedValue(new Error("Payout refused"));
    fireEvent.click(await openDetail());
    expect(await screen.findByText(/Payout refused/)).toBeInTheDocument();
  });
});
