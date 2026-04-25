import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import Sidebar from "@/components/layout/Sidebar";

const useAuthMock = vi.fn();
const useSiloMock = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/hooks/useSilo", () => ({
  useSilo: () => useSiloMock(),
}));

function renderSidebar(role?: string) {
  useSiloMock.mockReturnValue({ silo: "BF" });
  useAuthMock.mockReturnValue({ user: role ? { role } : null });

  return render(
    <MemoryRouter>
      <Sidebar isOpen onClose={() => {}} />
    </MemoryRouter>,
  );
}

describe("Sidebar role visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Marketing role sees the Marketing link", () => {
    renderSidebar("Marketing");
    expect(screen.getByRole("link", { name: "Marketing" })).toBeInTheDocument();
  });

  it("Staff role does not see Marketing", () => {
    renderSidebar("Staff");
    expect(screen.queryByRole("link", { name: "Marketing" })).not.toBeInTheDocument();
  });

  it("Admin role sees both Marketing and Dashboard", () => {
    renderSidebar("Admin");
    expect(screen.getByRole("link", { name: "Marketing" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("Lender role sees no staff navigation", () => {
    renderSidebar("Lender");
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Marketing" })).not.toBeInTheDocument();
  });
});
