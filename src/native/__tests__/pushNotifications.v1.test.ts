import { describe, expect, it } from "vitest";
import pushSource from "../pushNotifications.ts?raw";
import appDelegateSource from "../../../ios/App/App/AppDelegate.swift?raw";

describe("push notifications v1", () => {
  it("wires Capacitor push registration and AppDelegate callbacks", () => {
    expect(pushSource).toContain("@capacitor/push-notifications");
    expect(appDelegateSource).toContain("capacitorDidRegisterForRemoteNotifications");
  });
});
