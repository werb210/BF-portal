// BF_PORTAL_GOOGLE_HEALTH_GUARD_v706
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/api", () => ({ default: { get: vi.fn(async () => ({})) } }));
vi.mock("@/lib/authToken", () => ({ getAuthToken: () => "tok" }));

import GoogleHealthPanel from "../GoogleHealthPanel";

describe("Google checks panel with an unexpected server reply", () => {
  it("shows a message instead of crashing the Runtime page", async () => {
    render(<GoogleHealthPanel />);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("unexpected answer"));
  });
});
