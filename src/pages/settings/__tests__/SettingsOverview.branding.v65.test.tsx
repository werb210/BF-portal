// BF_PORTAL_v65_REMOVE_BRANDING
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import SettingsOverview from "../tabs/SettingsOverview";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "Admin" } }),
}));

describe("BF_PORTAL_v65_REMOVE_BRANDING", () => {
  it("does not render Branding entry point on overview", () => {
    render(
      <MemoryRouter>
        <SettingsOverview />
      </MemoryRouter>
    );

    expect(screen.queryByRole("heading", { name: "Branding" })).toBeNull();
    expect(screen.queryByText(/Upload and resize the portal logo/i)).toBeNull();

    const links = screen.getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href"));

    expect(hrefs).not.toContain("/settings/branding");
    expect(hrefs).toContain("/settings/profile");
    expect(hrefs).toContain("/settings/runtime");
    expect(hrefs).toContain("/settings/users");
  });

  it("header copy no longer mentions branding", () => {
    render(
      <MemoryRouter>
        <SettingsOverview />
      </MemoryRouter>
    );

    expect(
      screen.getByText(
        "Choose a section to manage profile, runtime verification, or user access."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/profile, branding,/i)).toBeNull();
  });
});
