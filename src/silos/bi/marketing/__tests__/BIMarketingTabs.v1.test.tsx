// BF_PORTAL_APOLLO_OFF_v10 - this file used to assert Apollo was the default
// channel. Apollo is retired, so the assertion is inverted rather than the
// change reverted: Email is now the landing tab.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/marketing/OutreachPanel", () => ({ default: () => <div>outreach pipeline</div>, PGI_OUTREACH: {} })); // BF_PORTAL_BI_MARKETING_OUTREACH_FIRST_v1
vi.mock("@/components/marketing/BrandedEmailComposer", () => ({
  default: ({ apiBase }: { apiBase?: string }) => <div>email composer: {apiBase}</div>,
}));

vi.mock("../tabs/FlowsTab", () => ({ default: () => <div>flows tab</div> }));

import BIMarketing from "../BIMarketing";

describe("BI marketing channel tabs", () => {
  it("opens on Outreach; Flows and Email beside it; Sequences stay retired", () => {
    render(<BIMarketing />);
    expect(screen.getByText("outreach pipeline")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Flows" }));
    expect(screen.getByText("flows tab")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Email" }));
    expect(screen.getByText("email composer: /api/v1/bi/marketing")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Sequences" })).not.toBeInTheDocument();
  });

  it("offers no Apollo tab", () => {
    render(<BIMarketing />);
    expect(screen.queryByRole("tab", { name: "Apollo" })).not.toBeInTheDocument();
  });

  it("still offers Links", () => {
    render(<BIMarketing />);
    fireEvent.click(screen.getByRole("tab", { name: "Links" }));
    expect(screen.getByRole("tab", { name: "Links" })).toHaveAttribute("aria-selected", "true");
  });
});
