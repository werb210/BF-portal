// BF_PORTAL_BF_LINKS_TAB_v15
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const bf = fs.readFileSync(path.resolve(__dirname, "../MarketingDashboard.tsx"), "utf8");
const bi = fs.readFileSync(path.resolve(__dirname, "../../../silos/bi/marketing/BIMarketing.tsx"), "utf8");

describe("link report parity across silos", () => {
  it("BF has a Links tab", () => {
    expect(bf).toContain('{ id: "links", label: "Links" }');
    expect(bf).toContain('{tab === "links" && <LinkClicksPanel />}');
  });

  it("BI still has its Links tab", () => {
    expect(bi).toContain('"links"');
    expect(bi).toContain("LinkClicksPanel");
  });

  it("the panel is no longer duplicated inside the BF Analytics tab", () => {
    expect(bf.match(/<LinkClicksPanel \/>/g)).toHaveLength(1);
  });
});
