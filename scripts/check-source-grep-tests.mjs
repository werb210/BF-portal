#!/usr/bin/env node
// BF_PORTAL_v789_SOURCE_GREP - counts test files that read source files with readFileSync / fs.readFile
// and assert on their text. Such tests pass while the feature is broken and fail on harmless
// refactors, so their number may only go down: the run fails when the count rises above
// scripts/source-grep-baseline.json. Rewrite one as a behaviour test, then lower the baseline.
//
//   node scripts/check-source-grep-tests.mjs           check against the baseline
//   node scripts/check-source-grep-tests.mjs --list    also print the offending files
//   node scripts/check-source-grep-tests.mjs --write   set the baseline to the current count
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const BASELINE = join(ROOT, "scripts/source-grep-baseline.json");
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "ios", "android", "desktop"]);

const READS_FILE = /\breadFileSync\b|\bfs\.readFile\b|\breadFile\s*\(/;
// A string literal naming a source file: "src/...", or a path ending in a source extension.
const NAMES_SOURCE = /["'`](?:[^"'`\n]*\bsrc\/[^"'`\n]*|[^"'`\n]*\.(?:tsx?|jsx?|mjs|cjs|css))["'`]/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name), out);
    } else if (/\.(test|spec)\.(tsx?|jsx?|mjs)$/.test(entry.name)) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

export function isSourceGrepTest(text) {
  return READS_FILE.test(text) && NAMES_SOURCE.test(text);
}

const files = walk(join(ROOT, "src"))
  .filter((f) => isSourceGrepTest(readFileSync(f, "utf8")))
  .map((f) => relative(ROOT, f))
  .sort();

const args = new Set(process.argv.slice(2));
if (args.has("--write")) {
  writeFileSync(BASELINE, JSON.stringify({ max: files.length }, null, 2) + "\n");
  console.log(`source-grep baseline set to ${files.length}`);
  process.exit(0);
}
if (args.has("--list")) for (const f of files) console.log(f);

let max;
try {
  max = JSON.parse(readFileSync(BASELINE, "utf8")).max;
} catch {
  console.error(`Missing or unreadable ${relative(ROOT, BASELINE)}`);
  process.exit(2);
}
if (files.length > max) {
  console.error(`FAIL: ${files.length} test files read source text (baseline ${max}). Write behaviour tests instead.`);
  process.exit(1);
}
console.log(`OK: ${files.length} source-grep test files (baseline ${max}).`);
