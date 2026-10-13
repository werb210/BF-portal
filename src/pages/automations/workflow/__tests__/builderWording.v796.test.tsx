// BF_PORTAL_v796_BUILDER_WORDING
// Branch cards say "1 branch", a branch test that matched nothing says "No path matched",
// and a saved owner who is not in the staff list stays visible.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { summarize } from "../graph";
import { outcomeWords } from "../TestPanel";
import { NodeDetails, type FormContext } from "../DetailForms";

const ctx = { catalog: { triggers: [], actions: [], fields: [], operators: ["eq"], templates: { email: [], sms: [] }, stages: [], events: [], tokens: [] }, users: [{ id: "u-1", name: "Andrew Polturak" }], lists: [], workflows: [], nodes: {}, numbers: {}, workflowId: null } as unknown as FormContext;

describe("builder wording", () => {
  it("says 1 branch, not 1 branche", () => {
    const node = { kind: "branch", branches: [{ id: "b1", label: "Still at Offer", logic: "all", conditions: [], next: null }], noneNext: null } as any;
    expect(summarize(node, { catalog: ctx.catalog, users: [], lists: [], workflows: [], numbers: {}, nodes: {} } as any)).toContain("1 branch and None met");
  });

  it("a branch that matched nothing reads No path matched", () => {
    expect(outcomeWords({ outcome: "done", stepType: "branch", detail: "no path matched" })).toBe("No path matched");
    expect(outcomeWords({ outcome: "done", stepType: "branch", detail: "path Hot" })).toBe("Took path");
  });

  it("keeps an unknown saved owner visible", () => {
    render(<NodeDetails node={{ kind: "action", action: "assign_owner", params: { userId: "Andrew P" }, next: null } as any} onChange={() => undefined} ctx={ctx} />);
    expect(screen.getByRole("option", { name: "Not a staff member: Andrew P" })).toBeInTheDocument();
    expect((screen.getByLabelText("New owner") as HTMLSelectElement).value).toBe("Andrew P");
  });
});
