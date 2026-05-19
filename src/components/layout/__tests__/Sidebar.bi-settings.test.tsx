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

function renderSidebar(silo: "BF" | "BI") {
  useSiloMock.mockReturnValue({ silo });
  useAuthMock.mockReturnValue({ user: { role: "Admin" } });

  return render(
    <MemoryRouter>
      <Sidebar isOpen onClose={() => {}} />
    </MemoryRouter>,
  );
}

describe("Sidebar BI settings visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides Settings for BI silo", () => {
    renderSidebar("BI");
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
  });

  it("shows Settings for BF silo", () => {
    renderSidebar("BF");
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });
});
