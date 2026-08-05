// BF_PORTAL_APOLLO_OFF_v10 - this file used to assert Apollo was the default
// channel. Apollo is retired, so the assertion is inverted rather than the
// change reverted: Email is now the landing tab.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/marketing/BrandedEmailComposer", () => ({
  default: ({ apiBase }: { apiBase?: string }) => <div>email composer: {apiBase}</div>,
}));

import BIMarketing from "../BIMarketing";

describe("BI marketing channel tabs", () => {
  it("opens the shared composer against the BI API base by default", () => {
    render(<BIMarketing />);
    expect(screen.getByText("email composer: /api/v1/bi/marketing")).toBeInTheDocument();
  });

  it("offers no Apollo tab", () => {
    render(<BIMarketing />);
    expect(screen.queryByRole("tab", { name: "Apollo" })).not.toBeInTheDocument();
  });

  it("still offers Sequences and Links", () => {
    render(<BIMarketing />);
    expect(screen.getByRole("tab", { name: "Sequences" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Links" }));
    expect(screen.getByRole("tab", { name: "Links" })).toHaveAttribute("aria-selected", "true");
  });
});
