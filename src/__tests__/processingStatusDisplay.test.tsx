// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import DrawerHeader from "@/pages/applications/drawer/DrawerHeader";
import PipelineCard from "@/core/engines/pipeline/PipelineCard";
import type { PipelineApplication } from "@/core/engines/pipeline/pipeline.types";
import { renderWithProviders } from "@/test/testUtils";
import { fetchApplicationDetails } from "@/api/applications";

vi.mock("@/api/applications", () => ({
  fetchApplicationDetails: vi.fn()
}));

const fetchApplicationDetailsMock = vi.mocked(fetchApplicationDetails);

const baseCard: PipelineApplication = {
  id: "app-1",
  businessName: "Acme Co",
  requestedAmount: 50000,
  productCategory: "startup",
  stage: "RECEIVED",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe("processing status displays", () => {
  it.each([
    {
      label: "Processing: Pending",
      badge: "Pending",
      ocrCompletedAt: null,
      bankingCompletedAt: null
    },
    {
      label: "Processing: In progress",
      badge: "In progress",
      ocrCompletedAt: "2025-07-10T12:00:00Z",
      bankingCompletedAt: null
    },
    {
      label: "Processing: Complete",
      badge: "Complete",
      ocrCompletedAt: "2025-07-10T12:00:00Z",
      bankingCompletedAt: "2025-07-11T12:00:00Z"
    }
  ])("shows $label in the drawer header and $badge on the pipeline card", async ({
    label,
    badge,
    ocrCompletedAt,
    bankingCompletedAt
  }) => {
    fetchApplicationDetailsMock.mockResolvedValueOnce({
      id: "app-1",
      applicant: "Taylor Applicant",
      ocr_completed_at: ocrCompletedAt,
      banking_completed_at: bankingCompletedAt
    });

    renderWithProviders(<DrawerHeader applicationId="app-1" onClose={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    const cardWithProcessing = {
      ...baseCard,
      ocr_completed_at: ocrCompletedAt,
      banking_completed_at: bankingCompletedAt
    } as PipelineApplication;

    renderWithProviders(
      <PipelineCard
        card={cardWithProcessing}
        stageId="RECEIVED"
        onClick={() => undefined}
        isSelected={false}
        selectable={false}
        onSelectChange={() => undefined}
      />
    );

    expect(screen.getByText(badge)).toBeInTheDocument();
  });
});
