// BF_PORTAL_DESKTOP_RELEASE_TAG_v748
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("Windows desktop release", () => {
  const wf = readFileSync(".github/workflows/desktop.yml", "utf8");
  it("pushes the version tag before electron-builder publishes", () => {
    const tagStep = wf.indexOf("Make sure the release tag exists");
    const dist = wf.indexOf("npm run dist:win");
    expect(tagStep).toBeGreaterThan(-1);
    expect(tagStep).toBeLessThan(dist);
    expect(wf).toContain('git push origin "$VERSION"');
  });
  it("keeps the Windows installer as a run artifact even if publishing fails", () => {
    expect(wf).toContain("name: Boreal-Staff-Portal-Windows");
    expect(wf).toContain("path: desktop/release/*.exe");
  });
});
