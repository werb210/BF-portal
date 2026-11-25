// BF_PORTAL_CRM_SAVED_VIEWS_v1
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ posted: [] as any[] }));
vi.mock("@/api", () => ({
  api: {
    get: vi.fn(async () => ({ views: [{ id: "v1", name: "Call list", filters: { tag: "call list" }, created_by: "u1" }] })),
    post: vi.fn(async (_p: string, body: any) => { h.posted.push(body); return {}; }),
    delete: vi.fn(async () => ({})),
  },
}));

import SavedViewsBar from "../SavedViewsBar";

describe("Saved views", () => {
  it("applies a view, and saves the filters on screen under a name", async () => {
    const onApply = vi.fn();
    render(<SavedViewsBar current={{ tag: "broker" }} onApply={onApply} canRemove={() => false} />);
    fireEvent.click(await screen.findByRole("button", { name: "Call list" }));
    expect(onApply).toHaveBeenCalledWith({ tag: "call list" });
    fireEvent.click(screen.getByRole("button", { name: "+ Save view" }));
    fireEvent.change(screen.getByLabelText("View name"), { target: { value: "Brokerages" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(h.posted).toEqual([{ name: "Brokerages", filters: { tag: "broker" } }]));
    expect(screen.queryByRole("button", { name: "Remove view Call list" })).not.toBeInTheDocument();
  });
});
