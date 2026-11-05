// BF_PORTAL_BI_SILO_NAV_v56 — regression for BI silo Settings tab
// scoping. BI Admin should see ONLY "My Profile". BF Admin should
// continue to see all four tabs (User Management, AI Knowledge, My
// Profile, Runtime Verification).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { render, screen } from "@testing-library/react";

const useAuthMock = vi.fn();
const useSiloMock = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/hooks/useSilo", () => ({
  useSilo: () => useSiloMock(),
}));

vi.mock("@/components/auth/RequireRole", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/system/ErrorBoundary", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/features/ai/KnowledgeManager", () => ({
  default: () => <div data-testid="ai-knowledge-mock" />,
}));

vi.mock("../components/SettingsSectionLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../tabs/ProfileSettings", () => ({
  default: () => <div data-testid="profile-mock" />,
}));

vi.mock("../tabs/RuntimeSettings", () => ({
  default: () => <div data-testid="runtime-mock" />,
}));

vi.mock("../tabs/UserManagement", () => ({
  default: () => <div data-testid="users-mock" />,
}));

vi.mock("../tabs/SettingsOverview", () => ({
  default: () => <div data-testid="overview-mock" />,
}));

import SettingsPage from "../SettingsPage";

function renderSettings(silo: string, role: string) {
  useSiloMock.mockReturnValue({ silo });
  useAuthMock.mockReturnValue({ user: { role } });
  // Wrap in Routes so useParams picks up :tab. Without this the page
  // renders the overview placeholder rather than the tab list.
  return render(
    <MemoryRouter initialEntries={["/settings/profile"]}>
      <Routes>
        <Route path="/settings/:tab" element={<SettingsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BF_PORTAL_BI_SILO_NAV_v56 — Settings tabs by silo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("BI Admin sees only My Profile", () => {
    renderSettings("BI", "Admin");
    expect(screen.getByRole("tab", { name: "My Profile" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Team and roles" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "AI Knowledge" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "System check" })).not.toBeInTheDocument();
  });

  // BF_PORTAL_v885_SETTINGS_ROLES - Admins get the grouped list; Staff and Marketing only My Profile and AI Knowledge.
  it("BF Admin sees the brokerage set-up groups", () => {
    renderSettings("BF", "Admin");
    const names = Array.from(screen.getByRole("tablist", { name: "Settings tabs" }).querySelectorAll('[role="tab"]')).map((t) => t.textContent);
    expect(names).toEqual(["My Profile", "Content", "AI Knowledge", "Team and roles", "CRM set-up", "Phone", "Money", "Risk and ID checks", "Sign-in and security", "Privacy and records", "Integrations", "Deal tools", "System check"]);
  });

  it.each(["Staff", "Marketing"])("BF %s sees the YOU items: My Profile, Content and AI Knowledge (v892)", (role) => {
    renderSettings("BF", role);
    const names = Array.from(screen.getByRole("tablist", { name: "Settings tabs" }).querySelectorAll('[role="tab"]')).map((t) => t.textContent);
    expect(names).toEqual(["My Profile", "Content", "AI Knowledge"]);
  });

  it("BI Staff sees only My Profile", () => {
    renderSettings("BI", "Staff");
    expect(screen.getByRole("tab", { name: "My Profile" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "System check" })).not.toBeInTheDocument();
  });
});

// BF_PORTAL_BI_SILO_NAV_v56_SETTINGS_TEST_ANCHOR
