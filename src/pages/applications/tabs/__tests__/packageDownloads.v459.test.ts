// BF_PORTAL_BLOCK_v459_PACKAGE_DOWNLOADS
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describeDownloads } from "../sentLenderDownloads";

describe("v459 package download status", () => {
  it("says nothing for a package that was attached, not linked", () => {
    expect(describeDownloads({ lenderId: "L", viaLink: false, downloadCount: 0 })).toBeNull();
    expect(describeDownloads(null)).toBeNull();
  });

  it("says when a link has not been opened yet", () => {
    expect(describeDownloads({ lenderId: "L", viaLink: true, downloadCount: 0 })).toBe("Download link sent \u00b7 not downloaded yet");
  });

  it("counts downloads and shows the last one", () => {
    const line = describeDownloads({ lenderId: "L", viaLink: true, downloadCount: 3, lastDownloadedAt: "2026-09-24T17:00:00Z" });
    expect(line).toMatch(/^Downloaded 3\u00d7 \u00b7 last /);
  });

  it("the Lenders tab renders it under the Sent marker", () => {
    const src = readFileSync(path.join(process.cwd(), "src/pages/applications/tabs/LendersTab.tsx"), "utf8");
    const sent = src.indexOf('{"\\u2713 Sent"}');
    const dl = src.indexOf('data-testid="lender-download-status"');
    expect(sent).toBeGreaterThan(-1);
    expect(dl).toBeGreaterThan(sent);
  });
});
