// BF_PORTAL_BLOCK_v213_CANONICAL_BI_PIPELINE_REDIRECT_v1 — superseded
// BF_PORTAL_BLOCK_1_27_PIPELINE_SILO_ROUTE: BI no longer renders
// BIPipelinePage in place; it redirects to /silo/bi/pipeline.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import React from "react";

vi.mock("@/pages/pipeline/PipelinePage", () => ({
  default: () => <div data-testid="bf-pipeline">BF Pipeline</div>,
}));

// BF_PORTAL_SLF_PIPELINE_ROUTE_v1 - SLF now renders its own read-only view
// (fed by slf-server) instead of the BF pipeline.
vi.mock("@/silos/slf/SLFView", () => ({
  default: () => <div data-testid="slf-view">SLF View</div>,
}));

function withSilo(silo: "BF" | "BI" | "SLF") {
  vi.doMock("@/context/BusinessUnitContext", () => ({
    useBusinessUnit: () => ({
      activeBusinessUnit: silo,
      businessUnits: [silo],
      setActiveBusinessUnit: () => undefined,
    }),
    getActiveBusinessUnit: () => silo,
  }));
}

describe("BF_PORTAL_BLOCK_v213_CANONICAL_BI_PIPELINE_REDIRECT_v1", () => {
  it("redirects to /silo/bi/pipeline when active silo is BI", async () => {
    vi.resetModules();
    withSilo("BI");
    const { default: PipelineRouter } = await import("../PipelineRouter");
    render(
      <MemoryRouter initialEntries={["/pipeline"]}>
        <Routes>
          <Route path="/pipeline" element={<PipelineRouter />} />
          <Route path="/silo/bi/pipeline" element={<div data-testid="bi-canonical">BI canonical</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId("bi-canonical")).toBeInTheDocument();
    expect(screen.queryByTestId("bf-pipeline")).not.toBeInTheDocument();
  });

  it("renders BF PipelinePage when active silo is BF", async () => {
    vi.resetModules();
    withSilo("BF");
    const { default: PipelineRouter } = await import("../PipelineRouter");
    render(
      <MemoryRouter initialEntries={["/pipeline"]}>
        <Routes>
          <Route path="/pipeline" element={<PipelineRouter />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId("bf-pipeline")).toBeInTheDocument();
  });

  it("renders the SLF view (not the BF pipeline) when active silo is SLF", async () => {
    vi.resetModules();
    withSilo("SLF");
    const { default: PipelineRouter } = await import("../PipelineRouter");
    render(
      <MemoryRouter initialEntries={["/pipeline"]}>
        <Routes>
          <Route path="/pipeline" element={<PipelineRouter />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId("slf-view")).toBeInTheDocument();
    expect(screen.queryByTestId("bf-pipeline")).not.toBeInTheDocument();
  });
});
