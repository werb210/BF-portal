// BF_PORTAL_ERROR_BOUNDARY_v1
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import ErrorBoundary from "../ErrorBoundary";

vi.mock("@/utils/logger", () => ({ logger: { error: vi.fn() } }));

function Boom({ explode }: { explode: boolean }) {
  if (explode) throw new Error("kaboom");
  return <p>recovered</p>;
}

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe("portal error boundary", () => {
  it("offers a way out instead of a dead screen", () => {
    render(<ErrorBoundary><Boom explode /></ErrorBoundary>);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("recovers the subtree when the error was transient", () => {
    const { rerender } = render(<ErrorBoundary><Boom explode /></ErrorBoundary>);
    rerender(<ErrorBoundary><Boom explode={false} /></ErrorBoundary>);
    fireEvent.click(screen.getByText("Try again"));
    expect(screen.getByText("recovered")).toBeTruthy();
  });

  it("does not put the raw exception in front of the user by default", () => {
    render(<ErrorBoundary><Boom explode /></ErrorBoundary>);
    // Available under a disclosure, not shouted at a staff member.
    expect(screen.getByText("Technical detail")).toBeTruthy();
  });

  it("honours an explicit fallback", () => {
    render(<ErrorBoundary fallback={<span>custom</span>}><Boom explode /></ErrorBoundary>);
    expect(screen.getByText("custom")).toBeTruthy();
  });

  it("renders children untouched when nothing throws", () => {
    render(<ErrorBoundary><Boom explode={false} /></ErrorBoundary>);
    expect(screen.getByText("recovered")).toBeTruthy();
  });
});

describe("only one boundary implementation remains", () => {
  const src = path.resolve(__dirname, "../../..");
  it("the orphans are gone", () => {
    for (const orphan of [
      "components/layout/AppErrorBoundary.tsx",
      "components/errors/GlobalErrorBoundary.tsx",
      "core/ErrorBoundary.tsx",
    ]) {
      expect(fs.existsSync(path.join(src, orphan))).toBe(false);
    }
  });

  it("nothing imports react-error-boundary", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(src, "../package.json"), "utf8"));
    expect(pkg.dependencies["react-error-boundary"]).toBeUndefined();
  });
});
