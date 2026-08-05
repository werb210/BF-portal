import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const useAuthMock = vi.fn();
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => useAuthMock() }));
// BF_PORTAL_SEQUENCE_CANVAS_v1 - BIMarketing now loads templates and task queues
// on mount for the sequence canvas, so the mock needs api.get and api.post as
// well as the bare callable. Without them the component threw
// "api.get is not a function" during render and every assertion in this file
// failed for a reason that had nothing to do with what it tests.
vi.mock("@/api", () => {
  const api: any = vi.fn(async () => ({ sequences: [] }));
  api.get = vi.fn(async () => ({ items: [], queues: [] }));
  api.post = vi.fn(async () => ({ ok: true }));
  api.delete = vi.fn(async () => ({ ok: true }));
  return { api };
});

// BF_PORTAL_APOLLO_OFF_v10 - Email is now the default channel, so rendering
// BIMarketing mounts the real BrandedEmailComposer, which observes its preview
// pane with a ResizeObserver that jsdom does not implement. This file tests the
// T/A toggle, not the composer, so the composer is stubbed.
vi.mock("@/components/marketing/BrandedEmailComposer", () => ({
  default: () => <div>email composer</div>,
}));

import BIMarketing from "@/silos/bi/marketing/BIMarketing";

describe("BIMarketing v215 toggle removed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Todd does not see the deprecated Marketing T/A toggle", () => {
    useAuthMock.mockReturnValue({ user: { id: "todd", name: "Todd", role: "Admin", capabilities: ["marketing:admin", "marketing:outreach"] } });
    render(<BIMarketing />);
    expect(screen.queryByRole("button", { name: "Marketing — T" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marketing — A" })).not.toBeInTheDocument();
  });

  it("Andrew does not see the deprecated Marketing T/A toggle", () => {
    useAuthMock.mockReturnValue({ user: { id: "andrew", name: "Andrew", role: "Staff", capabilities: ["marketing:outreach"] } });
    render(<BIMarketing />);
    expect(screen.queryByRole("button", { name: "Marketing — T" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marketing — A" })).not.toBeInTheDocument();
  });

  // BF_PORTAL_APOLLO_OFF_v10 - the "BI Marketing" heading lived inside the
  // Apollo module (MarketingT), which was the default tab. Apollo is retired,
  // so the page now opens on the email composer. The point of this test is that
  // BIMarketing still renders something for an admin, so it asserts the channel
  // tablist instead of a heading that no longer exists.
  it("still renders the channel tabs for Todd", () => {
    useAuthMock.mockReturnValue({ user: { id: "todd", name: "Todd", role: "Admin", capabilities: ["marketing:admin", "marketing:outreach"] } });
    render(<BIMarketing />);
    expect(screen.getByRole("tablist", { name: "Marketing channels" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Email" })).toBeInTheDocument();
  });
});
