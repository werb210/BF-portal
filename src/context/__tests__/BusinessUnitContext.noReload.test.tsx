// BF_PORTAL_BLOCK_v200_LIVE_TEST_FIXES_v1
// Regression: switching silo must NOT trigger window.location.reload.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { BusinessUnitProvider, useBusinessUnit } from "@/context/BusinessUnitContext";

const useAuthMock = vi.fn();
vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

function Probe() {
  const { activeBusinessUnit, setActiveBusinessUnit } = useBusinessUnit();
  return (
    <div>
      <span data-testid="current">{activeBusinessUnit}</span>
      <button onClick={() => setActiveBusinessUnit("BI")}>Switch to BI</button>
    </div>
  );
}

describe("BF_PORTAL_BLOCK_v200_LIVE_TEST_FIXES_v1 — silo switch", () => {
  let reloadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useAuthMock.mockReturnValue({
      authStatus: "authenticated",
      user: { role: "Admin", silos: ["BF", "BI"] },
    });
    reloadSpy = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload: reloadSpy });
    try { window.sessionStorage.clear(); } catch { /* ignore */ }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("setActiveBusinessUnit does NOT call window.location.reload", () => {
    render(
      <BusinessUnitProvider>
        <Probe />
      </BusinessUnitProvider>,
    );
    expect(screen.getByTestId("current").textContent).toBe("BF");
    act(() => {
      screen.getByRole("button", { name: "Switch to BI" }).click();
    });
    expect(screen.getByTestId("current").textContent).toBe("BI");
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("two consecutive switches both succeed (no reload-guard suppression)", () => {
    render(
      <BusinessUnitProvider>
        <Probe />
      </BusinessUnitProvider>,
    );
    act(() => screen.getByRole("button", { name: "Switch to BI" }).click());
    expect(screen.getByTestId("current").textContent).toBe("BI");
    act(() => screen.getByRole("button", { name: "Switch to BI" }).click());
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
