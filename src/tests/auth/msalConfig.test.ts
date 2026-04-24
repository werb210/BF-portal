import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "b585ab8e-bd39-449d-9210-479a9c989bb2";
const FALLBACK_WARNING =
  "[msal] VITE_MSAL_TENANT_ID not set — falling back to /common (will fail against single-tenant app registrations)";

const setTenantEnv = (value?: string) => {
  const env = import.meta.env as Record<string, string | undefined>;
  if (value === undefined) {
    delete env.VITE_MSAL_TENANT_ID;
    return;
  }
  env.VITE_MSAL_TENANT_ID = value;
};

describe("microsoftAuthConfig authority", () => {
  const originalTenantId = import.meta.env.VITE_MSAL_TENANT_ID;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    setTenantEnv(originalTenantId);
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("uses tenant-specific authority when VITE_MSAL_TENANT_ID is set", async () => {
    setTenantEnv(TENANT_ID);

    const { microsoftAuthConfig } = await import("@/config/microsoftAuth");

    expect(microsoftAuthConfig.authority).toBe(`https://login.microsoftonline.com/${TENANT_ID}`);
  });

  it("falls back to /common and warns when VITE_MSAL_TENANT_ID is missing", async () => {
    setTenantEnv(undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { microsoftAuthConfig } = await import("@/config/microsoftAuth");

    expect(microsoftAuthConfig.authority).toBe("https://login.microsoftonline.com/common");
    expect(warnSpy).toHaveBeenCalledWith(FALLBACK_WARNING);
  });

  it("never produces invalid authority values", async () => {
    setTenantEnv(TENANT_ID);
    const { microsoftAuthConfig: withTenant } = await import("@/config/microsoftAuth");

    expect(withTenant.authority).not.toBe("https://login.microsoftonline.com/");
    expect(withTenant.authority).not.toContain("undefined");

    vi.resetModules();
    setTenantEnv(undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { microsoftAuthConfig: fallback } = await import("@/config/microsoftAuth");

    expect(fallback.authority).not.toBe("https://login.microsoftonline.com/");
    expect(fallback.authority).not.toContain("undefined");
  });
});
