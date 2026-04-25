import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import BusinessUnitSelector from "@/components/BusinessUnitSelector";

const { useAuthMock, useSiloMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useSiloMock: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: useAuthMock,
}));

vi.mock("@/hooks/useSilo", () => ({
  useSilo: useSiloMock,
}));

describe("BusinessUnitSelector", () => {
  beforeEach(() => {
    useSiloMock.mockReturnValue({
      silo: "BF",
      setSilo: vi.fn(),
    });
    useAuthMock.mockReset();
  });

  it("renders a read-only label for single-silo users", () => {
    useAuthMock.mockReturnValue({
      user: { role: "Staff", silos: ["BF"] },
    });

    render(<BusinessUnitSelector />);

    expect(screen.getByText("Boreal Financial")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders a dropdown with only allowed user silos", () => {
    useAuthMock.mockReturnValue({
      user: { role: "Staff", silos: ["BF", "BI"] },
    });

    render(<BusinessUnitSelector />);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Boreal Financial" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Boreal Insurance" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Site Level Financial" })).not.toBeInTheDocument();
  });

  it("renders all three options for admins", () => {
    useAuthMock.mockReturnValue({
      user: { role: "Admin", silos: ["BF"] },
    });

    render(<BusinessUnitSelector />);

    expect(screen.getByRole("option", { name: "Boreal Financial" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Boreal Insurance" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Site Level Financial" })).toBeInTheDocument();
  });
});
