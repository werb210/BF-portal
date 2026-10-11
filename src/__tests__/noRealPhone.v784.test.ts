// BF_PORTAL_NO_REAL_PHONE_v784 - a real phone number was committed to a test.
// Only its sha256 is kept here; this fails if any tracked file contains a
// 10-digit run that hashes to it again.
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BANNED_SHA256 = "d1b175b297c9bbf43b5572be8519a07f38c97f5512af01264798a19281c3b305";
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "coverage"]);

function trackedFiles(): string[] {
  try {
    return execSync("git ls-files -z", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
      .split("\0")
      .filter(Boolean);
  } catch {
    // No git (e.g. a source tarball): walk the tree instead.
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (SKIP_DIRS.has(name)) continue;
        const full = dir === "." ? name : join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) walk(full);
        else if (st.isFile()) out.push(full);
      }
    };
    walk(".");
    return out;
  }
}

describe("no real phone number in the repo", () => {
  it("no tracked file has a 10-digit run with the banned sha256", () => {
    const hits: string[] = [];
    for (const file of trackedFiles()) {
      let text: string;
      try {
        if (!statSync(file).isFile()) continue;
        text = readFileSync(file, "latin1");
      } catch {
        continue;
      }
      for (const match of text.matchAll(/\d{10,}/g)) {
        const run = match[0];
        for (let i = 0; i + 10 <= run.length; i += 1) {
          if (createHash("sha256").update(run.slice(i, i + 10)).digest("hex") === BANNED_SHA256) {
            hits.push(file);
          }
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
