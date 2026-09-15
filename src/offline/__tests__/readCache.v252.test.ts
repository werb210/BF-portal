// BF_PORTAL_OFFLINE_READ_CACHE_v252
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { cacheKeyFor, clearOfflineCopies, MAX_ENTRIES, readOfflineCopy, saveOfflineCopy, stripSensitive, TTL_MS } from "../readCache";

const ID = "11111111-2222-4333-8444-555555555555";
function mem() {
  const d = new Map<string, string>();
  return { getItem: (k: string) => d.get(k) ?? null, setItem: (k: string, v: string) => void d.set(k, v), removeItem: (k: string) => void d.delete(k) };
}
const root = path.resolve(__dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

describe("what gets a saved copy", () => {
  it("only contacts, companies, their timelines and application details, only in the native app", () => {
    expect(cacheKeyFor(`/api/crm/contacts/${ID}`, "BF", true)).toBe(`BF:/api/crm/contacts/${ID}`);
    expect(cacheKeyFor(`/api/crm/contacts/${ID}/timeline`, "BF", true)).not.toBeNull();
    expect(cacheKeyFor(`/api/applications/${ID}/details`, "BI", true)).toBe(`BI:/api/applications/${ID}/details`);
    expect(cacheKeyFor(`/api/crm/contacts/${ID}`, "BF", false)).toBeNull();
    expect(cacheKeyFor("/api/crm/contacts", "BF", true)).toBeNull();
    expect(cacheKeyFor(`/api/applications/${ID}/banking`, "BF", true)).toBeNull();
  });
});

describe("what is never stored", () => {
  it("strips identity and banking numbers at any depth, and keeps look-alike field names", () => {
    const out = stripSensitive({ name: "Wayne", sin: "645", business: "Endless Sky", dob: "1976-09-30",
      rawPayload: { applicant: { sinSsn: "x", ssn: "y", dateOfBirth: "z", email: "w@e.ca" }, bank: [{ accountNumber: "1", institution: "RBC" }] } }) as any;
    expect(out).toEqual({ name: "Wayne", business: "Endless Sky",
      rawPayload: { applicant: { email: "w@e.ca" }, bank: [{ institution: "RBC" }] } });
  });
});

describe("storage rules", () => {
  it("serves a copy within 24 hours and not after", () => {
    const s = mem();
    saveOfflineCopy("k", { a: 1 }, s, 1_000);
    expect(readOfflineCopy("k", s, 1_000 + TTL_MS - 1)).toEqual({ a: 1 });
    expect(readOfflineCopy("k", s, 1_000 + TTL_MS)).toBeUndefined();
  });
  it("keeps only the most recent records and wipes on sign-out", () => {
    const s = mem();
    for (let i = 0; i < MAX_ENTRIES + 5; i++) saveOfflineCopy(`k${i}`, i, s, 10_000 + i);
    expect(readOfflineCopy("k0", s, 20_000)).toBeUndefined();
    expect(readOfflineCopy(`k${MAX_ENTRIES + 4}`, s, 20_000)).toBe(MAX_ENTRIES + 4);
    clearOfflineCopies(s);
    expect(readOfflineCopy(`k${MAX_ENTRIES + 4}`, s, 20_000)).toBeUndefined();
  });
});

describe("wiring", () => {
  it("apiFetch saves and serves copies, sign-out clears them, the notice is mounted", () => {
    const api = read("src/api/index.ts");
    expect(api).toContain("readOfflineCopy(offlineKey)");
    expect(api).toContain("saveOfflineCopy(offlineKey, parsed)");
    expect(read("src/lib/authStorage.ts")).toContain("clearOfflineCopies();");
    expect(read("src/App.tsx")).toContain("<SavedCopyNotice />");
  });
});
