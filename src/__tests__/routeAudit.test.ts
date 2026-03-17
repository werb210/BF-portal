// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearUiFailure, getUiFailure } from "@/utils/uiFailureStore";
import { runRouteAudit } from "@/utils/routeAudit";

const fetchMock = vi.fn();

describe("route audit", () => {
  beforeEach(() => {
    clearUiFailure();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not throw or set ui failure when audit fetch fails", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      if (String(input).includes("/auth/me")) {
        return Promise.resolve(new Response(null, { status: 401 }));
      }
      return Promise.reject(new Error("network down"));
    });

    await expect(runRouteAudit()).resolves.toBeUndefined();

    expect(getUiFailure()).toBeNull();
  });
});
