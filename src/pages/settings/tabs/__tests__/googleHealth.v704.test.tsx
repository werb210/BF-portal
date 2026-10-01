// BF_PORTAL_GOOGLE_HEALTH_v704
import { render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/api", () => ({
  default: {
    get: vi.fn(async () => ({
      checkedAt: "2026-10-01T18:00:00.000Z",
      checks: [
        { key: "google_login", label: "Google login (Google Ads + Data Manager)", status: "ok", detail: "signed in" },
        { key: "conversion_test", label: "Conversion upload test", status: "fail", detail: "Google rejected the test conversion (403): PERMISSION_DENIED" },
        { key: "ga4", label: "Google Analytics (GA4)", status: "off", detail: "GA4 is not set up" },
      ],
    })),
  },
}));
vi.mock("@/lib/authToken", () => ({ getAuthToken: () => "tok" }));

import GoogleHealthPanel from "../GoogleHealthPanel";

describe("Google checks on Runtime Verification", () => {
  it("shows each Google check with OK / FAILED / Off and Google's own message", async () => {
    render(<GoogleHealthPanel />);
    await waitFor(() => expect(screen.getByText("Conversion upload test")).toBeTruthy());
    expect(screen.getByText("FAILED")).toBeTruthy();
    expect(screen.getByText("OK")).toBeTruthy();
    expect(screen.getByText("Off")).toBeTruthy();
    expect(screen.getByText(/PERMISSION_DENIED/)).toBeTruthy();
  });
  it("is rendered on the Runtime Verification tab", () => {
    expect(readFileSync("src/pages/settings/tabs/RuntimeSettings.tsx", "utf8")).toContain("<GoogleHealthPanel />");
  });
});
