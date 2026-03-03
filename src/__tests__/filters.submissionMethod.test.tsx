// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PipelineFilters from "@/core/engines/pipeline/PipelineFilters";
import { renderWithProviders } from "@/test/testUtils";
import { usePipelineStore } from "@/core/engines/pipeline/pipeline.store";

describe("submission method filters", () => {
  it("updates the submission method filter", async () => {
    usePipelineStore.setState({
      currentFilters: { sort: "updated_desc" },
      selectedApplicationId: null,
      selectedStageId: null,
      isDrawerOpen: false,
      draggingCardId: null,
      draggingFromStage: null,
      selectedApplicationIds: []
    });

    renderWithProviders(<PipelineFilters stages={[]} />);

    await userEvent.selectOptions(screen.getByLabelText(/Submission Method/i), "GOOGLE_SHEET");

    expect(usePipelineStore.getState().currentFilters.submissionMethod).toBe("GOOGLE_SHEET");
  });
});
