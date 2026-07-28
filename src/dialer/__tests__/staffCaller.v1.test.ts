import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

describe("staff caller recording controls", () => {
  it("threads the staff marker from caller resolution into dialer state", () => {
    expect(read("src/dialer/api.ts")).toContain("isStaff?: boolean");
    expect(read("src/dialer/types.ts")).toContain("isStaff?: boolean");
    expect(read("src/dialer/DialerProvider.tsx")).toContain("isStaff: !!body.isStaff");
  });

  it("hides recording consent for internal calls without removing it for clients", () => {
    const panel = read("src/dialer/components/DialerPanel.tsx");
    expect(panel).toContain("{!isInternalCall && <RecordingPill");
    expect(panel).toContain("const isInternalCall");
  });
});
