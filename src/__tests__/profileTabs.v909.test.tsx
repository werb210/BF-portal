// BF_PORTAL_v909_PROFILE_TABS - My Profile in five parts; a Staff member does not edit shared mailbox signatures; the
// photo is saved the moment it is chosen. Also: Add user can assign a free direct number.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  const apiFn = vi.fn(async () => ({})) as any;
  for (const m of ["get", "post", "patch", "put", "delete", "getList"]) apiFn[m] = vi.fn(async () => ({}));
  return { apiFn, role: "Staff" };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, http: h.apiFn, apiFetch: h.apiFn, apiGetEnvelope: vi.fn(async () => ({})), rawApiFetch: vi.fn(async () => ({})) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", role: h.role, name: "Portal User" } }) }));
vi.mock("@/utils/requireAuth", () => ({ requireAuth: vi.fn() }));
vi.mock("@/config/microsoftAuth", () => ({ microsoftAuthConfig: { clientId: "", authority: "", redirectUri: "", scopes: ["openid"] } }));
vi.mock("@azure/msal-browser", () => ({
  BrowserAuthError: class BrowserAuthError extends Error { errorCode = ""; },
  InteractionRequiredAuthError: class InteractionRequiredAuthError extends Error {},
  PublicClientApplication: class PublicClientApplication { initialize() { return Promise.resolve(); } getActiveAccount() { return null; } getAllAccounts() { return []; } },
}));
vi.mock("@/components/o365/OutOfOfficePanel", () => ({ default: () => <div data-testid="ooo" /> }));
vi.mock("@/components/o365/ContactsSyncButton", () => ({ default: () => null }));

import ProfileSettings from "@/pages/settings/tabs/ProfileSettings";
import { useSettingsStore } from "@/state/settings.store";

beforeEach(() => {
  h.role = "Staff";
  useSettingsStore.getState().reset();
  h.apiFn.get.mockImplementation(async (url: string) => (url === "/api/users/me" ? { first_name: "Jamie", last_name: "Quinn", email: "j@example.com" } : {}));
  h.apiFn.patch.mockReset(); h.apiFn.patch.mockResolvedValue({ ok: true });
});

describe("My Profile tabs", () => {
  it("has the five parts, each with its own sections", async () => {
    render(<ProfileSettings />);
    const names = (await screen.findAllByRole("tab")).map((t) => t.textContent);
    expect(names).toEqual(["Profile & photo", "Email signature", "Booking & follow-ups", "Devices & security", "Notifications & out of office"]);
    expect(screen.getByLabelText("Upload profile image")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Devices & security" }));
    expect(screen.getByText("Passkeys")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Notifications & out of office" }));
    expect(screen.getByRole("button", { name: "Enable notifications" })).toBeInTheDocument();
    expect(screen.getByTestId("ooo")).toBeInTheDocument();
  });
  it("shared mailbox signatures are for Admins only", async () => {
    render(<ProfileSettings />);
    fireEvent.click(await screen.findByRole("tab", { name: "Email signature" }));
    expect(screen.getByTestId("shared-signature-admin-only")).toHaveTextContent("set by an Admin");
  });
});
