// BF_PORTAL_BI_SEQUENCES_v285
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => {
  const fn: any = vi.fn(async (url: string) => (String(url).includes("/marketing/sequences")
    ? { sequences: [{ id: "s1", name: "PGI follow-up", description: null, status: "draft", step_count: 3, active_enrollments: 0, updated_at: "2026-09-16T10:00:00Z" }] }
    : {}));
  fn.get = vi.fn(async () => ({ items: [] }));
  fn.post = vi.fn(async () => ({}));
  return fn;
});
vi.mock("@/api", () => ({ api: apiMock }));
vi.mock("@/components/marketing/BrandedEmailComposer", () => ({ default: () => <div>composer</div> }));
vi.mock("@/components/marketing/LinkClicksPanel", () => ({ default: () => <div>links</div> }));
vi.mock("@/components/marketing/SequenceCanvas", () => ({ default: () => <div>canvas</div> }));

import BIMarketing from "../BIMarketing";

describe("BI Marketing sequences", () => {
  it("lists saved sequences with a Start button above the builder", async () => {
    render(<BIMarketing />);
    fireEvent.click(screen.getByRole("tab", { name: "Sequences" }));
    await waitFor(() => expect(screen.getByText("PGI follow-up")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ New sequence" })).not.toBeInTheDocument();
    expect(screen.getByText("Build a new sequence")).toBeInTheDocument();
    expect(screen.getByText(/only sends once it is started/)).toBeInTheDocument();
  });
});
