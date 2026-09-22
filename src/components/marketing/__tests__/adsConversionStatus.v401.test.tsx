// BF_PORTAL_ADS_CONVERSION_STATUS_v401
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/api", () => ({
  api: {
    get: vi.fn(async () => ({
      data: {
        submitted: { configured: true, sent: 3, waiting: 1 },
        qualified: { configured: false, sent: 0, waiting: 2 },
        funded: { configured: true, sent: 0, waiting: 0 },
        retracted: { configured: true, sent: 1, waiting: 0 },
      },
    })),
  },
}));

import AdsConversionStatus from "../AdsConversionStatus";

describe("Google Ads conversion status", () => {
  it("shows each conversion's sent / waiting / set-up state", async () => {
    render(<AdsConversionStatus />);
    await waitFor(() => expect(screen.getByText("Application submitted")).toBeTruthy());
    expect(screen.getByText("Qualified lead (Off to Lender or later)")).toBeTruthy();
    expect(screen.getByText("No - add GOOGLE_ADS_QUALIFIED_CONVERSION_ACTION_ID")).toBeTruthy();
    expect(screen.getByText("Rejected leads withdrawn from Google")).toBeTruthy();
  });
});
