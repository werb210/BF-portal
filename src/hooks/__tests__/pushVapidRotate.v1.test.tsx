// BF_PORTAL_PUSH_VAPID_ROTATE_v1
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  const apiFn = vi.fn(async () => ({})) as any;
  for (const m of ["get", "post", "patch", "put", "delete"]) apiFn[m] = vi.fn(async () => ({}));
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, rawApiFetch: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", role: "Admin" } }) }));
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

import { decodeVapidPublicKey, registerExistingPushPermission } from "../usePushRegistration";
import { usePushNotifications } from "../usePushNotifications";
import ProfileSettings from "@/pages/settings/tabs/ProfileSettings";

const NEW_KEY = "BAECAwQFBgcICQ"; // bytes 4,1,2,3,4,5,6,7,8,9
const OLD_KEY = "BAkICQ";

type FakeSub = { options: { applicationServerKey: ArrayBuffer | null }; unsubscribe: ReturnType<typeof vi.fn>; toJSON: () => unknown };
const sub = (key: string): FakeSub => ({
  options: { applicationServerKey: decodeVapidPublicKey(key).buffer },
  unsubscribe: vi.fn(async () => true),
  toJSON: () => ({ endpoint: `https://push.example/${key}`, keys: { p256dh: "p", auth: "a" } }),
});

let current: FakeSub | null;
const pushManager = {
  getSubscription: vi.fn(async () => current),
  subscribe: vi.fn(async (opts: { applicationServerKey: Uint8Array }) => {
    current = { ...sub(NEW_KEY), options: { applicationServerKey: opts.applicationServerKey.buffer as ArrayBuffer } };
    return current;
  }),
};

beforeEach(() => {
  current = null;
  pushManager.getSubscription.mockClear();
  pushManager.subscribe.mockClear();
  h.apiFn.get.mockReset().mockImplementation(async (url: string) => (url === "/api/pwa/vapid-public-key" ? { publicKey: NEW_KEY } : {}));
  h.apiFn.post.mockReset().mockResolvedValue({});
  vi.stubGlobal("Notification", Object.assign(function Notification() {}, { permission: "granted", requestPermission: vi.fn(async () => "granted") }));
  vi.stubGlobal("PushManager", function PushManager() {});
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { ready: Promise.resolve({ pushManager }) } });
  vi.stubGlobal("alert", vi.fn());
  // jsdom has no matchMedia; a desktop browser tab is not in standalone display mode.
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete (navigator as unknown as Record<string, unknown>).serviceWorker;
});

const subscribedTo = () => h.apiFn.post.mock.calls.filter(([url]: [string]) => url === "/api/pwa/subscribe").map(([, body]: [string, { endpoint: string }]) => body.endpoint);

describe("BF_PORTAL_PUSH_VAPID_ROTATE_v1", () => {
  it("the shared registrar replaces a subscription minted with a rotated key", async () => {
    const stale = sub(OLD_KEY);
    current = stale;
    await registerExistingPushPermission();
    expect(stale.unsubscribe).toHaveBeenCalledTimes(1);
    expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
    expect(Array.from(pushManager.subscribe.mock.calls[0]![0].applicationServerKey)).toEqual(Array.from(decodeVapidPublicKey(NEW_KEY)));
    expect(subscribedTo()).toEqual([`https://push.example/${NEW_KEY}`]);
  });

  it("keeps a subscription that already uses the current key", async () => {
    const fresh = sub(NEW_KEY);
    current = fresh;
    await registerExistingPushPermission();
    expect(fresh.unsubscribe).not.toHaveBeenCalled();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(subscribedTo()).toEqual([`https://push.example/${NEW_KEY}`]);
  });

  it("usePushNotifications goes through the shared registrar (stale key rotated, server told)", async () => {
    const stale = sub(OLD_KEY);
    current = stale;
    renderHook(() => usePushNotifications());
    await waitFor(() => expect(subscribedTo()).toEqual([`https://push.example/${NEW_KEY}`]));
    expect(stale.unsubscribe).toHaveBeenCalledTimes(1);
    expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
  });

  it("Profile settings' Enable notifications goes through the shared registrar", async () => {
    const stale = sub(OLD_KEY);
    current = stale;
    render(<ProfileSettings />);
    await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "Enable notifications" })); });
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Notifications enabled."));
    expect(stale.unsubscribe).toHaveBeenCalledTimes(1);
    expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
    expect(subscribedTo()).toEqual([`https://push.example/${NEW_KEY}`]);
  });
});
