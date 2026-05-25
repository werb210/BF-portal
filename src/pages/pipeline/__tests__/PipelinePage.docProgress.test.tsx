import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PipelinePage from "@/pages/pipeline/PipelinePage";

const apiMock = vi.hoisted(() => {
  const fn = vi.fn();
  return Object.assign(fn, {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  });
});

vi.mock("@/api", () => ({ api: apiMock }));

function makeCard(id: string, doc_progress: { accepted: number; rejected: number; pending: number; total: number }) {
  return {
    id,
    name: `Biz ${id}`,
    pipeline_state: "Received",
    requested_amount: 10000,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    stage_entered_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    doc_progress,
  };
}

describe("PipelinePage doc progress pill", () => {
  it("renders red, green, and amber pill variants", async () => {
    apiMock.mockResolvedValueOnce({
      items: [
        makeCard("1", { accepted: 0, rejected: 1, pending: 1, total: 2 }),
        makeCard("2", { accepted: 2, rejected: 0, pending: 0, total: 2 }),
        makeCard("3", { accepted: 1, rejected: 0, pending: 1, total: 2 }),
      ],
    });

    render(<MemoryRouter><PipelinePage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText("1 doc rejected")).toBeInTheDocument());

    expect(screen.getByText("1 doc rejected")).toHaveStyle({ background: "#fee2e2", color: "#991b1b" });
    expect(screen.getByText("2/2 docs")).toHaveStyle({ background: "#dcfce7", color: "#166534" });
    expect(screen.getByText("1/2 docs")).toHaveStyle({ background: "#fef3c7", color: "#92400e" });
  });
});
