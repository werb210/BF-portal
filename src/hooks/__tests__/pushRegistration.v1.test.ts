import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/api", () => ({ api: { get, post } }));

import { registerExistingPushPermission } from "@/hooks/usePushRegistration";

const key = (bytes: number[]) => Uint8Array.from(bytes).buffer;
const subscription = (applicationServerKey = key([1, 2, 3])) => ({
  options: { applicationServerKey },
  unsubscribe: vi.fn().mockResolvedValue(true),
  toJSON: () => ({ endpoint: "https://push/device", keys: { p256dh: "p", auth: "a" } }),
});

describe("push auto-registration v1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "Notification", { configurable: true, value: { permission: "granted" } });
    Object.defineProperty(window, "PushManager", { configurable: true, value: class {} });
    vi.spyOn(window, "atob").mockReturnValue(String.fromCharCode(1, 2, 3));
    get.mockResolvedValue({ data: { publicKey: "key" } });
  });

  it("re-registers a current subscription with the server on every load", async () => {
    const current = subscription();
    const subscribe = vi.fn();
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: {
      ready: Promise.resolve({ pushManager: { getSubscription: vi.fn().mockResolvedValue(current), subscribe } }),
    } });
    await registerExistingPushPermission();
    expect(subscribe).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith("/api/pwa/subscribe", expect.objectContaining({ endpoint: "https://push/device" }));
  });

  it("rotates a subscription minted with a previous VAPID key", async () => {
    const stale = subscription(key([9]));
    const fresh = subscription();
    const subscribe = vi.fn().mockResolvedValue(fresh);
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: {
      ready: Promise.resolve({ pushManager: { getSubscription: vi.fn().mockResolvedValue(stale), subscribe } }),
    } });
    await registerExistingPushPermission();
    expect(stale.unsubscribe).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledOnce();
  });

  it("never prompts when permission has not already been granted", async () => {
    Object.defineProperty(window, "Notification", { configurable: true, value: {
      permission: "default", requestPermission: vi.fn(),
    } });
    await registerExistingPushPermission();
    expect(get).not.toHaveBeenCalled();
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
  });
});
