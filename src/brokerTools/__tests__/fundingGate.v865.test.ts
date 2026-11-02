// BF_PORTAL_v865_BROKER_TOOLS_1_FUNDING_CONDITIONS - moving to Funded: staff are told what is left; Admins can override with a reason.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/http";

const patch = vi.fn();
vi.mock("@/api", () => ({ api: { patch: (...a: unknown[]) => patch(...a) } }));

import { fundingConflict, patchStatusWithFundingGate } from "../fundingGate";
import { summaryText } from "../FundingConditionsPanel";

const conflict = (canOverride: boolean) => new ApiError({ status: 409, message: "1 funding condition is still open.", details: {
  error: "funding_conditions_outstanding", message: "1 funding condition is still open.", can_override: canOverride,
  outstanding: [{ id: "c1", title: "Void cheque", owner: "client", status: "open", due_date: null }],
} });

describe("funding gate", () => {
  beforeEach(() => patch.mockReset());

  it("recognises only the funding-conditions 409", () => {
    expect(fundingConflict(conflict(false))?.outstanding).toHaveLength(1);
    expect(fundingConflict(new ApiError({ status: 409, message: "x", details: { error: "other" } }))).toBeNull();
    expect(fundingConflict(new Error("x"))).toBeNull();
  });

  it("tells staff what is left and does not move the file", async () => {
    patch.mockRejectedValueOnce(conflict(false));
    const ui = { alert: vi.fn(), prompt: vi.fn() };
    await expect(patchStatusWithFundingGate("a1", { status: "Funded" }, ui)).resolves.toBe(false);
    expect(ui.alert.mock.calls[0]?.[0]).toContain("Void cheque (Client, Open)");
    expect(ui.prompt).not.toHaveBeenCalled();
  });

  it("asks an Admin for a reason and retries with it", async () => {
    patch.mockRejectedValueOnce(conflict(true)).mockResolvedValueOnce({ ok: true });
    const ui = { alert: vi.fn(), prompt: vi.fn().mockReturnValue(" Lender confirmed ") };
    await expect(patchStatusWithFundingGate("a1", { status: "Funded" }, ui)).resolves.toBe(true);
    expect(patch.mock.calls[1]?.[1]).toEqual({ status: "Funded", override_reason: "Lender confirmed" });
  });

  it("stops when the Admin cancels or gives no reason", async () => {
    patch.mockRejectedValueOnce(conflict(true));
    const cancel = { alert: vi.fn(), prompt: vi.fn().mockReturnValue(null) };
    await expect(patchStatusWithFundingGate("a1", { status: "Funded" }, cancel)).resolves.toBe(false);
    patch.mockRejectedValueOnce(conflict(true));
    const blank = { alert: vi.fn(), prompt: vi.fn().mockReturnValue("  ") };
    await expect(patchStatusWithFundingGate("a1", { status: "Funded" }, blank)).resolves.toBe(false);
    expect(blank.alert).toHaveBeenCalledWith("An override reason is required.");
    expect(patch).toHaveBeenCalledTimes(2);
  });

  it("rethrows other errors", async () => {
    patch.mockRejectedValueOnce(new ApiError({ status: 500, message: "boom" }));
    await expect(patchStatusWithFundingGate("a1", { status: "In Review" })).rejects.toThrow("boom");
  });

  it("summarises the checklist", () => {
    expect(summaryText([])).toMatch(/No funding conditions yet/);
    const c = (status: string) => ({ status }) as any;
    expect(summaryText([c("cleared"), c("waived")])).toMatch(/can move to Funded/);
    expect(summaryText([c("open"), c("cleared")])).toMatch(/1 of 2 conditions still open/);
  });
});
