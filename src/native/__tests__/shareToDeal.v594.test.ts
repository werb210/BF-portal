// BF_PORTAL_BLOCK_v594_SHARE_TO_DEAL
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dealCards, isSharedFileUrl, matchDeals, mimeFor, sharedFileName } from "../shareToDeal";

describe("share to deal", () => {
  it("recognises shared files and restores their names", () => {
    expect(isSharedFileUrl("file:///tmp/Shared/x.pdf")).toBe(true);
    expect(isSharedFileUrl("bfportal://pipeline")).toBe(false);
    expect(sharedFileName("file:///tmp/Shared/0b1c2d3e-1111-4222-8333-444455556666-Bank%20Statement.pdf")).toBe("Bank Statement.pdf");
    expect(mimeFor("a.PDF")).toBe("application/pdf");
  });
  it("lists deals by business name and filters them", () => {
    const cards = dealCards({ items: [{ id: "1", business_legal_name: "Acme Ltd", pipeline_state: "In Review" }, { id: "2", name: "Voss Events" }, { id: "3" }] });
    expect(cards).toEqual([{ id: "1", title: "Acme Ltd", stage: "In Review" }, { id: "2", title: "Voss Events", stage: null }]);
    expect(matchDeals(cards, "voss").map((c) => c.id)).toEqual(["2"]);
  });
  it("is wired: share sheet types, native copy, mounted provider, same upload route", () => {
    expect(readFileSync("ios/App/App/Info.plist", "utf8")).toContain("<string>Deal documents</string>");
    expect(readFileSync("ios/App/App/AppDelegate.swift", "utf8").match(/SharedFileImport\.localCopy\(url\)/g)?.length).toBe(3);
    expect(readFileSync("src/App.tsx", "utf8")).toContain("<ShareToDealProvider />");
    expect(readFileSync("src/native/ShareToDealProvider.tsx", "utf8")).toContain('api("/api/documents/upload", { method: "POST", body: fd })');
  });
});
