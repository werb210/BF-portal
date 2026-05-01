// BF_PORTAL_BLOCK_1_27_PIPELINE_SILO_ROUTE
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("@/pages/pipeline/PipelinePage", () => ({
  default: () => <div data-testid="bf-pipeline">BF Pipeline</div>,
}));
vi.mock("@/pages/applications/bi/BIPipelinePage", () => ({
  default: () => <div data-testid="bi-pipeline">BI Pipeline</div>,
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

describe("BF_PORTAL_BLOCK_1_27_PIPELINE_SILO_ROUTE", () => {
  it("renders BIPipelinePage when active silo is BI", async () => {
    vi.resetModules();
    withSilo("BI");
    const { default: PipelineRouter } = await import("../PipelineRouter");
    render(<PipelineRouter />);
    expect(screen.getByTestId("bi-pipeline")).toBeInTheDocument();
    expect(screen.queryByTestId("bf-pipeline")).not.toBeInTheDocument();
  });

  it("renders BF PipelinePage when active silo is BF", async () => {
    vi.resetModules();
    withSilo("BF");
    const { default: PipelineRouter } = await import("../PipelineRouter");
    render(<PipelineRouter />);
    expect(screen.getByTestId("bf-pipeline")).toBeInTheDocument();
    expect(screen.queryByTestId("bi-pipeline")).not.toBeInTheDocument();
  });

  it("renders BF PipelinePage when active silo is SLF (BF/SLF share the BF page for now)", async () => {
    vi.resetModules();
    withSilo("SLF");
    const { default: PipelineRouter } = await import("../PipelineRouter");
    render(<PipelineRouter />);
    expect(screen.getByTestId("bf-pipeline")).toBeInTheDocument();
  });
});
