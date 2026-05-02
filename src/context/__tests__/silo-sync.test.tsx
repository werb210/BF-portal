// BF_PORTAL_BLOCK_BI_SILO_SYNC_v1 — pin the contract: changing silo
// via useSilo() must update sessionStorage, must update useBusinessUnit(),
// and must update the value resolveApiBase() returns.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BusinessUnitProvider } from "@/context/BusinessUnitContext";
import { SiloProvider, useSilo } from "@/context/SiloContext";
import { useBusinessUnit } from "@/hooks/useBusinessUnit";

vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    authStatus: "authenticated",
    user: { id: "u1", role: "Admin", silos: ["BF", "BI", "SLF"] },
  }),
}));

beforeEach(() => {
  window.sessionStorage.clear();
  vi.stubEnv("VITE_BF_API_URL", "https://server.boreal.financial");
  vi.stubEnv("VITE_BI_API_URL", "https://bi-server.example.com");
});

function Probe() {
  const { silo, setSilo } = useSilo();
  const { activeBusinessUnit } = useBusinessUnit();
  return (
    <>
      <span data-testid="silo">{silo}</span>
      <span data-testid="bu">{activeBusinessUnit}</span>
      <button onClick={() => setSilo("bi")}>go-bi</button>
    </>
  );
}

describe("silo-sync", () => {
  it("setSilo('bi') updates BusinessUnitContext, sessionStorage, and resolveApiBase", async () => {
    render(
      <BusinessUnitProvider>
        <SiloProvider>
          <Probe />
        </SiloProvider>
      </BusinessUnitProvider>,
    );
    expect(screen.getByTestId("silo").textContent).toBe("bf");
    expect(screen.getByTestId("bu").textContent).toBe("BF");

    await act(async () => userEvent.click(screen.getByText("go-bi")));

    expect(screen.getByTestId("silo").textContent).toBe("bi");
    expect(screen.getByTestId("bu").textContent).toBe("BI");
    expect(window.sessionStorage.getItem("staff-portal.business-unit")).toBe("BI");

    const { resolveApiBase } = await import("@/config/api");
    expect(resolveApiBase("/api/v1/bi/applications")).toBe("https://bi-server.example.com");
    expect(resolveApiBase("/api/users/me")).toBe("https://bi-server.example.com");
  });
});
