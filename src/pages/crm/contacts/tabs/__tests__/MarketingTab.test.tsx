import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MarketingTab from "../MarketingTab";

vi.mock("@/api/apolloMarketing", () => ({
  fetchContactMarketing: vi.fn(),
  triggerEnrichment: vi.fn(),
}));

import { fetchContactMarketing, triggerEnrichment } from "@/api/apolloMarketing";

describe("MarketingTab", () => {
  beforeEach(() => {
    vi.mocked(triggerEnrichment).mockResolvedValue({ cached: true, apollo_data: null });
    vi.mocked(fetchContactMarketing).mockResolvedValue({
      contact: {
        id: "c-1", full_name: "Jane Doe", email: "j@acme.com", apollo_contact_id: "ap-1",
        apollo_data: { title: "VP Sales", organization: { name: "Acme", industry: "SaaS", estimated_num_employees: 250 } },
        apollo_stage: "Engaged", apollo_sequence_names: ["Q2 Outreach"], apollo_last_synced_at: "2026-04-20T10:00:00Z",
      },
      events: [{ id: "e-1", event_type: "email_replied", sequence_name: "Q2 Outreach", occurred_at: "2026-04-21T09:00:00Z", metadata: {} }],
    });
  });

  it("shows enrichment + engagement timeline", async () => {
    render(<MarketingTab contactId="c-1" />);
    await waitFor(() => expect(screen.getByText("Apollo Enrichment")).toBeTruthy());
    expect(screen.getByText("VP Sales")).toBeTruthy();
    expect(screen.getByText("Acme")).toBeTruthy();
    expect(screen.getByText(/Replied/)).toBeTruthy();
  });
});
