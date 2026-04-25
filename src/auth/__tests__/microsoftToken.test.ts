import { describe, expect, it, vi } from "vitest";

import { getMicrosoftAccessToken, GRAPH_SCOPES } from "@/auth/microsoftToken";

describe("getMicrosoftAccessToken", () => {
  it("calls acquireTokenSilent with GRAPH_SCOPES", async () => {
    const acquireTokenSilent = vi.fn().mockResolvedValue({ accessToken: "fresh-token" });
    const msalClient = {
      getAllAccounts: vi.fn().mockReturnValue([{ homeAccountId: "a1" }]),
      acquireTokenSilent,
    } as any;

    const token = await getMicrosoftAccessToken(msalClient);

    expect(token).toBe("fresh-token");
    expect(acquireTokenSilent).toHaveBeenCalledWith({
      account: { homeAccountId: "a1" },
      scopes: GRAPH_SCOPES,
    });
  });

  it("returns null when there are no accounts", async () => {
    const msalClient = {
      getAllAccounts: vi.fn().mockReturnValue([]),
      acquireTokenSilent: vi.fn(),
    } as any;

    const token = await getMicrosoftAccessToken(msalClient);

    expect(token).toBeNull();
    expect(msalClient.acquireTokenSilent).not.toHaveBeenCalled();
  });

  it("returns null when acquireTokenSilent throws", async () => {
    const msalClient = {
      getAllAccounts: vi.fn().mockReturnValue([{ homeAccountId: "a1" }]),
      acquireTokenSilent: vi.fn().mockRejectedValue(new Error("boom")),
    } as any;

    await expect(getMicrosoftAccessToken(msalClient)).resolves.toBeNull();
  });
});
