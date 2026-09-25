// BF_PORTAL_BLOCK_v512_BI_SEQUENCE_SEND_FROM
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(__dirname, "../BIMarketing.tsx"), "utf8");

describe("v512 BI sequence Send from", () => {
  it("defaults to andrew@boreal.financial and saves it as the sender", () => {
    expect(src).toContain('const BI_DEFAULT_SENDER = "andrew.p@boreal.financial";');
    expect(src).toContain("sender_rotation: [sendFrom || BI_DEFAULT_SENDER]");
    expect(src).toContain('data-testid="bi-sequence-send-from"');
  });
});
