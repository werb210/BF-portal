// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import PrivateRoute from "@/router/PrivateRoute";

describe("role-restricted routes", () => {
  it("renders restricted content when authenticated", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/restricted"]}>
        <Routes>
          <Route
            path="/restricted"
            element={
              <PrivateRoute allowedRoles={['Admin']}>
                <div>Restricted content</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
      {
        auth: {
          user: { id: "u-9", name: "Lender User", email: "lender@example.com", role: "Lender" },
          authState: "authenticated",
          authStatus: "authenticated",
          rolesStatus: "resolved",
          authenticated: true,
          authReady: true
        }
      }
    );

    expect(screen.getByText("Restricted content")).toBeInTheDocument();
  });


  it("renders CRM content when authenticated", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/crm"]}>
        <Routes>
          <Route
            path="/crm"
            element={
              <PrivateRoute allowedRoles={['Admin', 'Staff']}>
                <div>CRM content</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
      {
        auth: {
          user: { id: "u-10", name: "Lender User", email: "lender@example.com", role: "Lender" },
          authState: "authenticated",
          authStatus: "authenticated",
          rolesStatus: "resolved",
          authenticated: true,
          authReady: true
        }
      }
    );

    expect(screen.getByText("CRM content")).toBeInTheDocument();
  });

});
