import { screen } from "@testing-library/react";
import PipelineCard from "./PipelineCard";
import type { PipelineApplication } from "./pipeline.types";
import { renderWithProviders } from "@/test/testUtils";

const baseCard: PipelineApplication = {
  id: "app-1",
  businessName: "Acme Co",
  requestedAmount: 50000,
  productCategory: "startup",
  stage: "RECEIVED",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe("PipelineCard", () => {
  it("shows a warning badge when documents are required", () => {
    renderWithProviders(
      <PipelineCard
        card={baseCard}
        stageId="DOCUMENTS_REQUIRED"
        onClick={() => undefined}
        isSelected={false}
        selectable={false}
        onSelectChange={() => undefined}
      />
    );

    expect(screen.getByText("Documents Required")).toBeInTheDocument();
  });
});
