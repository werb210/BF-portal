// BF_PORTAL_v870_CRM_DATA_MODEL - the pipeline picker, an extra pipeline's board, Settings > Pipelines and the mover.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, put: h.put } }));
vi.mock("@/pages/pipeline/PipelinePage", () => ({ default: () => <div data-testid="lending-board">Lending board</div> }));
vi.mock("@/teams/TeamFilter", () => ({ default: () => null, useReportTeam: () => "" }));

import PipelineRouter from "@/pages/pipeline/PipelineRouter";
import PipelinesSettings from "../PipelinesSettings";
import PipelineMover from "../PipelineMover";
import { textOn } from "../pipelinesApi";
import { contrast } from "@/crmFields/__tests__/contrast";

const lending = { id: "lending", name: "Lending", system: true, position: 0, archived_at: null, stages: [
  { id: "Received", name: "Received", position: 0, color: "#6366f1", probability: 10, outcome: "open", locked: true },
  { id: "Offer", name: "Offer", position: 1, color: "#15803d", probability: 75, outcome: "open", locked: true },
] };
const renewals = { id: "p1", name: "Renewals", system: false, position: 1, archived_at: null, stages: [
  { id: "s1", name: "Due soon", position: 0, color: "#0f766e", probability: 30, outcome: "open", locked: false, deals: 1 },
  { id: "s2", name: "Renewed", position: 1, color: "#15803d", probability: 100, outcome: "won", locked: false, deals: 0 },
] };
const list = (over: Record<string, unknown> = {}) => ({ silo: "BF", limit: 50, can_create: true, pipelines: [lending, renewals], ...over });

beforeEach(() => {
  h.get.mockReset(); h.post.mockReset(); h.put.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("the pipeline page", () => {
  it("is just the lending board without extra pipelines", async () => {
    h.get.mockResolvedValue(list({ pipelines: [lending] }));
    render(<MemoryRouter><PipelineRouter /></MemoryRouter>);
    expect(await screen.findByTestId("lending-board")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("switches to Renewals, and a deal can be dragged to another stage or sent back to Lending", async () => {
    h.get.mockImplementation(async (url: string) => (url.includes("/board")
      ? { pipeline: renewals, cards: [{ id: "a1", name: "Acme Ltd", stage_id: "s1", stage_entered_at: null, requested_amount: 50000, funded_amount: null, product_category: null, lending_stage: "Offer", owner_first_name: "Sam", owner_last_name: "B", contact_name: "Pat" }] }
      : list()));
    h.post.mockResolvedValue({ pipeline_id: "p1", stage: "Renewed" });
    render(<MemoryRouter><PipelineRouter /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("tab", { name: "Renewals" }));
    const due = await screen.findByTestId("stage-s1");
    expect(within(due).getByText("Due soon (1)")).toBeInTheDocument();
    expect(within(due).getByText(/\$50,000 - 30% = \$15,000/)).toBeInTheDocument();
    const card = within(due).getByTestId("card-a1");
    fireEvent.dragStart(card);
    fireEvent.drop(screen.getByTestId("stage-s2"));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/pipelines/move", { application_id: "a1", pipeline_id: "p1", stage_id: "s2" }));
    expect(within(screen.getByTestId("stage-s2")).getByText("Renewed (1)")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Move Acme Ltd"), { target: { value: "lending" } });
    await waitFor(() => expect(h.post).toHaveBeenLastCalledWith("/api/pipelines/move", { application_id: "a1", pipeline_id: "lending", stage_id: null }));
    expect(screen.queryByTestId("card-a1")).toBeNull();
  });

  it("stage headers stay readable on any colour", () => {
    for (const c of ["#0f766e", "#15803d", "#fde68a", "#ffffff", "#000000", "#6366f1"]) expect(contrast(textOn(c), c)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("Settings > Pipelines", () => {
  // BF_PORTAL_v909_LENDING_STAGE_DISPLAY - lending stages can be renamed, hidden and reordered (keys unchanged), with probabilities.
  it("lending stages: rename, hide, reorder and probabilities keep the built-in keys; a new pipeline is built from stages", async () => {
    h.get.mockResolvedValue(list({ pipelines: [lending] }));
    h.put.mockResolvedValue({ pipeline: lending });
    h.post.mockResolvedValue({ pipeline: renewals });
    render(<PipelinesSettings />);
    await screen.findByTestId("lending-stages");
    fireEvent.change(screen.getByLabelText("Offer probability"), { target: { value: "80" } });
    fireEvent.change(screen.getByLabelText("Offer shown as"), { target: { value: "Offer out" } });
    fireEvent.click(screen.getByLabelText("Hide Received"));
    fireEvent.click(screen.getByRole("button", { name: "Move Offer up" }));
    fireEvent.click(screen.getByRole("button", { name: "Save lending stages" }));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/pipelines/lending/probabilities", { Received: 10, Offer: 80 }));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/pipelines/lending/display", {
      Offer: { label: "Offer out", hidden: false, position: 0 },
      Received: { label: null, hidden: true, position: 1 },
    }));
    fireEvent.click(screen.getByRole("button", { name: "New pipeline" }));
    fireEvent.change(screen.getByLabelText("Pipeline name"), { target: { value: "Renewals" } });
    fireEvent.change(screen.getByLabelText("Stage 1 name"), { target: { value: "Due soon" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove stage 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Save pipeline" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/pipelines", { name: "Renewals", stages: [
      { id: undefined, name: "Due soon", color: "#1d4ed8", probability: 10, outcome: "open" },
      { id: undefined, name: "Won", color: "#15803d", probability: 100, outcome: "won" },
      { id: undefined, name: "Lost", color: "#4b5563", probability: 0, outcome: "lost" },
    ] }));
  });

  it("says when the safety limit is reached (no plan limit)", async () => {
    h.get.mockResolvedValue(list({ can_create: false }));
    render(<PipelinesSettings />);
    expect(await screen.findByText("You have the most pipelines this business line can hold (50). Archive one to add another.")).toBeInTheDocument();
  });
});

describe("on an application", () => {
  it("shows the deal's pipeline and moves it", async () => {
    h.get.mockImplementation(async (url: string) => (url.includes("/application/") ? { pipeline_id: "lending", stage_id: "Offer", stage: "Offer" } : list()));
    h.post.mockResolvedValue({ pipeline_id: "p1", stage: "Due soon" });
    render(<PipelineMover applicationId="a9" />);
    expect(await screen.findByText("This deal is in the Lending pipeline.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Move this deal to"), { target: { value: "p1|s1" } });
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/pipelines/move", { application_id: "a9", pipeline_id: "p1", stage_id: "s1" }));
    expect(await screen.findByText("Moved to Renewals: Due soon.")).toBeInTheDocument();
  });
});
