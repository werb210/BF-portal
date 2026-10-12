#!/usr/bin/env node
// BF_PORTAL_v789_SCOPES - checks a PR's changed files against its scope (.codex/scopes.json).
//   --label=scope:bi   the PR's scope label (case-insensitive); an empty or missing label = unscoped
//   --scope=BI         the scope by name (wins over --label)
//   --base=origin/main the branch the PR merges into
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { minimatch } from "minimatch";

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const config = JSON.parse(readFileSync(".codex/scopes.json", "utf8"));
const labelArg = (arg("label") ?? "").trim();
const requested =
  (arg("scope") ?? "").trim() ||
  (process.env.SCOPE ?? "").trim() ||
  (/^scope:/i.test(labelArg) ? labelArg.slice(6).trim() : "") ||
  config.default ||
  "unscoped";

const scopeName = Object.keys(config.scopes).find((k) => k.toLowerCase() === requested.toLowerCase());
if (!scopeName) {
  console.error(`Unknown scope: ${requested}. Allowed: ${Object.keys(config.scopes).join(", ")}`);
  process.exit(2);
}
const scope = config.scopes[scopeName];

const expand = (patterns) =>
  (patterns ?? []).flatMap((p) => (p === "$sharedCrmComponents" ? config.sharedCrmComponents ?? [] : [p]));
const deny = expand(scope.deny);
const allow = expand(scope.allow);

const base = arg("base") || "origin/main";
const list = (cmd) => execSync(cmd, { encoding: "utf8" }).split("\n").map((s) => s.trim()).filter(Boolean);
let changed;
try {
  changed = list(`git diff --name-only ${base}...HEAD`);
} catch {
  changed = list("git diff --name-only --cached");
}

const violations = [];
for (const file of changed) {
  const rule = deny.find((pattern) => minimatch(file, pattern, { dot: true }));
  if (!rule) continue;
  if (allow.some((pattern) => minimatch(file, pattern, { dot: true }))) continue;
  violations.push({ file, pattern: rule });
}

if (violations.length === 0) {
  console.log(`OK scope=${scopeName}: ${changed.length} files clean.`);
  process.exit(0);
}

console.error(`FAIL scope=${scopeName}: ${violations.length} forbidden change(s):`);
for (const v of violations) {
  console.error(`   - ${v.file} (matches deny rule: ${v.pattern})`);
}
console.error("\nIf this change really needs to cross silo boundaries,");
console.error('change the PR label to "scope:fullstack" (or remove the scope label) and request review');
console.error("from the affected silo's CODEOWNER.");
process.exit(1);
