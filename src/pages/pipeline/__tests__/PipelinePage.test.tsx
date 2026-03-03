import { cleanup, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { MockedFunction } from "vitest";
import PipelinePage from "@/core/engines/pipeline/PipelinePage";
import { PipelineEngineProvider } from "@/core/engines/pipeline/PipelineEngineProvider";
import { renderWithProviders } from "@/test/testUtils";
import { pipelineApi } from "@/core/engines/pipeline/pipeline.api";
import type { PipelineApplication, PipelineStage } from "@/core/engines/pipeline/pipeline.types";
import { usePipelineStore } from "@/core/engines/pipeline/pipeline.store";

vi.mock("@/core/engines/pipeline/pipeline.api", () => ({
  pipelineApi: {
    fetchPipeline: vi.fn(),
    exportApplications: vi.fn()
  }
}));

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.search}</div>;
};

const stages: PipelineStage[] = [
  { id: "RECEIVED", label: "Received" },
  { id: "IN_REVIEW", label: "In Review", allowedTransitions: ["DOCUMENTS_REQUIRED"] },
  { id: "DOCUMENTS_REQUIRED", label: "Documents Required" },
  { id: "REJECTED", label: "Rejected", terminal: true }
];

const baseCards: PipelineApplication[] = [
  {
    id: "app-1",
    businessName: "Acme Co",
    requestedAmount: 50000,
    stage: "RECEIVED",
    createdAt: "2024-01-01T10:00:00.000Z",
    updatedAt: "2024-01-03T10:00:00.000Z"
  },
  {
    id: "app-2",
    businessName: "Beacon LLC",
    requestedAmount: 250000,
    stage: "RECEIVED",
    createdAt: "2024-01-02T10:00:00.000Z",
    updatedAt: "2024-01-04T10:00:00.000Z"
  },
  {
    id: "app-3",
    businessName: "Cedar Inc",
    requestedAmount: 100000,
    stage: "REJECTED",
    createdAt: "2024-01-03T10:00:00.000Z",
    updatedAt: "2024-01-05T10:00:00.000Z"
  }
];

const renderPipeline = (initialEntries = ["/pipeline"], role: string | null = "Admin") =>
  renderWithProviders(
    <MemoryRouter initialEntries={initialEntries}>
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
              <LocationDisplay />
            </PipelineEngineProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
    { auth: { user: { id: "1", email: "user@test.com", role } } }
  );

describe("PipelinePage filters and bulk actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePipelineStore.getState().resetPipeline();
    (pipelineApi.fetchPipeline as MockedFunction<typeof pipelineApi.fetchPipeline>).mockResolvedValue({
      stages,
      applications: baseCards
    });
  });

  it("syncs filters with the URL and passes them to the API", async () => {
    renderPipeline(["/pipeline?stage=RECEIVED&sort=amount_desc"]);

    await waitFor(() =>
      expect(pipelineApi.fetchPipeline).toHaveBeenCalledWith(
        expect.objectContaining({ stageId: "RECEIVED", sort: "amount_desc" }),
        expect.any(Object)
      )
    );

    const statusSelect = await screen.findByLabelText("Processing Status");
    await userEvent.selectOptions(statusSelect, "OCR");

    expect(screen.getByTestId("location-display").textContent).toContain("processingStatus=OCR");
  });

  it("sorts cards by requested amount", async () => {
    renderPipeline();

    await userEvent.selectOptions(await screen.findByLabelText("Sort"), "amount_desc");

    const column = await screen.findByTestId("pipeline-column-RECEIVED");
    const cards = within(column).getAllByText(/Co|LLC/);
    expect(cards[0]).toHaveTextContent("Beacon LLC");
  });

  it("supports bulk selection with stage enforcement and CSV export snapshot", async () => {
    const csvBlob = new Blob(["id,stage\napp-1,RECEIVED\n"], { type: "text/csv" });
    (pipelineApi.exportApplications as MockedFunction<typeof pipelineApi.exportApplications>).mockResolvedValue(csvBlob);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    Object.defineProperty(global.URL, "createObjectURL", {
      value: vi.fn(() => "blob:mock"),
      writable: true
    });
    Object.defineProperty(global.URL, "revokeObjectURL", {
      value: vi.fn(),
      writable: true
    });

    renderPipeline();

    const firstCheckbox = await screen.findByLabelText("Select Acme Co");
    await userEvent.click(firstCheckbox);
    expect(await screen.findByText("selected")).toBeInTheDocument();

    const rejectedCheckbox = screen.getByLabelText("Select Cedar Inc");
    await userEvent.click(rejectedCheckbox);

    const moveButton = screen.getByRole("button", { name: /Move to next stage/i });
    expect(moveButton).toBeDisabled();

    const exportButton = screen.getByRole("button", { name: /Export CSV/i });
    await userEvent.click(exportButton);
    await userEvent.click(await screen.findByRole("button", { name: /Confirm/i }));

    await waitFor(() => expect(pipelineApi.exportApplications).toHaveBeenCalled());
    expect(await new Response(csvBlob).text()).toMatchSnapshot();
  });

  it("renders role-based views", async () => {
    usePipelineStore.getState().resetPipeline();
    const { container: viewerContainer } = renderPipeline(["/pipeline"], "Viewer");
    expect(await screen.findByText("Application Pipeline")).toBeInTheDocument();
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
    expect(viewerContainer).toMatchSnapshot();

    cleanup();
    usePipelineStore.getState().resetPipeline();
    const { container: staffContainer } = renderPipeline(["/pipeline"], "Staff");
    expect(await screen.findByText("Application Pipeline")).toBeInTheDocument();
    expect(staffContainer).toMatchSnapshot();

    cleanup();
    usePipelineStore.getState().resetPipeline();
    const { container: adminContainer } = renderPipeline(["/pipeline"], "Admin");
    expect(await screen.findByText("Application Pipeline")).toBeInTheDocument();
    expect(adminContainer).toMatchSnapshot();
  });

  it("disables selection for viewer roles", async () => {
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
        </Routes>
      </MemoryRouter>,
      { auth: { user: { id: "viewer", email: "viewer@test.com", role: "Viewer" } } }
    );

    await screen.findByText("Application Pipeline");
    const checkbox = await screen.findByLabelText("Select Acme Co");
    expect(checkbox).toBeDisabled();
  });

  it("moves selected applications to the next stage", async () => {
    const updateStage = vi.fn().mockResolvedValue({});

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
                    updateStage,
                    exportApplications: pipelineApi.exportApplications
                  }
                }}
              >
                <PipelinePage />
              </PipelineEngineProvider>
            }
          />
        </Routes>
      </MemoryRouter>,
      { auth: { user: { id: "1", email: "user@test.com", role: "Admin" } } }
    );

    await userEvent.click(await screen.findByLabelText("Select Acme Co"));
    const moveButton = screen.getByRole("button", { name: /Move to next stage/i });
    await userEvent.click(moveButton);
    await userEvent.click(await screen.findByRole("button", { name: /Confirm/i }));

    await waitFor(() => {
      expect(updateStage).toHaveBeenCalledWith("app-1", "IN_REVIEW");
    });
  });
});
