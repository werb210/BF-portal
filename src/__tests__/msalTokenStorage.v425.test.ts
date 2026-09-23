// BF_PORTAL_MSAL_TOKEN_SECURE_v425
import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { setGraphAccessToken, getGraphAccessToken, clearGraphAccessToken } from "../lib/graphToken";
const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");

describe("v425 the Graph token is not left in plain storage", () => {
  beforeEach(() => localStorage.clear());

  it("msal.ts no longer writes it to localStorage", () => {
    const src = read("src/auth/msal.ts");
    expect(src).not.toContain('localStorage.setItem("msgraph_access_token"');
    expect(src).toContain("setGraphAccessToken");
  });

  it("clears any copy an older build left behind", async () => {
    localStorage.setItem("msgraph_access_token", "stale-from-v424");
    await setGraphAccessToken("fresh");
    expect(localStorage.getItem("msgraph_access_token")).toBeNull();
  });

  it("round-trips in memory on web", async () => {
    await setGraphAccessToken("abc");
    expect(await getGraphAccessToken()).toBe("abc");
  });

  it("clears completely", async () => {
    await setGraphAccessToken("abc");
    await clearGraphAccessToken();
    expect(await getGraphAccessToken()).toBeNull();
    expect(localStorage.getItem("msgraph_access_token")).toBeNull();
  });

  it("ignores an empty token", async () => {
    await setGraphAccessToken("  ");
    expect(await getGraphAccessToken()).toBeNull();
  });
});
