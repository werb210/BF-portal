// BF_PORTAL_BLOCK_v462_BI_EMPTY_STEP_REPAIR
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";

const get = vi.fn();
const patch = vi.fn();
vi.mock("@/api", () => ({ api: Object.assign(vi.fn(), { get: (...a: any[]) => get(...a), patch: (...a: any[]) => patch(...a) }) }));
import EmptyStepsRepair, { isEmptyEmailStep } from "../EmptyStepsRepair";
const emptySteps = { steps: [
  { id: "s1", position: 0, type: "email", subject: null, body: null },
  { id: "s2", position: 1, type: "email", subject: "", body: "" },
] };
const filledSteps = { steps: [
  { id: "s1", position: 0, type: "email", subject: "Hi", body: "Body" },
  { id: "s2", position: 1, type: "email", subject: "Follow up", body: "Body" },
] };
const templates = { items: [{ id: "t1", name: "Intro", subject: "Hi" }, { id: "t2", name: "Follow up", subject: "Follow up" }] };
beforeEach(() => { get.mockReset(); patch.mockReset(); patch.mockResolvedValue({}); });
describe("v462 repair empty BI sequence steps", () => {
  it("detects empty email steps only", () => {
    expect(isEmptyEmailStep({ id: "a", position: 0, type: "email", subject: "", body: "x" })).toBe(true);
    expect(isEmptyEmailStep({ id: "b", position: 0, type: "email", subject: "s", body: "b" })).toBe(false);
    expect(isEmptyEmailStep({ id: "c", position: 0, type: "task", subject: null, body: null })).toBe(false);
  });
  it("lists each empty step, saves the picked templates, and reports fixed", async () => {
    get.mockImplementation(async (p: string) => (p.includes("/steps") ? emptySteps : templates));
    const onFixed = vi.fn();
    render(<EmptyStepsRepair sequenceId="seq-1" onFixed={onFixed} />);
    const step1 = await screen.findByLabelText("Template for step 1");
    const step2 = screen.getByLabelText("Template for step 2");
    fireEvent.change(step1, { target: { value: "t1" } });
    fireEvent.change(step2, { target: { value: "t2" } });
    get.mockImplementation(async (p: string) => (p.includes("/steps") ? filledSteps : templates));
    fireEvent.click(screen.getByText("Save templates"));
    await waitFor(() => expect(onFixed).toHaveBeenCalled());
    expect(patch).toHaveBeenCalledWith("/api/v1/bi/marketing/sequences/seq-1/steps/s1", { template_id: "t1" });
    expect(patch).toHaveBeenCalledWith("/api/v1/bi/marketing/sequences/seq-1/steps/s2", { template_id: "t2" });
  });
  it("Outreach shows the repair panel when enrolling hits empty steps", () => {
    const src = readFileSync(path.join(process.cwd(), "src/silos/bi/crm/BIOutreach.tsx"), "utf8");
    expect(src).toContain('if (code === "empty_email_steps" || /no subject or message/.test(String(e?.message ?? ""))) setRepairSequenceId(biSequenceId);');
    expect(src).toContain("<EmptyStepsRepair");
  });
});
