// BF_PORTAL_BLOCK_v490_HEADER_SHOWS_STAGE
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const tab = readFileSync(resolve(__dirname, "../ApplicationTab.tsx"), "utf8");

describe("v490 header shows the stage", () => {
  it("uses the pipeline stage, falling back to status", () => {
    expect(tab).toContain('{fmt(application.stage ?? application.status, "—")} · Submitted');
    expect(tab).not.toContain('{fmt(application.status, "—")} · Submitted');
  });
});
