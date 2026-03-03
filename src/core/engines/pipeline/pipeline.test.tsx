import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MockedFunction } from "vitest";
import PipelinePage from "./PipelinePage";
import { PipelineEngineProvider } from "./PipelineEngineProvider";
import { renderWithProviders } from "@/test/testUtils";
import { pipelineApi } from "./pipeline.api";
import { usePipelineStore } from "./pipeline.store";
import { type PipelineApplication, type PipelineStage } from "./pipeline.types";
import ApplicationShellPage from "@/pages/applications/ApplicationShellPage";
import { fetchPortalApplication, openPortalApplication } from "@/api/applications";

vi.mock("./pipeline.api", () => {
  const fetchPipeline = vi.fn().mockResolvedValue({ stages: [], applications: [] });
  return { pipelineApi: { fetchPipeline, exportApplications: vi.fn() } };
});

vi.mock("@/api/applications", () => ({
  fetchPortalApplication: vi.fn(),
  openPortalApplication: vi.fn()
}));

const pipelineStages: PipelineStage[] = [
  { id: "OFFER", label: "Offer" },
  { id: "RECEIVED", label: "Received" },
  { id: "DOCUMENTS_REQUIRED", label: "Documents Required" },
  { id: "IN_REVIEW", label: "In Review" },
  { id: "STARTUP", label: "Start-up" },
  { id: "OFF_TO_LENDER", label: "Off to Lender" },
  { id: "ACCEPTED", label: "Accepted" },
  { id: "REJECTED", label: "Rejected" }
];

const sampleCards: PipelineApplication[] = [
  {
    id: "app-1",
    businessName: "Acme Co",
    requestedAmount: 50000,
    productCategory: "startup",
    stage: "RECEIVED",
    createdAt: "2024-01-01T10:00:00.000Z",
    updatedAt: "2024-01-03T10:00:00.000Z"
  },
  {
    id: "app-2",
    businessName: "Beacon LLC",
    requestedAmount: 250000,
    productCategory: "sba",
    stage: "DOCUMENTS_REQUIRED",
    createdAt: "2024-01-02T10:00:00.000Z",
    updatedAt: "2024-01-04T10:00:00.000Z"
  }
];

const renderPipeline = () =>
  renderWithProviders(
    <MemoryRouter initialEntries={["/pipeline"]}>
      <Routes>
        <Route
          path="/pipeline"
          element={
            <PipelineEngineProvider
              config={{
                businessUnit: "BF",
                api: {
                  fetchPipeline: pipelineApi.fetchPipeline,
                  updateStage: vi.fn(),
                  exportApplications: pipelineApi.exportApplications
                }
              }}
            >
              <PipelinePage />
            </PipelineEngineProvider>
          }
        />
        <Route path="/applications/:id" element={<ApplicationShellPage />} />
      </Routes>
    </MemoryRouter>
  );

describe("Pipeline board", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (pipelineApi.fetchPipeline as MockedFunction<typeof pipelineApi.fetchPipeline>).mockResolvedValue({
      stages: pipelineStages,
      applications: sampleCards
    });
    (fetchPortalApplication as MockedFunction<typeof fetchPortalApplication>).mockResolvedValue({
      id: "app-1",
      business_name: "Acme Co",
      current_stage: "RECEIVED"
    });
    (openPortalApplication as MockedFunction<typeof openPortalApplication>).mockResolvedValue({});
    usePipelineStore.getState().resetPipeline();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("renders all pipeline stages in locked order", async () => {
    const { container } = renderPipeline();

    await waitFor(() => {
      [
        "Received",
        "In Review",
        "Documents Required",
        "Start-up",
        "Off to Lender",
        "Offer",
        "Accepted",
        "Rejected"
      ].forEach((label) => {
        const headers = screen.getAllByText(label, { selector: ".pipeline-column__title" });
        expect(headers.length).toBeGreaterThan(0);
      });
    });

    await waitFor(() => expect(pipelineApi.fetchPipeline).toHaveBeenCalled());

    const orderedLabels = Array.from(container.querySelectorAll(".pipeline-column__title")).map(
      (node) => node.textContent
    );
    expect(orderedLabels).toEqual([
      "Received",
      "In Review",
      "Documents Required",
      "Start-up",
      "Off to Lender",
      "Offer",
      "Accepted",
      "Rejected"
    ]);
  });

  it("groups cards by current stage", async () => {
    renderPipeline();

    const receivedColumn = await screen.findByTestId("pipeline-column-RECEIVED");
    const docsColumn = await screen.findByTestId("pipeline-column-DOCUMENTS_REQUIRED");

    expect(within(receivedColumn).getByText("Acme Co")).toBeInTheDocument();
    expect(within(docsColumn).getByText("Beacon LLC")).toBeInTheDocument();
  });

  it("opens the application shell when clicking a card", async () => {
    renderPipeline();

    await userEvent.click(await screen.findByText("Acme Co"));

    expect(await screen.findByText("Coming in next block.")).toBeInTheDocument();
    expect(screen.getByText("Acme Co")).toBeInTheDocument();
  });

  it("calls the open endpoint once on first open", async () => {
    renderPipeline();

    await userEvent.click(await screen.findByText("Acme Co"));
    await waitFor(() => expect(openPortalApplication).toHaveBeenCalledWith("app-1"));

    await userEvent.click(screen.getByRole("button", { name: "Documents" }));

    expect(openPortalApplication).toHaveBeenCalledTimes(1);
  });

  it("does not render drag and drop affordances", async () => {
    renderPipeline();

    await screen.findByText("Acme Co");

    expect(document.querySelectorAll("[data-dnd-kit-draggable]").length).toBe(0);
    expect(document.querySelectorAll("[draggable='true']").length).toBe(0);
  });

  it("does not allow manual stage changes", async () => {
    renderPipeline();

    await screen.findByText("Acme Co");

    expect(screen.queryByRole("button", { name: /Received/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /In Review/i })).not.toBeInTheDocument();
  });
});
