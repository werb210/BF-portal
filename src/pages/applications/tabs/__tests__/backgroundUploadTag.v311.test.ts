// BF_PORTAL_BACKGROUND_UPLOAD_TAG_v311
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Received in background tag", () => {
  it("shows on documents the server marks as received in the background", () => {
    const tab = fs.readFileSync(path.resolve(__dirname, "../DocumentsTab.tsx"), "utf8");
    expect(tab).toContain("receivedInBackground?: boolean");
    expect(tab).toContain('{doc.receivedInBackground ? (');
    expect(tab).toContain('data-testid="background-upload-tag"');
    expect(tab).toContain("Received in background");
  });
});
