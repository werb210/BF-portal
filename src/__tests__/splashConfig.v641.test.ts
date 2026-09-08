// BF_PORTAL_SPLASH_RECURSION_v1
import { describe, expect, it } from "vitest";
import config from "../../capacitor.config";

describe("splash screen cannot hang the portal", () => {
it("never runs showOnLaunch", () => {
expect(config.plugins?.SplashScreen?.launchShowDuration).toBe(0);
});

it("dismisses without needing JS", () => {
expect(config.plugins?.SplashScreen?.launchAutoHide).toBe(true);
});

it("keeps the brand colour on the launch storyboard", () => {
expect(config.plugins?.SplashScreen?.backgroundColor).toBe("#0B1F3A");
});
});
