// BF_PORTAL_PARTNERS_TABS_v720
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";

vi.mock("../BFReferrerManagement", () => ({ default: () => <div>referrer-management</div> }));
vi.mock("@/pages/brokerImports/BrokerImportsPage", () => ({ default: () => <div>broker-files</div> }));
import ReferrersAndBrokers from "../ReferrersAndBrokers";

describe("Marketing > Referrers sub-tabs", () => {
  it("shows Referrers first and Brokers (broker files) on the second sub-tab", () => {
    render(<ReferrersAndBrokers />);
    expect(screen.getByText("referrer-management")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Brokers" }));
    expect(screen.getByText("broker-files")).toBeTruthy();
  });
  it("Broker Files is gone from Settings and old links redirect to Referrers > Brokers", () => {
    expect(readFileSync("src/pages/settings/SettingsPage.tsx", "utf8")).not.toContain('id: "broker-files"');
    expect(readFileSync("src/App.tsx", "utf8")).toContain('<Route path="/settings/broker-files" element={<Navigate to="/marketing?tab=referrers&sub=brokers" replace />} />');
  });
});
