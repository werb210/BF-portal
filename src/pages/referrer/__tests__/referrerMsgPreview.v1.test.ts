import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const portal = readFileSync(join(process.cwd(), "src/pages/referrer/ReferrerPortal.tsx"), "utf8");

describe("BF_PORTAL_REFERRER_MSG_PREVIEW_TRUTH_v1", () => {
  it("previews the copy the server actually sends", () => {
    expect(portal).toContain("BF_PORTAL_REFERRER_MSG_PREVIEW_TRUTH_v1");
    expect(portal).toContain("referred you to Boreal Financial");
    expect(portal).toContain("You have been referred to Boreal Financial for business funding");
  });

  it("drops the old copy that was never sent", () => {
    expect(portal).not.toContain("Hi, it's your referrer");
  });

  it("interpolates the referrer's own name into version A", () => {
    expect(portal).toContain("previewA");
    expect(portal).toContain("/api/referrer/me");
  });
});
