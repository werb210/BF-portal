import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import ErrorBoundary from "@/components/system/ErrorBoundary";

const Thrower = () => {
  throw new Error("boom");
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("renders children when no runtime error occurs", () => {
    render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement("div", null, "Healthy UI"),
      ),
    );

    expect(screen.getByText("Healthy UI")).toBeTruthy();
  });

  it("renders fallback UI when a runtime error is thrown", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(React.createElement(ErrorBoundary, null, React.createElement(Thrower)));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/system error/i)).toBeTruthy();
  });
});
