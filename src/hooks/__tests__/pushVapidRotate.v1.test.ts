import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("BF_PORTAL_PUSH_VAPID_ROTATE_v1", () => {
  it("routes both notification entry points through the shared registrar", () => {
    const profile = source("../../pages/settings/tabs/ProfileSettings.tsx");
    const hook = source("../usePushNotifications.ts");

    expect(profile).toContain("await registerExistingPushPermission()");
    expect(hook).toContain("await registerExistingPushPermission()");
    expect(profile).not.toContain("pushManager.subscribe(");
    expect(hook).not.toContain("pushManager.subscribe(");
  });

  it("keeps stale-key rotation in the shared registrar", () => {
    const registrar = source("../usePushRegistration.ts");

    expect(registrar).toContain("subscription.options.applicationServerKey");
    expect(registrar).toContain("await subscription.unsubscribe()");
  });
});
