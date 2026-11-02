// BF_PORTAL_v864_CONTENT_TAB - Settings > Content holds Templates, Snippets, Collateral, Library and Automations;
// the old tab addresses and Marketing > Automations forward to the matching section.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";

const useAuthMock = vi.fn();
const useSiloMock = vi.fn();
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => useAuthMock() }));
vi.mock("@/hooks/useSilo", () => ({ useSilo: () => useSiloMock() }));
vi.mock("@/components/auth/RequireRole", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/system/ErrorBoundary", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/features/ai/KnowledgeManager", () => ({ default: () => null }));
vi.mock("@/features/ai/MayaTuning", () => ({ default: () => null }));
vi.mock("@/fraud/FraudProtectionCard", () => ({ default: () => null }));
vi.mock("@/features/quickbooks/QuickBooksCard", () => ({ default: () => null }));
vi.mock("../components/SettingsSectionLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("../tabs/ProfileSettings", () => ({ default: () => <div data-testid="profile-mock" /> }));
vi.mock("../tabs/RuntimeSettings", () => ({ default: () => null }));
vi.mock("../tabs/UserManagement", () => ({ default: () => null }));
vi.mock("../tabs/PhoneLines", () => ({ default: () => null }));
vi.mock("../tabs/RetentionSettings", () => ({ default: () => null }));
vi.mock("../tabs/SettingsOverview", () => ({ default: () => null }));
vi.mock("../tabs/TemplatesSettings", () => ({ default: () => <div data-testid="templates-mock" /> }));
vi.mock("../tabs/SnippetsSettings", () => ({ default: () => <div data-testid="snippets-mock" /> }));
vi.mock("../tabs/CollateralSettings", () => ({ default: () => <div data-testid="collateral-mock" /> }));
vi.mock("@/pages/library/LibraryPage", () => ({ default: () => <div data-testid="library-mock" /> }));
vi.mock("@/pages/admin/AutomationsPage", () => ({ default: () => <div data-testid="automations-mock" /> }));
vi.mock("@/pages/marketing/AutomationsSystemRules", () => ({ default: () => <div data-testid="system-rules-mock" /> }));

import SettingsPage from "../SettingsPage";

function Where() { const l = useLocation(); return <div data-testid="where">{l.pathname + l.search}</div>; }
function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/settings/:tab" element={<><SettingsPage /><Where /></>} /></Routes>
    </MemoryRouter>,
  );
}

describe("Settings > Content (v864)", () => {
  beforeEach(() => {
    useSiloMock.mockReturnValue({ silo: "BF" });
    useAuthMock.mockReturnValue({ user: { role: "Admin" } });
  });

  it("has one Content tab instead of Templates / Snippets / Collateral / Library", () => {
    at("/settings/profile");
    const top = screen.getByRole("tablist", { name: "Settings tabs" });
    const names = Array.from(top.querySelectorAll('[role="tab"]')).map((t) => t.textContent);
    expect(names).toContain("Content");
    for (const gone of ["Templates", "Snippets", "Collateral", "Library"]) expect(names).not.toContain(gone);
  });

  it("shows every section and switches between them", () => {
    at("/settings/content");
    const sections = screen.getByRole("tablist", { name: "Content sections" });
    expect(Array.from(sections.querySelectorAll('[role="tab"]')).map((t) => t.textContent)).toEqual(["Templates", "Snippets", "Collateral", "Library", "Automations"]);
    expect(screen.getByTestId("templates-mock")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Automations" }));
    expect(screen.getByTestId("automations-mock")).toBeInTheDocument();
    expect(screen.getByTestId("system-rules-mock")).toBeInTheDocument();
    expect(screen.getByTestId("where").textContent).toBe("/settings/content?section=automations");
  });

  it.each([["templates", "templates-mock"], ["snippets", "snippets-mock"], ["collateral", "collateral-mock"], ["library", "library-mock"]])(
    "the old /settings/%s address forwards to its Content section", async (old, testId) => {
      at(`/settings/${old}`);
      expect(await screen.findByTestId(testId)).toBeInTheDocument();
      expect(screen.getByTestId("where").textContent).toBe(`/settings/content?section=${old}`);
      expect(screen.getByRole("tab", { name: "Content" })).toHaveAttribute("aria-selected", "true");
    });

  it("Staff see the content sections but not the automation builder; BI keeps Snippets and Library", () => {
    useAuthMock.mockReturnValue({ user: { role: "Staff" } });
    const { unmount } = at("/settings/content");
    expect(screen.queryByRole("tab", { name: "Automations" })).toBeNull();
    unmount();
    useSiloMock.mockReturnValue({ silo: "BI" });
    useAuthMock.mockReturnValue({ user: { role: "Admin" } });
    at("/settings/content");
    const sections = screen.getByRole("tablist", { name: "Content sections" });
    expect(Array.from(sections.querySelectorAll('[role="tab"]')).map((t) => t.textContent)).toEqual(["Snippets", "Library"]);
  });
});
