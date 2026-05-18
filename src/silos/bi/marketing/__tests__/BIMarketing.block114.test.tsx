import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const useAuthMock = vi.fn();
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => useAuthMock() }));
vi.mock("@/api", () => ({ api: vi.fn(async () => ({ sequences: [] })) }));

import BIMarketing from "@/silos/bi/marketing/BIMarketing";

describe("BIMarketing Block 114 view tabs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Todd sees both Marketing view tabs", () => {
    useAuthMock.mockReturnValue({ user: { id: "todd", name: "Todd", role: "Admin", capabilities: ["marketing:admin", "marketing:outreach"] } });
    render(<BIMarketing />);
    expect(screen.getByRole("button", { name: "Marketing — T" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marketing — A" })).toBeInTheDocument();
  });

  it("Andrew sees neither Todd testing tab nor toggle", () => {
    useAuthMock.mockReturnValue({ user: { id: "andrew", name: "Andrew", role: "Staff", capabilities: ["marketing:outreach"] } });
    render(<BIMarketing />);
    expect(screen.queryByRole("button", { name: "Marketing — T" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marketing — A" })).not.toBeInTheDocument();
  });
});
