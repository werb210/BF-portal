import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// BF_PORTAL_LOCAL_MSAL_ENV_v1 - a native build is produced on a developer
// machine, where the deploy workflow never runs. Without these defaults the
// app falls back to the /common authority and O365 connect fails.
const env = readFileSync(join(process.cwd(), ".env"), "utf-8");

describe("BF_PORTAL_LOCAL_MSAL_ENV_v1", () => {
  it("carries the MSAL settings a local build needs", () => {
    expect(env).toContain("VITE_MSAL_CLIENT_ID=c8890d6f-eb8f-4101-8336-5e8fca3303e0");
    expect(env).toContain("VITE_MSAL_TENANT_ID=b585ab8e-bd39-449d-9210-479a9c989bb2");
    expect(env).toContain("VITE_MSAL_REDIRECT_URI=https://staff.boreal.financial");
    expect(env).toContain("VITE_MSAL_SCOPES=User.Read,Mail.Send,Calendars.ReadWrite,Tasks.ReadWrite");
  });

  it("points a local build at the live API", () => {
    expect(env).toContain("VITE_API_BASE_URL=https://server.boreal.financial");
    expect(env).toContain("VITE_API_URL=https://server.boreal.financial");
  });

  it("leaves the deploy workflow as the source of truth for CI", () => {
    const wf = readFileSync(join(process.cwd(), ".github", "workflows", "deploy.yml"), "utf-8");
    expect(wf).toContain("VITE_MSAL_TENANT_ID=${{ secrets.VITE_MSAL_TENANT_ID }}");
  });
});
