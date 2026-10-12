import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
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

function runWithLabel(repo, label) {
  return spawnSync("node", [scriptPath, ...(label === null ? [] : [`--label=${label}`])], {
    cwd: repo,
    encoding: "utf8",
  });
}

// BF_PORTAL_v789_SCOPES
test("an unlabelled PR is unscoped and passes, whatever it touches", () => {
  const repo = initRepoWithChangedFile(["src/silos/bi/a.ts", "src/silos/slf/b.ts", "src/pages/c.tsx"]);
  assert.equal(runWithLabel(repo, null).status, 0);
  assert.equal(runWithLabel(repo, "").status, 0);
});

test("labels are case-insensitive (scope:bi is the BI scope)", () => {
  const repo = initRepoWithChangedFile(["src/silos/slf/x.ts"]);
  const res = runWithLabel(repo, "scope:bi");
  assert.equal(res.status, 1);
  assert.match(res.stderr, /scope=BI/);
});

test("scope=BI allows BI silo files and BI pages", () => {
  const repo = initRepoWithChangedFile(["src/silos/bi/foo.ts", "src/pages/bi/Page.tsx", "src/api/biCrmActivity.ts"]);
  assert.equal(runScopeCheck(repo, "BI").status, 0);
});

test("scope:bi and scope:slf may not change BF-only pages or components", () => {
  for (const scope of ["BI", "SLF"]) {
    for (const file of ["src/pages/crm/contacts/ContactDetailPage.tsx", "src/components/Foo.tsx"]) {
      const res = runScopeCheck(initRepoWithChangedFile([file]), scope);
      assert.equal(res.status, 1, `${scope} ${file}`);
    }
  }
});

test("shared CRM components on the allowlist may be changed by BI and SLF", () => {
  for (const scope of ["BI", "SLF"]) {
    const repo = initRepoWithChangedFile(["src/components/crm/ActionBar.tsx", "src/components/crm/popups/NotePopup.tsx"]);
    assert.equal(runScopeCheck(repo, scope).status, 0, scope);
  }
});

test("scope=BF may not change BI or SLF silo code", () => {
  for (const file of ["src/silos/bi/x.ts", "src/silos/slf/y.ts", "src/pages/bi/z.tsx"]) {
    const res = runScopeCheck(initRepoWithChangedFile([file]), "BF");
    assert.equal(res.status, 1, file);
  }
  assert.equal(runScopeCheck(initRepoWithChangedFile(["src/pages/crm/x.tsx"]), "BF").status, 0);
});

test("every deny path points at a folder that exists", () => {
  const config = JSON.parse(readFileSync(scopeConfig, "utf8"));
  for (const [name, scope] of Object.entries(config.scopes)) {
    for (const pattern of scope.deny ?? []) {
      const folder = pattern.replace(/\/\*\*$/, "");
      assert.ok(existsSync(join(root, folder)), `${name}: ${pattern}`);
    }
  }
});

test("scope=fullstack allows cross-silo changes", () => {
  const repo = initRepoWithChangedFile(["src/silos/slf/x.ts", "src/silos/bi/y.ts", "src/pages/z.tsx"]);
  assert.equal(runScopeCheck(repo, "fullstack").status, 0);
});

test("unknown scope exits 2", () => {
  const repo = initRepoWithChangedFile(["src/silos/bi/foo.ts"]);
  const res = runScopeCheck(repo, "BogusScope");
  assert.equal(res.status, 2);
});
