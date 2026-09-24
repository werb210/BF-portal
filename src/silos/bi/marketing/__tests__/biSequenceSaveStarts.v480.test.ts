// BF_PORTAL_BLOCK_v480_BI_SEQUENCE_SAVE_STARTS
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { post } = vi.hoisted(() => ({
  post: vi.fn(async (url: string) => (url === "/api/v1/bi/marketing/sequences" ? { sequence: { id: "seq-9" } } : { ok: true })),
}));

vi.mock("@/api", () => ({ api: { get: vi.fn(async () => ({ items: [], queues: [] })), post } }));
vi.mock("../MarketingT", async () => { const { createElement } = await import("react"); return { default: () => createElement("div", null, "x") }; });
vi.mock("@/components/marketing/BrandedEmailComposer", async () => { const { createElement } = await import("react"); return { default: () => createElement("div", null, "Email") }; });
vi.mock("@/components/marketing/SequenceCanvas", async () => {
  const { createElement } = await import("react");
  return { default: ({ onSave }: { onSave: (steps: Array<Record<string, unknown>>) => void }) =>
    createElement("button", { type: "button", onClick: () => onSave([{ type: "email", template_id: "t1" }]) }, "Save sequence") };
});

import BIMarketing from "../BIMarketing";

describe("v480 saving a BI sequence starts it", () => {
  beforeEach(() => post.mockClear());

  it("creates the sequence then calls /start on it", async () => {
    render(createElement(BIMarketing));
    fireEvent.click(screen.getByRole("tab", { name: "Sequences" }));
    fireEvent.change(screen.getByLabelText("Sequence name"), { target: { value: "Renewals" } });
    fireEvent.click(screen.getByRole("button", { name: "Save sequence" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/v1/bi/marketing/sequences/seq-9/start", {}));
    expect(await screen.findByText("Sequence saved and started. Add contacts from CRM → Outreach.")).toBeInTheDocument();
  });

  it("Outreach hides sequences with no steps", () => {
    const src = readFileSync(resolve(__dirname, "../../crm/BIOutreach.tsx"), "utf8");
    expect(src.match(/Number\((s|sequence)\.step_count \?\? 1\) > 0/g)?.length).toBe(2);
  });
});
