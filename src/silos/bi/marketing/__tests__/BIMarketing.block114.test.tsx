import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const useAuthMock = vi.fn();
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => useAuthMock() }));
vi.mock("@/api", () => ({ api: vi.fn(async () => ({ sequences: [] })) }));

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

  it("BI Marketing heading still renders for Todd", () => {
    useAuthMock.mockReturnValue({ user: { id: "todd", name: "Todd", role: "Admin", capabilities: ["marketing:admin", "marketing:outreach"] } });
    render(<BIMarketing />);
    expect(screen.getByRole("heading", { name: /BI Marketing/i })).toBeInTheDocument();
  });
});
