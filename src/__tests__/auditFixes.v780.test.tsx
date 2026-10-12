// BF_PORTAL_V780 - audit fixes: Apollo sections gone, Disconnect reaches the server, no calls to missing addresses.
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  const urls: string[] = [];
  const record = (url: unknown) => { urls.push(String(url)); return Promise.resolve({}); };
  const apiFn = vi.fn((url: unknown) => record(url)) as any;
  for (const m of ["get", "post", "patch", "put", "delete", "getList"]) apiFn[m] = vi.fn((url: unknown) => record(url));
  return { apiFn, urls, record };
});
vi.mock("@/api", () => ({
  api: h.apiFn,
  default: h.apiFn,
  http: h.apiFn,
  apiFetch: h.apiFn,
  apiGetEnvelope: vi.fn((url: unknown) => h.record(url)),
  rawApiFetch: vi.fn((url: unknown) => h.record(url)),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", role: "Admin", name: "Portal User" } }) }));
vi.mock("@/utils/requireAuth", () => ({ requireAuth: vi.fn() }));
vi.mock("@/config/microsoftAuth", () => ({ microsoftAuthConfig: { clientId: "", authority: "", redirectUri: "", scopes: ["openid"] } }));
vi.mock("@azure/msal-browser", () => ({
  BrowserAuthError: class BrowserAuthError extends Error { errorCode = ""; },
  InteractionRequiredAuthError: class InteractionRequiredAuthError extends Error {},
  PublicClientApplication: class PublicClientApplication {
    initialize() { return Promise.resolve(); }
    getActiveAccount() { return null; }
    getAllAccounts() { return []; }
  },
}));
vi.mock("@/components/o365/OutOfOfficePanel", () => ({ default: () => null }));
vi.mock("@/components/o365/OneDriveFilePicker", () => ({ default: () => null }));
vi.mock("@/components/o365/ContactsSyncButton", () => ({ default: () => null }));

import ProfileSettings from "@/pages/settings/tabs/ProfileSettings";
import { useSettingsStore } from "@/state/settings.store";
import * as endpointsModule from "@/lib/endpoints";
import * as communications from "@/api/communications";
import * as crm from "@/api/crm";
import * as lenders from "@/api/lenders";

beforeEach(() => {
  h.urls.length = 0;
  useSettingsStore.getState().reset();
  h.apiFn.get.mockImplementation((url: string) => {
    h.urls.push(url);
    return Promise.resolve(url === "/api/users/me" ? { first_name: "Jamie", o365_connected: true, o365_email: "jamie@boreal.financial" } : {});
  });
});
afterEach(() => cleanup());

describe("v780 audit fixes", () => {
  it("Microsoft Disconnect forgets the connection on the server", async () => {
    render(<ProfileSettings />);
    const disconnect = await screen.findByRole("button", { name: "Disconnect" });
    h.apiFn.get.mockImplementation((url: string) => {
      h.urls.push(url);
      return Promise.resolve(url === "/api/users/me" ? { first_name: "Jamie", o365_connected: false } : {});
    });
    await act(async () => { fireEvent.click(disconnect); });
    expect(h.apiFn.post).toHaveBeenCalledWith("/api/o365-oauth/disconnect", {});
    await waitFor(() => expect(screen.queryByRole("button", { name: "Disconnect" })).toBeNull());
  });

  it("when the server refuses, the connection is not shown as gone", async () => {
    render(<ProfileSettings />);
    const disconnect = await screen.findByRole("button", { name: "Disconnect" });
    h.apiFn.post.mockImplementationOnce(() => Promise.reject(new Error("server said no")));
    await act(async () => { fireEvent.click(disconnect); });
    expect(await screen.findByText(/server said no|Could not disconnect Microsoft/)).toBeInTheDocument();
    expect(useSettingsStore.getState().profile.microsoftConnected).toBe(true);
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
  });

  it("unused calls to missing addresses are gone", async () => {
    const forbidden = [/dialer\/token/, /voice\/status/, /\/acknowledge/, /\/api\/crm\/deals/, /\/requirements\//];
    // The endpoint table.
    const declared = JSON.stringify(endpointsModule);
    for (const re of forbidden.slice(0, 2)) expect(declared).not.toMatch(re);

    // Every function the three API modules export, called with placeholder arguments; the addresses they
    // reach are recorded by the mocked client (and fetch).
    const fetchMock = vi.fn((url: unknown) => h.record(url).then(() => new Response("{}")));
    vi.stubGlobal("fetch", fetchMock);
    const arg: any = new Proxy(function placeholder() {}, {
      get: (_t, p) => (p === Symbol.toPrimitive ? () => "id-1" : p === Symbol.iterator ? function* () {} : p === "then" ? undefined : arg),
      apply: () => arg,
    });
    const fns: Array<(...a: unknown[]) => unknown> = [];
    for (const mod of [communications, crm, lenders] as Array<Record<string, unknown>>) {
      for (const value of Object.values(mod)) {
        if (typeof value === "function") fns.push(value as (...a: unknown[]) => unknown);
        else if (value && typeof value === "object") {
          for (const member of Object.values(value)) if (typeof member === "function") fns.push(member as (...a: unknown[]) => unknown);
        }
      }
    }
    expect(fns.length).toBeGreaterThan(20);
    for (const fn of fns) {
      try {
        await Promise.race([Promise.resolve(fn(arg, arg, arg, arg)), new Promise((r) => setTimeout(r, 20))]);
      } catch {
        /* a placeholder argument can upset a function; the addresses reached so far still count */
      }
    }
    vi.unstubAllGlobals();
    expect(h.urls.length).toBeGreaterThan(20);
    for (const re of forbidden) expect(h.urls.filter((u) => re.test(u)), String(re)).toEqual([]);
  });
});
