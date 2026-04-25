#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { minimatch } from "minimatch";

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const labelArg = arg("label");
const scopeArg =
  arg("scope") ||
  process.env.SCOPE ||
  (labelArg && labelArg.startsWith("scope:") ? labelArg.slice(6) : null) ||
  "fullstack";

const config = JSON.parse(readFileSync(".codex/scopes.json", "utf8"));
const scope = config.scopes[scopeArg];
if (!scope) {
  console.error(
    `Unknown scope: ${scopeArg}. Allowed: ${Object.keys(config.scopes).join(", ")}`,
  );
  process.exit(2);
}

const base = arg("base") || "origin/main";
let changed;
try {
  changed = execSync(`git diff --name-only ${base}...HEAD`, { encoding: "utf8" })
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
} catch {
  changed = execSync("git diff --name-only --cached", { encoding: "utf8" })
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

const violations = [];
for (const file of changed) {
  for (const pattern of scope.deny ?? []) {
    if (minimatch(file, pattern)) {
      violations.push({ file, pattern });
    }
  }
}

if (violations.length === 0) {
  console.log(`✅ scope=${scopeArg}: ${changed.length} files clean.`);
  process.exit(0);
}

console.error(`❌ scope=${scopeArg}: ${violations.length} forbidden change(s):`);
for (const v of violations) {
  console.error(`   - ${v.file} (matches deny rule: ${v.pattern})`);
}
console.error("\nIf this change really needs to cross silo boundaries,");
console.error('change the PR label to "scope:fullstack" and request review');
console.error("from the affected silo's CODEOWNER.");
process.exit(1);
