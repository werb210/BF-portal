import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import apiClient from "@/api/httpClient";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppLoading from "@/components/layout/AppLoading";
import { getRequestId } from "@/utils/requestId";

const ThrowingChild = () => {
  throw new Error("boom");
};

describe("portal traceability", () => {
  it("attaches X-Request-Id to API requests", async () => {
    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config
    }));

    await apiClient.get("/trace", { adapter, skipAuth: true } as any);

    const passedConfig = adapter.mock.calls[0][0];
    expect(passedConfig.headers?.["X-Request-Id"]).toBe(getRequestId());
  });

  it("renders an error screen and logs requestId on render failures", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/Unexpected error/i);
    expect(errorSpy).toHaveBeenCalledWith(
      "UI render failure",
      expect.objectContaining({ requestId: getRequestId() })
    );

    errorSpy.mockRestore();
  });

  it("shows an error message when API failures stop loading", async () => {
    const adapter = vi.fn(async (config) => ({
      data: { message: "Server error" },
      status: 500,
      statusText: "Server error",
      headers: {},
      config
    }));

    const TestComponent = () => {
      const [status, setStatus] = useState<"loading" | "error">("loading");

      useEffect(() => {
        apiClient.get("/fail", { adapter } as any).catch(() => setStatus("error"));
      }, []);

      if (status === "loading") {
        return <AppLoading />;
      }

      return <div>Unable to load data.</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText("Unable to load data.")).toBeInTheDocument();
    });

    expect(screen.queryByText("Loading experience...")).not.toBeInTheDocument();
  });
});
