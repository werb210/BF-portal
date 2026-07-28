import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../MarketingT", () => ({ default: () => <div>Apollo marketing module</div> }));
vi.mock("@/components/marketing/BrandedEmailComposer", () => ({
  default: ({ apiBase }: { apiBase?: string }) => <div>email composer: {apiBase}</div>,
}));

import BIMarketing from "../BIMarketing";

describe("BI marketing channel tabs", () => {
  it("keeps the existing Apollo module as the default channel", () => {
    render(<BIMarketing />);
    expect(screen.getByText("Apollo marketing module")).toBeInTheDocument();
    expect(screen.queryByText(/email composer:/)).not.toBeInTheDocument();
  });

  it("opens the shared composer against the BI API base", () => {
    render(<BIMarketing />);
    fireEvent.click(screen.getByRole("tab", { name: "Email" }));
    expect(screen.getByText("email composer: /api/v1/bi/marketing")).toBeInTheDocument();
  });
});
