// BF_PORTAL_v789_DEAD_CODE - TestProviders uses the app's real SiloContext.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useSilo } from "@/context/SiloContext";
import { TestProviders } from "@/test/TestProviders";

function Show() {
  return <span data-testid="silo">{useSilo().silo}</span>;
}

describe("TestProviders", () => {
  it("provides the real SiloContext, BF by default", () => {
    render(<TestProviders><Show /></TestProviders>);
    expect(screen.getByTestId("silo").textContent).toBe("bf");
  });
  it("can force another silo", () => {
    render(<TestProviders silo="BI"><Show /></TestProviders>);
    expect(screen.getByTestId("silo").textContent).toBe("bi");
  });
});
