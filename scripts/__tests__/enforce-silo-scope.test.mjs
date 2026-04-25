import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { execSync, spawnSync } from "node:child_process";

const root = resolve(process.cwd());
const scriptPath = join(root, "scripts/enforce-silo-scope.mjs");
const scopeConfig = join(root, ".codex/scopes.json");

function initRepoWithChangedFile(changedFiles) {
  const repo = mkdtempSync(join(tmpdir(), "scope-test-"));
  execSync("git init -b main", { cwd: repo, stdio: "ignore" });
  execSync('git config user.email "test@example.com"', { cwd: repo });
  execSync('git config user.name "Scope Test"', { cwd: repo });

  mkdirSync(join(repo, ".codex"), { recursive: true });
  cpSync(scopeConfig, join(repo, ".codex/scopes.json"));

  for (const file of changedFiles) {
    const full = join(repo, file);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, "changed\n");
  }

  execSync("git add .", { cwd: repo });
  return repo;
}

function runScopeCheck(repo, scope) {
  return spawnSync("node", [scriptPath, `--scope=${scope}`], {
    cwd: repo,
    encoding: "utf8",
  });
}

test("scope=BI allows BI files", () => {
  const repo = initRepoWithChangedFile(["src/silos/bi/foo.ts"]);
  const res = runScopeCheck(repo, "BI");
  assert.equal(res.status, 0);
});

test("scope=BI blocks BF files and prints deny rule", () => {
  const repo = initRepoWithChangedFile(["src/silos/bf/bar.ts"]);
  const res = runScopeCheck(repo, "BI");
  assert.equal(res.status, 1);
  assert.match(res.stderr, /src\/silos\/bf\/\*\*/);
});

test("scope=BI allows shared file paths", () => {
  const repo = initRepoWithChangedFile(["src/components/Foo.tsx"]);
  const res = runScopeCheck(repo, "BI");
  assert.equal(res.status, 0);
});

test("scope=fullstack allows cross-silo changes", () => {
  const repo = initRepoWithChangedFile(["src/silos/bf/x.ts", "src/silos/bi/y.ts"]);
  const res = runScopeCheck(repo, "fullstack");
  assert.equal(res.status, 0);
});

test("unknown scope exits 2", () => {
  const repo = initRepoWithChangedFile(["src/silos/bi/foo.ts"]);
  const res = runScopeCheck(repo, "BogusScope");
  assert.equal(res.status, 2);
});
